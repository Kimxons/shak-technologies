using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance")]
    public class ClientMaintenanceController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientMaintenanceController> _logger;
        private readonly string moduleid = "1000";
        public ClientMaintenanceController(
            IAuthService authService,
            IApiService apiService,
            ICommonUtilitiesService commonUtilities,
            IApiCachedService apiCachedService,
            ILogger<ClientMaintenanceController> logger)
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
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Client Maintenance");
                return RedirectToAction("Index", "Login");
            }

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "ClientTypeID",
                    "ClientGroupID"
                });

                dropdownOptions.TryGetValue("ClientTypeID", out var clientTypeOptions);
                dropdownOptions.TryGetValue("ClientGroupID", out var clientGroupOptions);

                ViewData["ClientTypeOptions"] = clientTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ClientGroupOptions"] = clientGroupOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Client Maintenance top-section dropdown options");
                ViewData["ClientTypeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["ClientGroupOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return PartialView();
        }

        [HttpPost]
        [Route("validate-client")]
        public async Task<IActionResult> ValidateClient([FromBody] ClientMaintenanceValidateRequest requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            if (requestData == null)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            }

            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.validate-client request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("SystemCoreApi", ApiEndpoints.GET_ID_DESCRIPTION, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.validate-client");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("get-basic")]
        public async Task<IActionResult> GetBasic([FromBody] JsonDocument requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            if (requestData == null)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            }

            try
            {
                //_commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _commonUtilities.EnsureDefaults(requestData, requestData?.RootElement.GetProperty("ModuleID").GetString());
                _logger.LogInformation("client-maintenance.get-basic request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_BASIC_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.get-basic");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("create-basic")]
        public async Task<IActionResult> CreateBasic([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            if (requestData == null)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            }

            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.create-basic request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_BASIC_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.create-basic");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("update-basic")]
        public async Task<IActionResult> UpdateBasic([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            if (requestData == null)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            }

            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.update-basic request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_BASIC_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.update-basic");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("delete-basic")]
        public async Task<IActionResult> DeleteBasic([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            if (requestData == null)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            }

            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.delete-basic request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_BASIC_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.delete-basic");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("get-workflow-stage")]
        public async Task<IActionResult> GetWorkflowStage([FromBody] JsonDocument requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            if (requestData == null)
            {
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            }

            try
            {
                _commonUtilities.EnsureDefaults(requestData, moduleid);
                _logger.LogInformation("client-maintenance.get-workflow-stage request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("SystemCoreApi", ApiEndpoints.GET_WORKFLOW_STAGE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.get-workflow-stage");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
