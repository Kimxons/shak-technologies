using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Offers")]
    public class ClientOffersController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly ILogger<ClientOffersController> _logger;

        public ClientOffersController(IAuthService authService, IApiService apiService, ICommonUtilitiesService commonUtilities, ILogger<ClientOffersController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _commonUtilities = commonUtilities;
            _logger = logger;
        }

        [HttpGet]
        [Route("Index")]
        public IActionResult Index(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated()) return RedirectToAction("Index", "Login");

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientOffers.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {

                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.offers.get request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_SPECIAL_OFFERS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.offers.get");
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
                _logger.LogInformation("client-maintenance.offers.create request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_SPECIAL_OFFERS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.offers.create");
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
                _logger.LogInformation("client-maintenance.offers.update request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_SPECIAL_OFFERS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.offers.update");
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
                _logger.LogInformation("client-maintenance.offers.delete request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_SPECIAL_OFFERS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.offers.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
