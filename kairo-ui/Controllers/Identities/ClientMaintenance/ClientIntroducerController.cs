using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Introducer")]
    public class ClientIntroducerController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<ClientIntroducerController> _logger;
        private const string OldApiName = "OldApi";

        public ClientIntroducerController(
            IAuthService authService,
            ICommonUtilitiesService commonUtilities,
            IOldApiService oldApiService,
            ILogger<ClientIntroducerController> logger)
        {
            _authService = authService;
            _commonUtilities = commonUtilities;
            _oldApiService = oldApiService;
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

            return PartialView("~/Views/Identities/ClientMaintenance/ClientIntroducer.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] JsonDocument requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.RootElement.GetProperty("ModuleID").GetString());
                _logger.LogInformation("client-maintenance.introducer.get request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.GET_CLIENT_INTRODUCER, requestData!);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.introducer.get");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.introducer.create request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_CLIENT_INTRODUCER, requestData!);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.introducer.create");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.introducer.update request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.ADD_EDIT_CLIENT_INTRODUCER, requestData!);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.introducer.update");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            if (!_authService.IsAuthenticated())
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            if (requestData == null)
                return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
            try
            {
                _commonUtilities.EnsureDefaults(requestData, requestData?.ModuleID);
                _logger.LogInformation("client-maintenance.introducer.delete request: {Request}", JsonSerializer.Serialize(requestData));
                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, OldApiDBConstants.DELETE_CLIENT_INTRODUCER, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error on operation: client-maintenance.introducer.delete");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
