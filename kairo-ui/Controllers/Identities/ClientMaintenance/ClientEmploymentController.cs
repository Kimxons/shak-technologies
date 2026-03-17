using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json.Nodes;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Employment")]
    public class ClientEmploymentController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientEmploymentController> _logger;

        public ClientEmploymentController(IAuthService authService, IApiService apiService, ICommonUtilitiesService commonUtilities, IApiCachedService apiCachedService, ILogger<ClientEmploymentController> logger)
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
                    "OccupationID",
                    "DesignationID",
                    "CompanyTypeID",
                    "BusinessOwnershipID",
                    "BusinessLineID"
                });

                dropdownOptions.TryGetValue("OccupationID", out var occupationOptions);
                dropdownOptions.TryGetValue("DesignationID", out var designationOptions);
                dropdownOptions.TryGetValue("CompanyTypeID", out var companyTypeOptions);
                dropdownOptions.TryGetValue("BusinessOwnershipID", out var businessOwnershipOptions);
                dropdownOptions.TryGetValue("BusinessLineID", out var businessLineOptions);

                ViewData["EmploymentOccupationOptions"] = occupationOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["EmploymentDesignationOptions"] = designationOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["EmploymentCompanyTypeOptions"] = companyTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["EmploymentBusinessOwnershipOptions"] = businessOwnershipOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["EmploymentBusinessLineOptions"] = businessLineOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Employment tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientEmployment.cshtml");
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
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.employment.get request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_EMPLOYMENT, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.employment.get");
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
                _logger.LogInformation("client-maintenance.employment.create request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_EMPLOYMENT, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.employment.create");
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
                _logger.LogInformation("client-maintenance.employment.update request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_EMPLOYMENT, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.employment.update");
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
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.employment.delete request: {Request}", System.Text.Json.JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_EMPLOYMENT, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.employment.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
