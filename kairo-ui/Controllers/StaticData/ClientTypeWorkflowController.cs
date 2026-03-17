using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/ClientTypeWorkflow")]
    public class ClientTypeWorkflowController : StaticDataModuleControllerBase
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ClientTypeWorkflowController> _logger;

        public ClientTypeWorkflowController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<ClientTypeWorkflowController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // -----------------------------------------------------------------------
        // INDEX – load the view with the Workflow ID dropdown pre-populated
        // -----------------------------------------------------------------------

        [HttpGet("")]
        [HttpGet("Index")]
        [HttpGet("~/StaticData/BankClientTypeWorkflow")]
        [HttpGet("~/StaticData/BankClientTypeWorkflow/Index")]
        public async Task<IActionResult> Index(string? moduleId = null)
        {
            ViewData["Title"]      = "Client Type Workflow";
            ViewData["ModuleId"]   = moduleId ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name")   ?? string.Empty;
            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BankId"]     = HttpContext.Session.GetString("bank_id")     ?? string.Empty;

            try
            {
                // "WFIClientTypeID" is the system-code table that holds the workflow types
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "WFIClientTypeID"
                });

                dropdownOptions.TryGetValue("WFIClientTypeID", out var workflowOptions);
                ViewData["WorkflowOptions"] = workflowOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading workflow dropdown for Client Type Workflow");
                ViewData["WorkflowOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return RenderModuleView("ClientTypeWorkflow");
        }

        // -----------------------------------------------------------------------
        // GET CLIENT TYPE WORKFLOW (called when user clicks View)
        // -----------------------------------------------------------------------

        [HttpPost("GetClientTypeWorkflow")]
        public async Task<IActionResult> GetClientTypeWorkflow([FromBody] ClientTypeWorkflowGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.WorkFlowID))
                    return BadRequest(new { success = false, message = "Workflow ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_CLIENT_TYPE_WORKFLOW,
                    new
                    {
                        BankID      = request.BankID,
                        WorkFlowID  = request.WorkFlowID,
                        ID          = request.ID ?? "WFIClientTypeID",
                        OurBranchID = request.OurBranchID,
                        OperatorID  = request.OperatorID
                    }
                );

                if (HasRows(result))
                    return Ok(new { success = true, data = result });

                return Ok(new
                {
                    success = false,
                    data    = result,
                    message = ExtractMessage(result, "No data found for this workflow")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client type workflow");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SAVE CLIENT TYPE WORKFLOW (called when user clicks Save in Edit mode)
        // -----------------------------------------------------------------------

        [HttpPost("SaveClientTypeWorkflow")]
        public async Task<IActionResult> SaveClientTypeWorkflow([FromBody] ClientTypeWorkflowSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.WorkflowID))
                    return BadRequest(new { success = false, message = "Workflow ID is required" });

                if (string.IsNullOrWhiteSpace(request.DetailRecords))
                    return BadRequest(new { success = false, message = "At least one client type must be selected" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.EDIT_CLIENT_TYPE_WORKFLOW,
                    new
                    {
                        BankID        = request.BankID,
                        WorkflowID    = request.WorkflowID,
                        OperatedBy    = request.OperatorID,
                        OperatedOn    = (string?)null,
                        SupervisedBy  = (string?)null,
                        UpdateCount   = 1,
                        DetailRecords = request.DetailRecords
                    }
                );

                if (IsSuccess(result))
                    return Ok(new { success = true, data = result, message = "Saved successfully" });

                return Ok(new
                {
                    success = false,
                    data    = result,
                    message = ExtractMessage(result, "Failed to save")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving client type workflow");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // PRIVATE HELPERS
        // -----------------------------------------------------------------------

        private void EnsureDefaults<T>(T request) where T : ClientTypeWorkflowBaseRequest
        {
            if (string.IsNullOrWhiteSpace(request.OperatorID))
                request.OperatorID = HttpContext.Session.GetString("user_name")   ?? string.Empty;
            if (string.IsNullOrWhiteSpace(request.OurBranchID))
                request.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(request.BankID))
                request.BankID = HttpContext.Session.GetString("bank_id")          ?? string.Empty;
        }

        private static bool IsSuccess(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object) return false;
            var code = GetString(result, "ResponseCode");
            return code == "00" || code == "000" || code == "0";
        }

        private static bool HasRows(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object) return false;
            if (IsSuccess(result)) return true;
            if (TryGet(result, "Details01", out var d01) && d01.ValueKind == JsonValueKind.Array && d01.GetArrayLength() > 0) return true;
            if (TryGet(result, "Details",   out var d)   && d.ValueKind   == JsonValueKind.Array && d.GetArrayLength()   > 0) return true;
            // Details might be an object containing parsed JSON sub-keys
            if (TryGet(result, "Details",   out var dObj) && dObj.ValueKind == JsonValueKind.Object) return true;
            return false;
        }

        private static string ExtractMessage(JsonElement result, string fallback)
        {
            if (result.ValueKind != JsonValueKind.Object) return fallback;
            if (TryGet(result, "Details", out var details) && details.ValueKind == JsonValueKind.Object)
            {
                var msg = GetString(details, "Message") ?? GetString(details, "ErrorMessage");
                if (!string.IsNullOrWhiteSpace(msg)) return msg;
            }
            var responseMsg = GetString(result, "ResponseMessage");
            return string.IsNullOrWhiteSpace(responseMsg) ? fallback : responseMsg;
        }

        private static string? GetString(JsonElement source, string key)
        {
            if (!TryGet(source, key, out var val)) return null;
            return val.ValueKind == JsonValueKind.String ? val.GetString() : val.ToString();
        }

        private static bool TryGet(JsonElement source, string key, out JsonElement value)
        {
            return source.TryGetProperty(key, out value);
        }
    }

    // -----------------------------------------------------------------------
    // REQUEST MODELS
    // -----------------------------------------------------------------------

    public class ClientTypeWorkflowBaseRequest
    {
        public string? OperatorID  { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID      { get; set; }
    }

    public class ClientTypeWorkflowGetRequest : ClientTypeWorkflowBaseRequest
    {
        public string? WorkFlowID { get; set; }   // capital F – matches SP parameter
        public string? ID         { get; set; }   // system code table id e.g. "WFIClientTypeID"
    }

    public class ClientTypeWorkflowSaveRequest : ClientTypeWorkflowBaseRequest
    {
        public string? WorkflowID     { get; set; }   // lowercase f – matches SP parameter
        public string? DetailRecords  { get; set; }   // XML string of selected client types
    }
}
