using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/LoanAnalysis")]
    public class LoanAnalysisController : StaticDataModuleControllerBase
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<LoanAnalysisController> _logger;

        public LoanAnalysisController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<LoanAnalysisController> logger)
            : base(authService, logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // -----------------------------------------------------------------------
        // INDEX
        // -----------------------------------------------------------------------

        [HttpGet("")]
        [HttpGet("Index")]
        [HttpGet("~/StaticData/LoanAgingAnalysis")]
        [HttpGet("~/StaticData/LoanAgingAnalysis/Index")]
        public async Task<IActionResult> Index(string? moduleId = null)
        {
            ViewData["Title"] = "Loan Analysis";
            ViewData["ModuleId"] = moduleId ?? "7100";
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;
            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BankId"] = HttpContext.Session.GetString("bank_id") ?? string.Empty;

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "LoanAnalysisTypeID",
                    "LoanAnalysisReportID"
                });

                dropdownOptions.TryGetValue("LoanAnalysisTypeID", out var analysisTypeOptions);
                dropdownOptions.TryGetValue("LoanAnalysisReportID", out var analysisReportOptions);

                var combined = new List<SelectListItem> { new SelectListItem { Value = "", Text = "--Select--" } };
                if (analysisTypeOptions != null)
                    combined.AddRange(analysisTypeOptions.Where(x => !string.IsNullOrWhiteSpace(x.Value)));
                if (analysisReportOptions != null)
                    combined.AddRange(analysisReportOptions.Where(x => !string.IsNullOrWhiteSpace(x.Value)));

                ViewData["AnalysisTypeOptions"] = combined.AsEnumerable();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Loan Analysis");
                ViewData["AnalysisTypeOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return RenderModuleView("LoanAnalysis");
        }

        // -----------------------------------------------------------------------
        // GET LOAN ANALYSIS
        // -----------------------------------------------------------------------

        [HttpPost("GetLoanAnalysis")]
        public async Task<IActionResult> GetLoanAnalysis([FromBody] LoanAnalysisGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.LoanAnalysisID))
                    return BadRequest(new { success = false, message = "Loan Analysis ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_LOAN_ANALYSIS,
                    request
                );

                if (HasRows(result))
                    return Ok(new { success = true, data = result });

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractMessage(result, "Record not found")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan analysis");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SEARCH LOAN ANALYSIS
        // -----------------------------------------------------------------------

        [HttpPost("SearchLoanAnalysis")]
        public async Task<IActionResult> SearchLoanAnalysis([FromBody] LoanAnalysisSearchRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Invalid request" });

                EnsureDefaults(request);

                var getRequest = new LoanAnalysisGetRequest
                {
                    BankID = request.BankID,
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    LoanAnalysisID = request.LoanAnalysisID ?? string.Empty
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_LOAN_ANALYSIS,
                    getRequest
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching loan analysis");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SAVE (ADD / EDIT) LOAN ANALYSIS
        // -----------------------------------------------------------------------

        [HttpPost("SaveLoanAnalysis")]
        public async Task<IActionResult> SaveLoanAnalysis([FromBody] LoanAnalysisSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.LoanAnalysisID))
                    return BadRequest(new { success = false, message = "Loan Analysis ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_LOAN_ANALYSIS,
                    request
                );

                if (IsSuccess(result))
                    return Ok(new { success = true, data = result, message = "Saved successfully" });

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractMessage(result, "Failed to save")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving loan analysis");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // DELETE LOAN ANALYSIS
        // -----------------------------------------------------------------------

        [HttpPost("DeleteLoanAnalysis")]
        public async Task<IActionResult> DeleteLoanAnalysis([FromBody] LoanAnalysisDeleteRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.LoanAnalysisID))
                    return BadRequest(new { success = false, message = "Loan Analysis ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.DELETE_LOAN_ANALYSIS,
                    request
                );

                if (IsSuccess(result))
                    return Ok(new { success = true, data = result, message = "Deleted successfully" });

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractMessage(result, "Failed to delete")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting loan analysis");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // PRIVATE HELPERS
        // -----------------------------------------------------------------------

        private void EnsureDefaults<T>(T request) where T : LoanAnalysisBaseRequest
        {
            if (string.IsNullOrWhiteSpace(request.OperatorID))
                request.OperatorID = HttpContext.Session.GetString("user_name") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(request.OurBranchID))
                request.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(request.BankID))
                request.BankID = HttpContext.Session.GetString("bank_id") ?? string.Empty;
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
            if (TryGet(result, "Details", out var d) && d.ValueKind == JsonValueKind.Array && d.GetArrayLength() > 0) return true;
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

    public class LoanAnalysisBaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
    }

    public class LoanAnalysisGetRequest : LoanAnalysisBaseRequest
    {
        public string? LoanAnalysisID { get; set; }
    }

    public class LoanAnalysisSearchRequest : LoanAnalysisBaseRequest
    {
        public string? LoanAnalysisID { get; set; }
        public string? Description { get; set; }
        public string? AnalysisTypeID { get; set; }
    }

    public class LoanAnalysisSaveRequest : LoanAnalysisBaseRequest
    {
        public string? LoanAnalysisID { get; set; }
        public string? Description { get; set; }
        public string? AnalysisTypeID { get; set; }
        public int NoOfSlabs { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public int UpdateCount { get; set; }
        public string? DetailRecords { get; set; }
    }

    public class LoanAnalysisDeleteRequest : LoanAnalysisBaseRequest
    {
        public string? LoanAnalysisID { get; set; }
        public int UpdateCount { get; set; }
    }
}
