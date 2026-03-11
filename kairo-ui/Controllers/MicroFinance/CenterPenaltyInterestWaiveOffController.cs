using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance/CenterPenaltyInterestWaiveOff")]
    public class CenterPenaltyInterestWaiveOffController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<CenterPenaltyInterestWaiveOffController> _logger;

        public CenterPenaltyInterestWaiveOffController(
            IAuthService authService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<CenterPenaltyInterestWaiveOffController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _config = configuration;
            _logger = logger;
        }

        // ═════════════════════════════════════════════════════════════════
        // INDEX - Entry point from dashboard
        // ═════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public IActionResult Index()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Center Penalty Interest Waive Off");
                return RedirectToAction("Index", "Login");
            }

            _logger.LogInformation("Center Penalty Interest Waive Off loaded successfully");
            return PartialView("~/Views/MicroFinance/CenterPenaltyInterestWaiveOff.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // GET - View penalty waive-off data (p_GetGLoanPenIntWaiveOff)
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get")]
        public async Task<IActionResult> GetPenaltyWaiveOff([FromBody] GetPenaltyWaiveOffRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (string.IsNullOrWhiteSpace(request.GroupID) || string.IsNullOrWhiteSpace(request.LoanSchemeID))
                    return BadRequest(new { Success = false, ErrorMessage = "Center ID and Scheme ID are required" });

                var requestData = new Dictionary<string, object?>
                {
                    ["OurBranchID"] = request.OurBranchID ?? ResolveSessionValue("branch_code", "branch_id") ?? string.Empty,
                    ["GroupID"] = request.GroupID,
                    ["LoanSchemeID"] = request.LoanSchemeID,
                    ["OperatorID"] = request.OperatorID ?? ResolveSessionValue("user_name", "user_id") ?? "web_portal"
                };

                var envelope = BuildOldApiEnvelope(OldApiDBConstants.GET_GLOAN_PEN_INT_WAIVE_OFF, requestData);

                _logger.LogInformation("GetPenaltyWaiveOff: GroupID={GroupID}, LoanSchemeID={LoanSchemeID}",
                    request.GroupID, request.LoanSchemeID);

                var response = await _oldApiService.PostRawAsync<JsonElement>(MicroFinanceApiName, envelope);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching penalty waive-off data");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error: {ex.Message}" });
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // ADD - Save penalty waive-off entries (p_AddGLoanPenIntWaiveOff)
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("add")]
        public async Task<IActionResult> AddPenaltyWaiveOff([FromBody] AddPenaltyWaiveOffRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (string.IsNullOrWhiteSpace(request.GroupID) || string.IsNullOrWhiteSpace(request.LoanSchemeID))
                    return BadRequest(new { Success = false, ErrorMessage = "Center ID and Scheme ID are required" });

                if (string.IsNullOrWhiteSpace(request.Reason))
                    return BadRequest(new { Success = false, ErrorMessage = "Reason is required" });

                var requestData = new Dictionary<string, object?>
                {
                    ["OurBranchID"] = request.OurBranchID ?? ResolveSessionValue("branch_code", "branch_id") ?? string.Empty,
                    ["GroupID"] = request.GroupID,
                    ["LoanSchemeID"] = request.LoanSchemeID,
                    ["Reason"] = request.Reason,
                    ["PenaltyWaivedOff"] = request.PenaltyWaivedOff,
                    ["OperatorID"] = request.OperatorID ?? ResolveSessionValue("user_name", "user_id") ?? "web_portal",
                    ["Accounts"] = request.Accounts
                };

                var envelope = BuildOldApiEnvelope(OldApiDBConstants.ADD_GLOAN_PEN_INT_WAIVE_OFF, requestData);

                _logger.LogInformation("AddPenaltyWaiveOff: GroupID={GroupID}, LoanSchemeID={LoanSchemeID}, Accounts={Count}",
                    request.GroupID, request.LoanSchemeID, request.Accounts?.Count ?? 0);

                var response = await _oldApiService.PostRawAsync<JsonElement>(MicroFinanceApiName, envelope);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving penalty waive-off");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error: {ex.Message}" });
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // DELETE - Delete penalty waive-off record (p_DeleteGLoanPenIntWaiveOff)
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("delete")]
        public async Task<IActionResult> DeletePenaltyWaiveOff([FromBody] DeletePenaltyWaiveOffRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (string.IsNullOrWhiteSpace(request.GroupID) || string.IsNullOrWhiteSpace(request.LoanSchemeID))
                    return BadRequest(new { Success = false, ErrorMessage = "Center ID and Scheme ID are required" });

                var requestData = new Dictionary<string, object?>
                {
                    ["OurBranchID"] = request.OurBranchID ?? ResolveSessionValue("branch_code", "branch_id") ?? string.Empty,
                    ["GroupID"] = request.GroupID,
                    ["LoanSchemeID"] = request.LoanSchemeID,
                    ["OperatorID"] = request.OperatorID ?? ResolveSessionValue("user_name", "user_id") ?? "web_portal"
                };

                var envelope = BuildOldApiEnvelope(OldApiDBConstants.DELETE_GLOAN_PEN_INT_WAIVE_OFF, requestData);

                _logger.LogInformation("DeletePenaltyWaiveOff: GroupID={GroupID}, LoanSchemeID={LoanSchemeID}",
                    request.GroupID, request.LoanSchemeID);

                var response = await _oldApiService.PostRawAsync<JsonElement>(MicroFinanceApiName, envelope);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting penalty waive-off");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error: {ex.Message}" });
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // GET DEFAULT ADVANCE TYPE - Auto-populate scheme (p_GetDefaultAdvType)
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-default-adv-type")]
        public async Task<IActionResult> GetDefaultAdvType([FromBody] DefaultAdvTypeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (string.IsNullOrWhiteSpace(request.GroupID))
                    return BadRequest(new { Success = false, ErrorMessage = "Center ID is required" });

                var requestData = new Dictionary<string, object?>
                {
                    ["OurBranchID"] = request.OurBranchID ?? ResolveSessionValue("branch_code", "branch_id") ?? string.Empty,
                    ["GroupID"] = request.GroupID,
                    ["OperatorID"] = request.OperatorID ?? ResolveSessionValue("user_name", "user_id") ?? "web_portal"
                };

                var envelope = BuildOldApiEnvelope(OldApiDBConstants.GET_DEFAULT_ADV_TYPE, requestData);

                _logger.LogInformation("GetDefaultAdvType: GroupID={GroupID}", request.GroupID);

                var response = await _oldApiService.PostRawAsync<JsonElement>(MicroFinanceApiName, envelope);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching default advance type");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error: {ex.Message}" });
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // VALIDATE - Field validation via p_GetIDDescription
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("validate")]
        public async Task<IActionResult> ValidateField([FromBody] ValidateFieldRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });

                if (string.IsNullOrWhiteSpace(request.ControlTypeID) || string.IsNullOrWhiteSpace(request.ControlID))
                    return BadRequest(new { Success = false, ErrorMessage = "ControlTypeID and ControlID are required" });

                var requestData = new Dictionary<string, object?>
                {
                    ["ControlTypeID"] = request.ControlTypeID,
                    ["ControlID"] = request.ControlID,
                    ["OurBranchID"] = request.OurBranchID ?? ResolveSessionValue("branch_code", "branch_id") ?? string.Empty,
                    ["OperatorID"] = request.OperatorID ?? ResolveSessionValue("user_name", "user_id") ?? "web_portal"
                };

                var envelope = BuildOldApiEnvelope(OldApiDBConstants.GET_ID_DESCRIPTION, requestData);

                _logger.LogInformation("ValidateField: ControlTypeID={ControlTypeID}, ControlID={ControlID}",
                    request.ControlTypeID, request.ControlID);

                var response = await _oldApiService.PostRawAsync<JsonElement>(MicroFinanceApiName, envelope);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating field");
                return StatusCode(500, new { Success = false, ErrorMessage = $"Error: {ex.Message}" });
            }
        }

        // ═════════════════════════════════════════════════════════════════
        // HELPERS
        // ═════════════════════════════════════════════════════════════════

        private object BuildOldApiEnvelope(string formId, IDictionary<string, object?> requestData)
        {
            var cleanFormId = formId.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase)
                ? formId
                : $"dbo.{formId}";

            EnsureDefaults(requestData);

            return new
            {
                RequestID = cleanFormId,
                FormId = cleanFormId,
                RequestData = requestData,
                RequestTime = DateTime.Now.ToString("MM/dd/yyyy HH:mm:ss",
                    System.Globalization.CultureInfo.InvariantCulture),
                AppName = ResolveOldApiAppName(),
                Checksum = string.Empty
            };
        }

        private void EnsureDefaults(IDictionary<string, object?> requestData)
        {
            SetIfMissing(requestData, "OperatorID",
                ResolveSessionValue("user_name", "user_id") ?? "web_portal");
            SetIfMissing(requestData, "OurBranchID",
                ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
        }

        private static void SetIfMissing(IDictionary<string, object?> requestData, string key, string value)
        {
            if (!requestData.TryGetValue(key, out var existing) ||
                string.IsNullOrWhiteSpace(Convert.ToString(existing)))
            {
                requestData[key] = value;
            }
        }

        private string ResolveOldApiAppName()
        {
            return _config["ApiSettings:OldApiAppName"]
                ?? _config["ApiSettings:AppName"]
                ?? "PROJECT_KAIRO";
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }
            return null;
        }
    }

    // ═════════════════════════════════════════════════════════════════
    // DTOs
    // ═════════════════════════════════════════════════════════════════

    public class GetPenaltyWaiveOffRequest
    {
        public string? OurBranchID { get; set; }
        public string? GroupID { get; set; }
        public string? LoanSchemeID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class AddPenaltyWaiveOffRequest
    {
        public string? OurBranchID { get; set; }
        public string? GroupID { get; set; }
        public string? LoanSchemeID { get; set; }
        public string? Reason { get; set; }
        public string? PenaltyWaivedOff { get; set; }
        public string? OperatorID { get; set; }
        public List<PenaltyAccountItem>? Accounts { get; set; }
    }

    public class PenaltyAccountItem
    {
        public string? AccountID { get; set; }
        public decimal PenaltyWaivedOff { get; set; }
        public bool IsSelect { get; set; }
    }

    public class DeletePenaltyWaiveOffRequest
    {
        public string? OurBranchID { get; set; }
        public string? GroupID { get; set; }
        public string? LoanSchemeID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class DefaultAdvTypeRequest
    {
        public string? OurBranchID { get; set; }
        public string? GroupID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class ValidateFieldRequest
    {
        public string? ControlTypeID { get; set; }
        public string? ControlID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }
}
