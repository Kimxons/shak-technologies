using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Address")]
    public class ClientAddressController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientAddressController> _logger;

        public ClientAddressController(IAuthService authService, IApiService apiService, ICommonUtilitiesService commonUtilities, IApiCachedService apiCachedService, ILogger<ClientAddressController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _commonUtilities = commonUtilities;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated()) return RedirectToAction("Index", "Login");

            await PrepareAddressViewDataAsync(moduleId, clientId, requestId);

            // Workflow tab loading must continue to use the partial view.
            return PartialView("~/Views/Identities/ClientMaintenance/_ClientAddress.cshtml");
        }

        [HttpGet]
        [Route("ClientAddress")]
        public async Task<IActionResult> ClientAddress(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated()) return RedirectToAction("Index", "Login");

            await PrepareAddressViewDataAsync(moduleId, clientId, requestId);

            return View("~/Views/Identities/ClientMaintenance/ClientAddress.cshtml");
        }

        private async Task PrepareAddressViewDataAsync(string? moduleId, string? clientId, string? requestId)
        {
            ViewBag.ModuleID = moduleId ?? string.Empty;
            ViewBag.ClientID = clientId ?? string.Empty;

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(["AddressTypeID", "CountryID", "CityID", "RegionID", "SubCityID", "LanguageID"]);
                dropdownOptions.TryGetValue("AddressTypeID", out var addressTypeOptions);
                dropdownOptions.TryGetValue("CountryID", out var countryOptions);
                dropdownOptions.TryGetValue("CityID", out var cityOptions);
                dropdownOptions.TryGetValue("RegionID", out var regionOptions);
                dropdownOptions.TryGetValue("SubCityID", out var subCityOptions);
                dropdownOptions.TryGetValue("LanguageID", out var languageOptions);
                ViewData["AddressTypeOptions"] = addressTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["AddressCountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["AddressCityOptions"] = cityOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["AddressRegionOptions"] = regionOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["AddressSubCityOptions"] = subCityOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["AddressLanguageOptions"] = languageOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Address tab dropdown options");
            }
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.address.get request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_ADDRESS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.address.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {

                if (string.IsNullOrEmpty(requestData["RequestID"]?.ToString()))
                {
                    requestData["RequestID"] = HttpContext!.Connection.Id;
                }
                if (string.IsNullOrEmpty(requestData["CreatedBy"]?.ToString()))
                {
                    requestData["CreatedBy"] = _commonUtilities.ResolveSessionValue("user_name", "user_id");
                }
                if (string.IsNullOrEmpty(requestData["CreatedOn"]?.ToString()))
                {
                    requestData["CreatedOn"] = DateTime.UtcNow.ToString("dd MMM yyyy HH:mm:ss.fff");
                }
                if (string.IsNullOrEmpty(requestData["OurBranchID"]?.ToString()))
                {
                    requestData["OurBranchID"] = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                }

                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                Dictionary<string, object> requestDataEnriched = JsonSerializer.Deserialize<Dictionary<string, object>>(requestData)!;
                requestDataEnriched = _commonUtilities.EnrichDefaults(requestDataEnriched, new KeyValuePair<string, object>("BankID", _commonUtilities.ResolveSessionValue("bank_id", "bank_code") ?? "00"));

                _logger.LogInformation("client-maintenance.address.create request: {Request}", JsonSerializer.Serialize(requestDataEnriched));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_ADDRESS, requestDataEnriched);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.address.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {

                if (string.IsNullOrEmpty(requestData["RequestID"]?.ToString()))
                {
                    requestData["RequestID"] = HttpContext!.Connection.Id;
                }
                if (string.IsNullOrEmpty(requestData["CreatedBy"]?.ToString()))
                {
                    requestData["CreatedBy"] = _commonUtilities.ResolveSessionValue("user_name", "user_id");
                }
                if (string.IsNullOrEmpty(requestData["CreatedOn"]?.ToString()))
                {
                    requestData["CreatedOn"] = DateTime.UtcNow.ToString("dd MMM yyyy HH:mm:ss.fff");
                }
                if (string.IsNullOrEmpty(requestData["OurBranchID"]?.ToString()))
                {
                    requestData["OurBranchID"] = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                }
                if (string.IsNullOrEmpty(requestData["ModifiedBy"]?.ToString()))
                {
                    requestData["ModifiedBy"] = _commonUtilities.ResolveSessionValue("user_name", "user_id");
                }

                if (string.IsNullOrEmpty(requestData["ModifiedOn"]?.ToString()))
                {
                    requestData["ModifiedOn"] = DateTime.UtcNow.ToString("dd MMM yyyy HH:mm:ss.fff");
                }
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());

                Dictionary<string, object> requestDataEnriched = JsonSerializer.Deserialize<Dictionary<string, object>>(requestData)!;
                requestDataEnriched = _commonUtilities.EnrichDefaults(requestDataEnriched, new KeyValuePair<string, object>("BankID", _commonUtilities.ResolveSessionValue("bank_id", "bank_code") ?? "00"));

                _logger.LogInformation("client-maintenance.address.update request: {Request}", JsonSerializer.Serialize(requestDataEnriched));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_ADDRESS, requestDataEnriched);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.address.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.address.delete request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_ADDRESS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.address.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
