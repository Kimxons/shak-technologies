using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/NgoMaintenance")]
    public class NgoMaintenanceController : StaticDataModuleControllerBase
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<NgoMaintenanceController> _logger;

        public NgoMaintenanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<NgoMaintenanceController> logger)
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
        [HttpGet("~/StaticData/NGODetails")]
        [HttpGet("~/StaticData/NGODetails/Index")]
        public async Task<IActionResult> Index(string? moduleId = null)
        {
            ViewData["Title"] = "NGO Maintenance";
            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;
            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BankId"] = HttpContext.Session.GetString("bank_id") ?? string.Empty;

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "CityID",
                    "CountryID"
                });

                dropdownOptions.TryGetValue("CityID", out var cityOptions);
                dropdownOptions.TryGetValue("CountryID", out var countryOptions);

                ViewData["CityOptions"] = cityOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for NGO Maintenance");
                ViewData["CityOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["CountryOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return RenderModuleView("NgoMaintenance");
        }

        // -----------------------------------------------------------------------
        // GET NGO
        // -----------------------------------------------------------------------

        [HttpPost("GetNgo")]
        public async Task<IActionResult> GetNgo([FromBody] NgoGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.NGOID))
                    return BadRequest(new { success = false, message = "NGO ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_NGO,
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
                _logger.LogError(ex, "Error getting NGO record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SEARCH NGO  (proxies p_GetSearchResult with candidate TableIDs)
        // -----------------------------------------------------------------------

        [HttpPost("SearchNgo")]
        public async Task<IActionResult> SearchNgo([FromBody] NgoSearchRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Invalid request" });

                EnsureDefaults(request);

                // Build WHERE clause
                var clauses = new List<string>();
                if (!string.IsNullOrWhiteSpace(request.NGOID))
                {
                    var safe = request.NGOID.Replace("'", "''");
                    var clause = (request.NgoIdMode ?? "Like") == "Equal"
                        ? $"NGOID = '{safe}'"
                        : $"NGOID LIKE '%{safe}%'";
                    clauses.Add(clause);
                }
                if (!string.IsNullOrWhiteSpace(request.NGOName))
                {
                    var safe = request.NGOName.Replace("'", "''");
                    var clause = (request.NgoNameMode ?? "Like") == "Equal"
                        ? $"NGOName = '{safe}'"
                        : $"NGOName LIKE '%{safe}%'";
                    clauses.Add(clause);
                }

                var whereStmt = clauses.Count > 0 ? string.Join(" AND ", clauses) : "1=1";

                var searchPayload = new
                {
                    TableID = "NGO",
                    WhereStmt = whereStmt,
                    AdvFilterString = "",
                    PrevOrNext = "1",
                    RefID = "",
                    OperatorID = request.OperatorID,
                    ModuleID = request.ModuleID ?? 1000,
                    OurBranchID = request.OurBranchID
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.SEARCH_NGO,
                    searchPayload
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching NGO records");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SAVE (ADD / EDIT) NGO
        // -----------------------------------------------------------------------

        [HttpPost("SaveNgo")]
        public async Task<IActionResult> SaveNgo([FromBody] NgoSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.NGOID))
                    return BadRequest(new { success = false, message = "NGO ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_NGO,
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
                _logger.LogError(ex, "Error saving NGO record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // DELETE NGO
        // -----------------------------------------------------------------------

        [HttpPost("DeleteNgo")]
        public async Task<IActionResult> DeleteNgo([FromBody] NgoDeleteRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.NGOID))
                    return BadRequest(new { success = false, message = "NGO ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.DELETE_NGO,
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
                _logger.LogError(ex, "Error deleting NGO record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // PRIVATE HELPERS
        // -----------------------------------------------------------------------

        private void EnsureDefaults<T>(T request) where T : NgoBaseRequest
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

    public class NgoBaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
    }

    public class NgoGetRequest : NgoBaseRequest
    {
        public string? NGOID { get; set; }
        public int Direction { get; set; }
    }

    public class NgoSearchRequest : NgoBaseRequest
    {
        public string? NGOID { get; set; }
        public string? NGOName { get; set; }
        public string? NgoIdMode { get; set; }
        public string? NgoNameMode { get; set; }
        public int? ModuleID { get; set; }
    }

    public class NgoSaveRequest : NgoBaseRequest
    {
        public string? NGOID { get; set; }
        public string? NGOName { get; set; }
        public string? EstablishedDate { get; set; }
        public string? RegistrationNo { get; set; }
        public string? RegistrationDetail { get; set; }
        public string? AffiliatedDate { get; set; }
        public string? ContactPerson { get; set; }
        public string? ByLawDetails { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? CityID { get; set; }
        public string? CountryID { get; set; }
        public string? ZipCode { get; set; }
        public string? Phone1 { get; set; }
        public string? Phone2 { get; set; }
        public string? Fax { get; set; }
        public string? Mobile { get; set; }
        public string? Email { get; set; }
        public string? CreatedBy { get; set; }
        public string? ModifiedBy { get; set; }
        public string? SupervisedBy { get; set; }
        public int UpdateCount { get; set; }
    }

    public class NgoDeleteRequest : NgoBaseRequest
    {
        public string? NGOID { get; set; }
        public int UpdateCount { get; set; }
    }
}
