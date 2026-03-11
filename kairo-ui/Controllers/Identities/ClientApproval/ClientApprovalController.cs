using kairo_ui.Models.Identities.ClientApproval;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientApproval
{
    [Route("Identities/ClientApproval")]
    public class ClientApprovalController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientApprovalController> _logger;

        public ClientApprovalController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<ClientApprovalController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // INDEX - Load View with Dropdowns
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? entityId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            // Pass context to view
            ViewData["ModuleId"] = moduleId ?? "6961";
            ViewData["EntityId"] = entityId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(entityId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();
            ViewData["DefaultBranchId"] = ResolveSessionValue("branch_code", "branch_id", "OurBranchID", "BranchID") ?? string.Empty;
            ViewData["DefaultBranchName"] = ResolveSessionValue("branch_name", "BranchName", "OurBranchName", "Branch") ?? string.Empty;

            try
            {
                // Load dropdowns in one cached call
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "ClientTypeID"
                });

                dropdownOptions.TryGetValue("ClientTypeID", out var clientTypeOptions);
                ViewData["ClientTypeOptions"] = clientTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options");
                ViewData["ClientTypeOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return PartialView();
        }

        // ═══════════════════════════════════════════════════════════════════
        // GET - Pending Approvals
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-pending-approvals")]
        public async Task<IActionResult> GetPendingApprovals([FromBody] ClientApprovalFilterRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Request data is required" });

                EnsureDefaults(request);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_GROUP_CLIENT_APPROVAL,
                    new
                    {
                        OurBranchID = request.OurBranchID,
                        LogInBranchID = request.LogInBranchID ?? request.OurBranchID,
                        GroupID = request.GroupID ?? "",
                        OperatorID = request.OperatorID,
                        ClientTypeID = request.ClientTypeID ?? "",
                        ClientID = request.ClientID ?? ""
                    });

                var (isSuccess, responseCode, message, details, _) = ParseResponse(response);
                
                // Handle SPs that return data without ResponseCode
                if (!isSuccess && details != null)
                    isSuccess = true;

                return Ok(new
                {
                    success = isSuccess,
                    responseCode,
                    message,
                    data = details
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting pending approvals");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // GET - Client Approval Details
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-client-approval-details")]
        public async Task<IActionResult> GetClientApprovalDetails([FromBody] ClientApprovalDetailRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Request data is required" });

                EnsureDefaults(request);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_GROUP_CLIENT_APPROVAL,
                    new
                    {
                        OurBranchID = request.OurBranchID,
                        LogInBranchID = request.LogInBranchID ?? request.OurBranchID,
                        GroupID = request.GroupID ?? "",
                        OperatorID = request.OperatorID,
                        ClientTypeID = request.ClientTypeID ?? "",
                        ClientID = request.ClientID ?? ""
                    });

                var (isSuccess, responseCode, message, details, _) = ParseResponse(response);

                return Ok(new
                {
                    success = isSuccess,
                    responseCode,
                    message,
                    data = details
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client approval details");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // GET - Status Reasons / Checklist
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-status-reasons")]
        public async Task<IActionResult> GetStatusReasons([FromBody] StatusReasonsRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Request data is required" });

                EnsureDefaults(request);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_WF_DATA_CHECK_FIELDS,
                    new
                    {
                        BankID = request.BankID ?? "00",
                        WorkflowID = request.WorkflowID ?? "I",
                        OurBranchID = request.OurBranchID,
                        OperatorID = request.OperatorID
                    });

                var (isSuccess, responseCode, message, details, details01) = ParseResponse(response);

                return Ok(new
                {
                    success = isSuccess,
                    responseCode,
                    message,
                    data = details,
                    data01 = details01
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting status reasons");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // APPROVE - Approve Selected Clients
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("approve-clients")]
        public async Task<IActionResult> ApproveClients([FromBody] ClientApprovalActionRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Request data is required" });

                EnsureDefaults(request);

                var approvalData = new
                {
                    OurBranchID = request.OurBranchID,
                    ApprovedBy = request.ApprovedBy ?? request.OperatorID,
                    ApprovedOn = request.ApprovedOn ?? DateTime.Now.ToString("MM/dd/yyyy h:mm:ss tt"),
                    DetailRecords = request.DetailRecords ?? ""
                };

                // Log the data being sent to t_ClientSupervisionData (approval)
                _logger.LogInformation("ApproveClients: Data sent to t_ClientSupervisionData: {ApprovalData}", System.Text.Json.JsonSerializer.Serialize(approvalData));

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GROUP_CLIENT_APPROVAL,
                    approvalData);

                var (isSuccess, responseCode, msg, details, _) = ParseResponse(response);

                // SP returns ClientID on success without ResponseCode
                if (!isSuccess && string.IsNullOrEmpty(responseCode))
                    isSuccess = true;

                var successMessage = string.IsNullOrWhiteSpace(msg)
                    ? "Client(s) approved successfully"
                    : msg;

                return Ok(new
                {
                    success = isSuccess,
                    responseCode,
                    message = isSuccess ? successMessage : msg,
                    data = details
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error approving clients");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // REJECT - Reject Selected Clients
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("reject-clients")]
        public async Task<IActionResult> RejectClients([FromBody] ClientApprovalRejectionRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Request data is required" });

                EnsureDefaults(request);

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GROUP_CLIENT_REJECT,
                    new
                    {
                        OurBranchID = request.OurBranchID,
                        RejectedReason = request.RejectedReason ?? "",
                        RejectedBy = request.RejectedBy ?? request.OperatorID,
                        DetailRecords = request.DetailRecords ?? ""
                    });

                var (isSuccess, responseCode, msg, details, _) = ParseResponse(response);

                // SP returns result without ResponseCode on success
                if (!isSuccess && string.IsNullOrEmpty(responseCode))
                    isSuccess = true;

                return Ok(new
                {
                    success = isSuccess,
                    responseCode,
                    message = isSuccess ? (msg ?? "Client(s) rejected successfully") : msg,
                    data = details
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error rejecting clients");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // ADD - Add Client to Supervision Queue
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("add-client-supervision-data")]
        public async Task<IActionResult> AddClientSupervisionData([FromBody] ClientSupervisionDataRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Request data is required" });

                EnsureDefaults(request);

                var supervisionData = new
                {
                    OurBranchID = request.OurBranchID,
                    ModuleID = request.ModuleID,
                    LockModuleID = request.LockModuleID,
                    OperatorID = request.OperatorID,
                    Searchkey = request.Searchkey ?? $"[OperatorID:{request.OperatorID}][ClientID:{request.ClientID}]",
                    LockKey = request.LockKey ?? $"[OperatorID:{request.OperatorID}][ClientID:{request.ClientID}]",
                    EventID = request.EventID,
                    NewData = request.NewData ?? "",
                    OldData = request.OldData ?? "",
                    Remarks = request.Remarks ?? "Client approved",
                    NewRecord = request.NewRecord,
                    IPAddress = request.IPAddress ?? ""
                };

                // Log the data being sent to t_ClientSupervisionData (add)
                _logger.LogInformation("AddClientSupervisionData: Data sent to t_ClientSupervisionData: {SupervisionData}", System.Text.Json.JsonSerializer.Serialize(supervisionData));

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_CLIENT_SUPERVISION_DATA,
                    supervisionData);

                var (isSuccess, responseCode, msg, details, _) = ParseResponse(response);

                // SP may return success without ResponseCode
                if (!isSuccess && string.IsNullOrEmpty(responseCode))
                    isSuccess = true;

                return Ok(new
                {
                    success = isSuccess,
                    responseCode,
                    message = isSuccess ? (msg ?? "Client added to supervision queue") : msg,
                    data = details
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding client to supervision queue");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // PRIVATE HELPERS
        // ═══════════════════════════════════════════════════════════════════

        private (bool isSuccess, string responseCode, string message, object? details, object? details01) ParseResponse(JsonElement response)
        {
            var responseCode = response.TryGetProperty("ResponseCode", out var rc) ? rc.GetString() ?? "" : "";
            var message = response.TryGetProperty("ResponseMessage", out var rm) ? rm.GetString() ?? "" : "";
            object? details = response.TryGetProperty("Details", out var d) && d.ValueKind != JsonValueKind.Undefined ? d : null;
            object? details01 = response.TryGetProperty("Details01", out var d01) && d01.ValueKind != JsonValueKind.Undefined ? d01 : null;

            var isSuccess = responseCode == "00";
            return (isSuccess, responseCode, message, details, details01);
        }

        private void EnsureDefaults<T>(T requestData) where T : class
        {
            var type = requestData.GetType();
            var operatorIdProp = type.GetProperty("OperatorID");
            var branchIdProp = type.GetProperty("OurBranchID");
            var bankIdProp = type.GetProperty("BankID");

            if (operatorIdProp != null && string.IsNullOrEmpty(operatorIdProp.GetValue(requestData) as string))
            {
                operatorIdProp.SetValue(requestData, ResolveSessionValue("user_name", "user_id") ?? "web_portal");
            }

            if (branchIdProp != null && string.IsNullOrEmpty(branchIdProp.GetValue(requestData) as string))
            {
                branchIdProp.SetValue(requestData, ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
            }

            if (bankIdProp != null && string.IsNullOrEmpty(bankIdProp.GetValue(requestData) as string))
            {
                bankIdProp.SetValue(requestData, "00");
            }
        }

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
