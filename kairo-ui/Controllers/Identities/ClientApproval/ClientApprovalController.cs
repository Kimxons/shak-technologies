using kairo_ui.Models.Identities.ClientApproval;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using CBS.Entities.SystemCore;

namespace kairo_ui.Controllers.Identities.ClientApproval
{
    [Route("Identities/ClientApproval")]
    public class ClientApprovalController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IConfiguration _config;
        private readonly ILogger<ClientApprovalController> _logger;

        public ClientApprovalController(
            IAuthService authService,
            IApiService apiService,
            IApiCachedService apiCachedService,
            IConfiguration configuration,
            ILogger<ClientApprovalController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _config = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Load Client Approval view
        /// </summary>
        [Route("Index")]
        public async Task<IActionResult> Index()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Client Approval");
                    return RedirectToAction("Index", "Login");
                }

                // Set module ID for search modals
                const int MODULE_ID_CLIENT_APPROVAL = 6961;
                ViewData["ModuleId"] = MODULE_ID_CLIENT_APPROVAL.ToString();

                var systemCodes = await _apiCachedService.GetMultipleSystemCodeOptionsAsync(new[]
                {
                    "ClientTypeID"
                });

                systemCodes.TryGetValue("ClientTypeID", out var clientTypeOptions);
                ViewData["ClientTypeOptions"] = clientTypeOptions ?? new List<SystemCodeDetail>();

                _logger.LogInformation("Client Approval page loaded successfully");
                return PartialView();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Client Approval");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = "Error loading Client Approval page"
                });
            }
        }

        /// <summary>
        /// Get pending client approvals with filters
        /// </summary>
        [HttpPost]
        [Route("get-pending-approvals")]
        public async Task<IActionResult> GetPendingApprovals([FromBody] ClientApprovalFilterRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated GetPendingApprovals request");
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (request == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureClientApprovalDefaults(request);

                _logger.LogInformation("GetPendingApprovals request: {@Request}", request);

                // Call CustomerManagement API to get pending clients
                var response = await _apiService.CreateAsync<JsonElement>(
                    "ClientManagementApi",
                    ApiEndpoints.GET_PENDING_CLIENT_APPROVALS,
                    request);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending approvals");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error retrieving pending approvals: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Get full client details for approval
        /// </summary>
        [HttpPost]
        [Route("get-client-approval-details")]
        public async Task<IActionResult> GetClientApprovalDetails([FromBody] ClientApprovalDetailRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated GetClientApprovalDetails request");
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (request == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureClientApprovalDefaults(request);

                _logger.LogInformation("GetClientApprovalDetails request: {@Request}", request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "ClientManagementApi",
                    ApiEndpoints.GET_CLIENT_APPROVAL_DETAILS,
                    request);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client approval details");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error retrieving client details: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Get workflow status reasons/checklist items
        /// </summary>
        [HttpPost]
        [Route("get-status-reasons")]
        public async Task<IActionResult> GetStatusReasons([FromBody] StatusReasonsRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated GetStatusReasons request");
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (request == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureClientApprovalDefaults(request);

                _logger.LogInformation("GetStatusReasons request: {@Request}", request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "SystemCoreApi",
                    ApiEndpoints.GET_WORKFLOW_DATA_CHECK_FIELDS,
                    request);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting status reasons");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error retrieving status reasons: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Approve selected clients
        /// </summary>
        [HttpPost]
        [Route("approve-clients")]
        public async Task<IActionResult> ApproveClients([FromBody] ClientApprovalActionRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated ApproveClients request");
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (request == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureClientApprovalDefaults(request);

                _logger.LogInformation("ApproveClients request: {@Request}", request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "ClientManagementApi",
                    ApiEndpoints.APPROVE_CLIENTS,
                    request);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving clients");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error approving clients: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Reject selected clients
        /// </summary>
        [HttpPost]
        [Route("reject-clients")]
        public async Task<IActionResult> RejectClients([FromBody] ClientApprovalRejectionRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated RejectClients request");
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (request == null)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Request data is required" });
                }

                EnsureClientApprovalDefaults(request);

                _logger.LogInformation("RejectClients request: {@Request}", request);

                var response = await _apiService.CreateAsync<JsonElement>(
                    "ClientManagementApi",
                    ApiEndpoints.REJECT_CLIENTS,
                    request);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting clients");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error rejecting clients: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Ensure default values are set in request
        /// </summary>
        private void EnsureClientApprovalDefaults<T>(T requestData) where T : class
        {
            var type = requestData.GetType();
            var operatorIdProp = type.GetProperty("OperatorID");
            var branchIdProp = type.GetProperty("OurBranchID");
            var bankIdProp = type.GetProperty("BankID");

            if (operatorIdProp != null && (operatorIdProp.GetValue(requestData) as string ?? string.Empty).Length == 0)
            {
                operatorIdProp.SetValue(requestData, ResolveSessionValue("user_name", "user_id") ?? "web_portal");
            }

            if (branchIdProp != null && (branchIdProp.GetValue(requestData) as string ?? string.Empty).Length == 0)
            {
                branchIdProp.SetValue(requestData, ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
            }

            if (bankIdProp != null && (bankIdProp.GetValue(requestData) as string ?? string.Empty).Length == 0)
            {
                bankIdProp.SetValue(requestData, "00");
            }
        }

        /// <summary>
        /// Resolve session value from HttpContext
        /// </summary>
        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                if (HttpContext?.Session?.TryGetValue(key, out var bytes) == true)
                {
                    return System.Text.Encoding.UTF8.GetString(bytes);
                }
            }
            return null;
        }
    }
}
