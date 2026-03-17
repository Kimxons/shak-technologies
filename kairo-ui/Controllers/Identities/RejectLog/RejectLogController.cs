using kairo_ui.Models;
using kairo_ui.Models.Identities.RejectLog;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.RejectLog
{
    [Route("Identities/RejectLog")]
    public class RejectLogController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<RejectLogController> _logger;

        public RejectLogController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<RejectLogController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [Route("Index")]
        public async Task<IActionResult> Index()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Reject Log");
                    return RedirectToAction("Index", "Login");
                }

                ViewData["ModuleId"] = "RejectLog"; 
                return View();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Reject Log");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [HttpPost]
        [Route("get-reject-clients")]
        public async Task<IActionResult> GetRejectClients([FromBody] RejectLogRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                requestData ??= new RejectLogRequest();
                EnsureDefaults(requestData);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_REJECT_CLIENTS,
                    new { OurBranchID = requestData.OurBranchID });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading rejected clients");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error loading rejected clients: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("close-client")]
        public async Task<IActionResult> CloseClient([FromBody] CloseRejectClientRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (requestData == null)
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });

                EnsureDefaults(requestData);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.CLOSE_REJECT_CLIENT,
                    new
                    {
                        OurBranchID = requestData.OurBranchID,
                        ClientID = requestData.ClientID,
                        OperatorID = requestData.OperatorID,
                        RejectReson = requestData.RejectReson
                    });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error closing client");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error closing client: {ex.Message}" });
            }
        }

        [HttpPost]
        [Route("resend-client")]
        public async Task<IActionResult> ResendClient([FromBody] ResendRejectClientRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (requestData == null)
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });

                EnsureDefaults(requestData);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.RESEND_REJECT_CLIENT,
                    new
                    {
                        OurBranchID = requestData.OurBranchID,
                        ClientID = requestData.ClientID,
                        AccountID = requestData.AccountID ?? "",
                        OperatorID = requestData.OperatorID
                    });

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resending client");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error resending client: {ex.Message}" });
            }
        }

        private void EnsureDefaults<T>(T requestData) where T : class
        {
            var type = requestData.GetType();
            var operatorIdProp = type.GetProperty("OperatorID");
            var branchIdProp   = type.GetProperty("OurBranchID");

            if (operatorIdProp != null && string.IsNullOrWhiteSpace(operatorIdProp.GetValue(requestData) as string))
                operatorIdProp.SetValue(requestData, ResolveSessionValue("user_name", "user_id") ?? "web_portal");

            if (branchIdProp != null && string.IsNullOrWhiteSpace(branchIdProp.GetValue(requestData) as string))
                branchIdProp.SetValue(requestData, ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                    return value;
            }
            return null;
        }
    }
}
