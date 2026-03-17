using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/MaintainVendors")]
    public class MaintainVendorsController : StaticDataModuleControllerBase
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<MaintainVendorsController> _logger;

        public MaintainVendorsController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<MaintainVendorsController> logger)
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
        [HttpGet("~/StaticData/VendorMaintenance")]
        [HttpGet("~/StaticData/VendorMaintenance/Index")]
        public async Task<IActionResult> Index(string? moduleId = null)
        {
            ViewData["Title"] = "Maintain Vendors";
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
                _logger.LogError(ex, "Error loading dropdown options for Maintain Vendors");
                ViewData["CityOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["CountryOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return RenderModuleView("MaintainVendors");
        }

        // -----------------------------------------------------------------------
        // GET VENDOR
        // -----------------------------------------------------------------------

        [HttpPost("GetVendor")]
        public async Task<IActionResult> GetVendor([FromBody] VendorGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.VendorID))
                    return BadRequest(new { success = false, message = "Vendor ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_VENDOR,
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
                _logger.LogError(ex, "Error getting Vendor record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SEARCH VENDOR
        // -----------------------------------------------------------------------

        [HttpPost("SearchVendor")]
        public async Task<IActionResult> SearchVendor([FromBody] VendorSearchRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null)
                    return BadRequest(new { success = false, message = "Invalid request" });

                EnsureDefaults(request);

                var clauses = new List<string>();
                if (!string.IsNullOrWhiteSpace(request.VendorID))
                {
                    var safe = request.VendorID.Replace("'", "''");
                    clauses.Add((request.VendorIdMode ?? "Like") == "Equal"
                        ? $"VendorID = '{safe}'"
                        : $"VendorID LIKE '%{safe}%'");
                }
                if (!string.IsNullOrWhiteSpace(request.VendorName))
                {
                    var safe = request.VendorName.Replace("'", "''");
                    clauses.Add((request.VendorNameMode ?? "Like") == "Equal"
                        ? $"VendorName = '{safe}'"
                        : $"VendorName LIKE '%{safe}%'");
                }

                var searchPayload = new
                {
                    TableID = "Vendors",
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
                    OldApiDBConstants.SEARCH_VENDOR,
                    searchPayload
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching Vendor records");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // GET CONTACT PERSON (to hydrate ContactPersonName from ID)
        // -----------------------------------------------------------------------

        [HttpPost("GetContactPerson")]
        public async Task<IActionResult> GetContactPerson([FromBody] ContactPersonRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.ContactPersonID))
                    return BadRequest(new { success = false, message = "Contact Person ID is required" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_CONTACT_PERSON,
                    new { request.ContactPersonID, Direction = 0 }
                );

                if (HasRows(result))
                    return Ok(new { success = true, data = result });

                return Ok(new { success = false, message = "Contact person not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Contact Person");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // SAVE VENDOR
        // -----------------------------------------------------------------------

        [HttpPost("SaveVendor")]
        public async Task<IActionResult> SaveVendor([FromBody] VendorSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.VendorID))
                    return BadRequest(new { success = false, message = "Vendor ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_VENDOR,
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
                _logger.LogError(ex, "Error saving Vendor record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // DELETE VENDOR
        // -----------------------------------------------------------------------

        [HttpPost("DeleteVendor")]
        public async Task<IActionResult> DeleteVendor([FromBody] VendorDeleteRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                if (request == null || string.IsNullOrWhiteSpace(request.VendorID))
                    return BadRequest(new { success = false, message = "Vendor ID is required" });

                EnsureDefaults(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.DELETE_VENDOR,
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
                _logger.LogError(ex, "Error deleting Vendor record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // -----------------------------------------------------------------------
        // PRIVATE HELPERS
        // -----------------------------------------------------------------------

        private void EnsureDefaults<T>(T request) where T : VendorBaseRequest
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

    public class VendorBaseRequest
    {
        public string? OperatorID { get; set; }
        public string? OurBranchID { get; set; }
        public string? BankID { get; set; }
    }

    public class VendorGetRequest : VendorBaseRequest
    {
        public string? VendorID { get; set; }
        public int Direction { get; set; }
    }

    public class VendorSearchRequest : VendorBaseRequest
    {
        public string? VendorID { get; set; }
        public string? VendorName { get; set; }
        public string? VendorIdMode { get; set; }
        public string? VendorNameMode { get; set; }
        public int? ModuleID { get; set; }
    }

    public class VendorSaveRequest : VendorBaseRequest
    {
        public string? VendorID { get; set; }
        public string? VendorName { get; set; }
        public string? Address1 { get; set; }
        public string? Address2 { get; set; }
        public string? CityID { get; set; }
        public string? CountryID { get; set; }
        public string? ZipCode { get; set; }
        public string? Phone1 { get; set; }
        public string? Phone2 { get; set; }
        public string? Mobile { get; set; }
        public string? Fax { get; set; }
        public string? Email { get; set; }
        public string? ContactPersonID { get; set; }
        public string? ContactPersonName { get; set; }
        public string? ProductDetails { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public int NewRecord { get; set; }
    }

    public class VendorDeleteRequest : VendorBaseRequest
    {
        public string? VendorID { get; set; }
        public int UpdateCount { get; set; }
    }

    public class ContactPersonRequest
    {
        public string? ContactPersonID { get; set; }
    }
}
