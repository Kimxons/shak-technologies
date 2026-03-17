using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/TransactionDescription")]
    public class TransactionDescriptionController : StaticDataModuleControllerBase
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<TransactionDescriptionController> _logger;

        public TransactionDescriptionController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<TransactionDescriptionController> logger)
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
        [HttpGet("~/StaticData/TrxDescription")]
        [HttpGet("~/StaticData/TrxDescription/Index")]
        [HttpGet("~/StaticData/TransactionDescriptions")]
        [HttpGet("~/StaticData/TransactionDescriptions/Index")]
        public async Task<IActionResult> Index(string? moduleId = null)
        {
            ViewData["Title"] = "Transaction Description";
            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;
            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BankId"] = HttpContext.Session.GetString("bank_id") ?? string.Empty;

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "TransactionTypeID",
                    "TrxCategoryID"
                });

                dropdownOptions.TryGetValue("TransactionTypeID", out var transactionTypeOptions);
                dropdownOptions.TryGetValue("TrxCategoryID", out var categoryOptions);

                ViewData["TransactionTypeOptions"] = transactionTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CategoryOptions"] = categoryOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Transaction Description");
                ViewData["TransactionTypeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["CategoryOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return RenderModuleView("TransactionDescription");
        }

        // -----------------------------------------------------------------------
        // GET TRANSACTION DESCRIPTION
        // -----------------------------------------------------------------------

        [HttpPost("GetTrxDescription")]
        public async Task<IActionResult> GetTrxDescription([FromBody] TrxDescGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.TrxDescriptionID))
                    return BadRequest(new { success = false, message = "Transaction ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_TRX_DESCRIPTION,
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
                _logger.LogError(ex, "Error getting Transaction Description record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SEARCH TRANSACTION DESCRIPTION
        // -----------------------------------------------------------------------

        [HttpPost("SearchTrxDescription")]
        public async Task<IActionResult> SearchTrxDescription([FromBody] TrxDescSearchRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Invalid request" });

                EnsureDefaults(request);

                var clauses = new List<string>();
                if (!string.IsNullOrWhiteSpace(request.TrxDescriptionID))
                {
                    var safe = request.TrxDescriptionID.Replace("'", "''");
                    clauses.Add((request.IdMode ?? "Like") == "Equal"
                        ? $"TrxDescriptionID = '{safe}'"
                        : $"TrxDescriptionID LIKE '%{safe}%'");
                }
                if (!string.IsNullOrWhiteSpace(request.Description))
                {
                    var safe = request.Description.Replace("'", "''");
                    clauses.Add((request.DescMode ?? "Like") == "Equal"
                        ? $"Description = '{safe}'"
                        : $"Description LIKE '%{safe}%'");
                }

                var searchPayload = new
                {
                    TableID = "TransactionDescription",
                    WhereStmt = clauses.Count > 0 ? string.Join(" AND ", clauses) : "1=1",
                    AdvFilterString = "",
                    PrevOrNext = "1",
                    RefID = "",
                    OperatorID = request.OperatorID,
                    ModuleID = request.ModuleID ?? 1000,
                    OurBranchID = request.OurBranchID
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.SEARCH_TRX_DESCRIPTION,
                    searchPayload
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching Transaction Description records");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SAVE TRANSACTION DESCRIPTION
        // -----------------------------------------------------------------------

        [HttpPost("SaveTrxDescription")]
        public async Task<IActionResult> SaveTrxDescription([FromBody] TrxDescSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.TrxDescriptionID))
                    return BadRequest(new { success = false, message = "Transaction ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_TRX_DESCRIPTION,
                    request
                );

                if (IsSuccess(result))
                    return Ok(new { success = true, data = result, message = "Saved successfully" });

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractMessage(result, "Failed to save"),
                    code = ExtractCode(result)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving Transaction Description record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // DELETE TRANSACTION DESCRIPTION
        // -----------------------------------------------------------------------

        [HttpPost("DeleteTrxDescription")]
        public async Task<IActionResult> DeleteTrxDescription([FromBody] TrxDescDeleteRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.TrxDescriptionID))
                    return BadRequest(new { success = false, message = "Transaction ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.DELETE_TRX_DESCRIPTION,
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
                _logger.LogError(ex, "Error deleting Transaction Description record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // PRIVATE HELPERS
        // -----------------------------------------------------------------------

        private void EnsureDefaults<T>(T request) where T : TrxDescBaseRequest
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

        private static string? ExtractCode(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object) return null;
            return GetString(result, "ResponseCode");
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

    public class TrxDescBaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
    }

    public class TrxDescGetRequest : TrxDescBaseRequest
    {
        public string? TrxDescriptionID { get; set; }
        public int Direction { get; set; }
    }

    public class TrxDescSearchRequest : TrxDescBaseRequest
    {
        public string? TrxDescriptionID { get; set; }
        public string? Description { get; set; }
        public string? IdMode { get; set; }
        public string? DescMode { get; set; }
        public int? ModuleID { get; set; }
    }

    public class TrxDescSaveRequest : TrxDescBaseRequest
    {
        public string? TrxDescriptionID { get; set; }
        public string? Description { get; set; }
        public string? TransactionTypeID { get; set; }
        public string? TrxCategoryID { get; set; }
        public int IsChargeable { get; set; }
        public int IsBlocked { get; set; }
        public int IsSystemTrx { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public int NewRecord { get; set; }
    }

    public class TrxDescDeleteRequest : TrxDescBaseRequest
    {
        public string? TrxDescriptionID { get; set; }
        public int NewRecord { get; set; }
    }
}
