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
        // GET LOAN ANALYSIS TYPES – called by JS on lookup click to populate dropdown
        // -----------------------------------------------------------------------

        [HttpGet("GetLoanAnalysisTypes")]
        public async Task<IActionResult> GetLoanAnalysisTypes()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                // p_GetLoanAnalysisTypeID takes no parameters
                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_LOAN_ANALYSIS_TYPE_ID,
                    new { }
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading loan analysis types");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
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
        //
        // t_SystemSearchItem has SearchID = "LoanAnalysisID" pointing to:
        //   SELECT LoanAnalysisID,Description,AnalysisTypeID FROM t_LoanAnalysis
        // BankID goes inside @WhereStmt (p_GetSearchResult has no @BankID param).
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

                // BankID must be part of WhereStmt — t_LoanAnalysis is bank-partitioned
                // and p_GetSearchResult has no @BankID parameter.
                var clauses = new List<string>();
                var bankSafe = (request.BankID ?? "00").Replace("'", "''");
                clauses.Add($"BankID = '{bankSafe}'");

                if (!string.IsNullOrWhiteSpace(request.LoanAnalysisID))
                {
                    var safe = request.LoanAnalysisID.Replace("'", "''");
                    clauses.Add($"LoanAnalysisID LIKE '%{safe}%'");
                }
                if (!string.IsNullOrWhiteSpace(request.Description))
                {
                    var safe = request.Description.Replace("'", "''");
                    clauses.Add($"Description LIKE '%{safe}%'");
                }
                if (!string.IsNullOrWhiteSpace(request.AnalysisTypeID))
                {
                    var safe = request.AnalysisTypeID.Replace("'", "''");
                    clauses.Add($"AnalysisTypeID = '{safe}'");
                }

                var searchPayload = new
                {
                    TableID         = "LoanAnalysisID",
                    WhereStmt       = string.Join(" AND ", clauses),
                    AdvFilterString = "",
                    PrevOrNext      = "1",
                    RefID           = "",
                    OperatorID      = request.OperatorID,
                    ModuleID        = 7100,
                    OurBranchID     = request.OurBranchID
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_SEARCHRESULT_DBO,
                    searchPayload
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

                // Build exact SP parameter set — p_AddEditLoanAnalysis does NOT accept
                // @OurBranchID or @OperatorID, so we must not pass them.
                // @UpdateCount = 1  → INSERT (new record stored with UpdateCount = 2)
                // @UpdateCount > 1  → UPDATE
                // @DetailRecords accepts NULL when there are no slab rows.
                var savePayload = new
                {
                    BankID         = request.BankID,
                    LoanAnalysisID = request.LoanAnalysisID,
                    Description    = request.Description    ?? string.Empty,
                    AnalysisTypeID = request.AnalysisTypeID ?? string.Empty,
                    NoOfSlabs      = request.NoOfSlabs,
                    CreatedBy      = request.CreatedBy  ?? request.OperatorID,
                    CreatedOn      = request.CreatedOn,
                    ModifiedBy     = request.ModifiedBy ?? request.OperatorID,
                    ModifiedOn     = request.ModifiedOn,
                    SupervisedBy   = request.SupervisedBy,
                    UpdateCount    = request.UpdateCount,
                    DetailRecords  = string.IsNullOrWhiteSpace(request.DetailRecords)
                                        ? "<r/>"   // empty XML — SP's .nodes() returns 0 rows, no error
                                        : request.DetailRecords
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_LOAN_ANALYSIS,
                    savePayload
                );

                if (IsSuccessOrEmpty(result))
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

                // p_DeleteLoanAnalysis only accepts @BankID, @LoanAnalysisID, @UpdateCount
                var deletePayload = new
                {
                    BankID         = request.BankID,
                    LoanAnalysisID = request.LoanAnalysisID,
                    UpdateCount    = request.UpdateCount
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.DELETE_LOAN_ANALYSIS,
                    deletePayload
                );

                if (IsSuccessOrEmpty(result))
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
                request.BankID = HttpContext.Session.GetString("bank_id")
                              ?? HttpContext.Session.GetString("bank_code")
                              ?? "00";
        }

        private static bool IsSuccess(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object) return false;
            var code = GetString(result, "ResponseCode");
            return code == "00" || code == "000" || code == "0";
        }

        /// <summary>
        /// Like IsSuccess but also returns true when the SP returned no result set
        /// (DML-only procs: p_AddEditLoanAnalysis, p_DeleteLoanAnalysis).
        /// An empty {"Details":[]} with no ResponseCode means the operation succeeded.
        /// An explicit non-zero ResponseCode (e.g. "01") still indicates failure.
        /// </summary>
        private static bool IsSuccessOrEmpty(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object) return false;
            var code = GetString(result, "ResponseCode");
            // Explicit success codes
            if (code == "00" || code == "000" || code == "0") return true;
            // No ResponseCode → SP returned empty result set (DML-only success)
            if (string.IsNullOrEmpty(code)) return true;
            return false;
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
        public int? ModuleID { get; set; }
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
