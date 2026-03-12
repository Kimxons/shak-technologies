using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Personal")]
    public class ClientPersonalController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientPersonalController> _logger;

        public ClientPersonalController(IAuthService authService, IApiService apiService, ICommonUtilitiesService commonUtilities, IApiCachedService apiCachedService, ILogger<ClientPersonalController> logger)
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
                    "TitleID",
                    "GenderID",
                    "CountryID",
                    "ResidentID",
                    "IdentificationTypeID",
                    "LiteracyLevelID",
                    "MaritalStatusID",
                    "BloodGroupID",
                    "RelationshipManagerID"
                });

                dropdownOptions.TryGetValue("TitleID", out var titleOptions);
                dropdownOptions.TryGetValue("GenderID", out var genderOptions);
                dropdownOptions.TryGetValue("CountryID", out var nationalityOptions);
                dropdownOptions.TryGetValue("ResidentID", out var residentOptions);
                dropdownOptions.TryGetValue("IdentificationTypeID", out var identificationTypeOptions);
                dropdownOptions.TryGetValue("LiteracyLevelID", out var literacyLevelOptions);
                dropdownOptions.TryGetValue("MaritalStatusID", out var maritalStatusOptions);
                dropdownOptions.TryGetValue("BloodGroupID", out var bloodGroupOptions);
                dropdownOptions.TryGetValue("RelationshipManagerID", out var relationshipManagerOptions);

                ViewData["TitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["GenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["NationalityOptions"] = nationalityOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ResidentOptions"] = residentOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["IdentificationTypeOptions"] = identificationTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["LiteracyLevelOptions"] = literacyLevelOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["MaritalStatusOptions"] = maritalStatusOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["BloodGroupOptions"] = bloodGroupOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["RelationshipManagerOptions"] = relationshipManagerOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Personal tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientPersonal.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]!.ToString());
                _logger.LogInformation("client-maintenance.personal.get request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_INDIVIDUAL, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.personal.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                //_commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                if (requestData["CreatedBy"] == null)
                {
                    requestData["CreatedBy"] = _commonUtilities.ResolveSessionValue("user_name", "user_id");
                }

                if (requestData["OurBranchID"] == null)
                {
                    requestData["OurBranchID"] = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                }

                if (string.IsNullOrEmpty(requestData["RequestID"]!.ToString()))
                {
                    requestData["RequestID"] = HttpContext!.Connection.Id;
                }

                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]!.ToString());
                //Dictionary<string,object> finalRequestData = _commonUtilities.EnrichDefaults(JsonSerializer.Deserialize<Dictionary<string,object>>(requestData.ToJsonString()), JsonObject.Parse(requestData.ToJsonString()).get);
                _logger.LogInformation("client-maintenance.personal.create request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_INDIVIDUAL, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.personal.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                if (requestData["ModifiedBy"] == null)
                {
                    requestData["ModifiedBy"] = _commonUtilities.ResolveSessionValue("user_name", "user_id");
                }

                if (requestData["OurBranchID"] == null)
                {
                    requestData["OurBranchID"] = _commonUtilities.ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                }

                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]!.ToString());
                _logger.LogInformation("client-maintenance.personal.update request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_INDIVIDUAL, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.personal.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]!.ToString());
                _logger.LogInformation("client-maintenance.personal.delete request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_INDIVIDUAL, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.personal.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
