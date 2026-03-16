using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Products")]
    public class ClientProductsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly ILogger<ClientProductsController> _logger;

        public ClientProductsController(IAuthService authService, IApiService apiService, ICommonUtilitiesService commonUtilities, ILogger<ClientProductsController> logger)
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

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientProducts.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.products.get request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_PRODUCTS_SERVICES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.products.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {

                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.products.create request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_PRODUCTS_SERVICES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.products.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.products.update request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_PRODUCTS_SERVICES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.products.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] System.Text.Json.Nodes.JsonNode requestData)
        {
            if (!_authService.IsAuthenticated()) return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null) return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData["ModuleID"]?.ToString());
                _logger.LogInformation("client-maintenance.products.delete request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _apiService.CreateAsync<System.Text.Json.JsonElement>("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_PRODUCTS_SERVICES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.products.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
