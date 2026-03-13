using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Corporate")]
    public class ClientCorporateController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientCorporateController> _logger;

        public ClientCorporateController(IAuthService authService, IApiService apiService, ICommonUtilitiesService commonUtilities, IApiCachedService apiCachedService, ILogger<ClientCorporateController> logger)
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

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            try
            {
                // Use GetMultipleDropdownCodeOptionsAsync - now returns SelectListItem format
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "BusinessOwnershipID",
                    "BusinessLineID",
                    "IdentificationTypeID",
                    "CountryID",
                    "RelationshipManagerID"
                });

                dropdownOptions.TryGetValue("BusinessOwnershipID", out var businessOwnershipOptions);
                dropdownOptions.TryGetValue("BusinessLineID", out var businessLineOptions);
                dropdownOptions.TryGetValue("IdentificationTypeID", out var identificationTypeOptions);
                dropdownOptions.TryGetValue("CountryID", out var countryOptions);
                dropdownOptions.TryGetValue("RelationshipManagerID", out var relationshipManagerOptions);

                ViewData["CorporateBusinessOwnershipOptions"] = businessOwnershipOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateBusinessLineOptions"] = businessLineOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateIdentificationTypeOptions"] = identificationTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateCountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateRelationshipManagerOptions"] = relationshipManagerOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Corporate tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientCorporate.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.corporate.get request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_CORPORATE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.corporate.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.corporate.create request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_CORPORATE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.corporate.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.corporate.update request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_CORPORATE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.corporate.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.corporate.delete request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_CORPORATE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.corporate.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
