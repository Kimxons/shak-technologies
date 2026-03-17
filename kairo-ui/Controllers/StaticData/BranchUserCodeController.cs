using kairo_ui.Models.StaticData;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Security;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/BranchUserCode")]
    public class BranchUserCodeController : Controller
    {
        private const string OldApiName = "OldApi";
        private const string GetBranchUserCodeProc = "dbo.p_GetBranchUserCode";
        private const string SaveBranchUserCodeProc = "dbo.p_AddEditBranchUserCodes";
        private const string GetSearchResultProc = "p_GetSearchResult";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<BranchUserCodeController> _logger;

        public BranchUserCodeController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<BranchUserCodeController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("BranchUserCode")]
        [HttpGet("Index")]
        [HttpGet("~/BranchUserCode")]
        [HttpGet("~/StaticData/BranchUserCodes")]
        [HttpGet("~/StaticData/BranchUserCode")]
        [HttpGet("~/StaticData/frmBranchUserCodes.aspx")]
        [HttpGet("~/StaticData/frmBranchUserCode.aspx")]
        [HttpGet("~/MoneaSys/BranchUserCode")]
        [HttpGet("~/MoneaSys/BranchUserCode/BranchUserCode")]
        [HttpGet("~/MoneaSys/StaticData/BranchUserCode")]
        public IActionResult BranchUserCode()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Branch User Code");
                return RedirectToAction("Index", "Login");
            }

            return View("~/Views/BranchUserCode/BranchUserCode.cshtml");
        }

        [HttpPost("api/get")]
        [HttpPost("~/BranchUserCode/api/get")]
        [HttpPost("~/StaticData/BranchUserCodes/api/get")]
        [HttpPost("~/StaticData/BranchUserCode/api/get")]
        [HttpPost("~/MoneaSys/BranchUserCode/api/get")]
        [HttpPost("~/MoneaSys/StaticData/BranchUserCode/api/get")]
        public async Task<IActionResult> Get([FromBody] BranchUserCodeGetRequest? request, CancellationToken cancellationToken)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { success = false, message = "User is not authenticated" });
            }

            try
            {
                var effectiveRequest = request ?? new BranchUserCodeGetRequest();
                ApplyRequestDefaults(effectiveRequest);

                if (string.IsNullOrWhiteSpace(effectiveRequest.ID))
                {
                    return BadRequest(new { success = false, message = "Code ID is required." });
                }

                var payload = new
                {
                    OurBranchID = effectiveRequest.OurBranchID,
                    ID = effectiveRequest.ID,
                    OperatorID = effectiveRequest.OperatorID
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, GetBranchUserCodeProc, payload);

                if (!IsOldApiSuccess(response))
                {
                    return Ok(new
                    {
                        success = false,
                        message = ExtractErrorMessage(response),
                        data = Array.Empty<object>(),
                        raw = response
                    });
                }

                var details = ExtractDetails(response, "Details01", "Details", "details01", "details");
                return Ok(new { success = true, data = details, message = string.Empty });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Branch User Code for {CodeId}", request?.ID);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("api/save")]
        [HttpPost("~/BranchUserCode/api/save")]
        [HttpPost("~/StaticData/BranchUserCodes/api/save")]
        [HttpPost("~/StaticData/BranchUserCode/api/save")]
        [HttpPost("~/MoneaSys/BranchUserCode/api/save")]
        [HttpPost("~/MoneaSys/StaticData/BranchUserCode/api/save")]
        public async Task<IActionResult> Save([FromBody] JsonElement requestData, CancellationToken cancellationToken)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { success = false, message = "User is not authenticated" });
            }

            try
            {
                var saveRequest = BuildSaveRequest(requestData);

                if (string.IsNullOrWhiteSpace(saveRequest.ID))
                {
                    return BadRequest(new { success = false, message = "Code ID is required." });
                }

                var payload = new
                {
                    OurBranchID = saveRequest.OurBranchID,
                    ID = saveRequest.ID,
                    OperatedBy = saveRequest.OperatedBy,
                    OperatedOn = saveRequest.OperatedOn,
                    SupervisedBy = saveRequest.SupervisedBy,
                    DetailRecords = saveRequest.DetailRecords ?? string.Empty
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, SaveBranchUserCodeProc, payload);

                if (!IsOldApiSuccess(response))
                {
                    return Ok(new
                    {
                        success = false,
                        message = ExtractErrorMessage(response),
                        raw = response
                    });
                }

                return Ok(new { success = true, message = ExtractSuccessMessage(response), raw = response });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving Branch User Code");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost("api/search-code-types")]
        [HttpPost("~/BranchUserCode/api/search-code-types")]
        [HttpPost("~/StaticData/BranchUserCodes/api/search-code-types")]
        [HttpPost("~/StaticData/BranchUserCode/api/search-code-types")]
        [HttpPost("~/MoneaSys/BranchUserCode/api/search-code-types")]
        [HttpPost("~/MoneaSys/StaticData/BranchUserCode/api/search-code-types")]
        public async Task<IActionResult> SearchCodeTypes([FromBody] JsonElement requestData, CancellationToken cancellationToken)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { success = false, message = "User is not authenticated" });
            }

            try
            {
                // Match legacy exec parameters:
                // exec p_GetSearchResult @WhereStmt=N'',@TableID=N'SystemSubCodeID',@RefID=NULL,@PrevOrNext=0,
                // @AdvFilterString=N'ID = ''BranchUserCodeID''',@OperatorID=N'CSADM',@ModuleID=2008,@OurBranchID=N'0101',
                // @SearchKey=NULL,@LanguageID='en'
                const string tableId = "SystemSubCodeID";
                const int moduleId = 2008;
                const string advFilterString = "ID = 'BranchUserCodeID'";

                var operatorId = FirstNonEmpty(
                    ReadString(requestData, "OperatorID"),
                    ResolveSessionValue("OperatorID", "user_name", "user_id"),
                    "CSADM");

                var ourBranchId = FirstNonEmpty(
                    ReadString(requestData, "OurBranchID"),
                    ResolveSessionValue("OurBranchID", "branch_code", "branch_id"),
                    "0101");

                var whereStmt = ReadString(requestData, "WhereStmt");
                var prevOrNext = ReadInt(requestData, "PrevOrNext", defaultValue: 0);
                var pageSize = ReadInt(requestData, "PageSize", defaultValue: 20);
                var refId = ReadString(requestData, "RefID");

                var filterWhere = BuildWhereStmtFromSearchKey(requestData);
                var effectiveWhere = CombineWhere(whereStmt, filterWhere);

                var payload = new
                {
                    WhereStmt = effectiveWhere,
                    TableID = tableId,
                    RefID = string.IsNullOrWhiteSpace(refId) ? null : refId,
                    PrevOrNext = prevOrNext,
                    AdvFilterString = advFilterString,
                    OperatorID = operatorId,
                    ModuleID = moduleId,
                    OurBranchID = ourBranchId,
                    SearchKey = (object?)null,
                    LanguageID = "en",
                    PageSize = pageSize
                };

                var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, GetSearchResultProc, payload);

                if (!IsOldApiSuccess(response))
                {
                    return Ok(new { success = false, message = ExtractErrorMessage(response), raw = response });
                }

                var rows = ExtractDetails(response, "Details", "Details01", "details", "details01")
                    .Select(row => new
                    {
                        SubCodeID = ReadString(row, "SubCodeID", "SystemSubCodeID", "ID", "Id", "SubCode"),
                        Description = ReadString(row, "Description", "Name", "CodeDescription", "SubCodeName")
                    })
                    .Where(item => !string.IsNullOrWhiteSpace(item.SubCodeID))
                    .ToList();

                return Ok(new { success = true, data = rows, message = string.Empty });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching Branch User Code types");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static bool IsOldApiSuccess(JsonElement response)
        {
            if (response.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            if (TryGetProperty(response, "ResponseCode", out var responseCodeElement))
            {
                var responseCode = responseCodeElement.ValueKind == JsonValueKind.String
                    ? (responseCodeElement.GetString() ?? string.Empty)
                    : responseCodeElement.ToString();

                return string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(responseCode, "0", StringComparison.OrdinalIgnoreCase);
            }

            // If no ResponseCode is present, assume success (some OldApi forms return Details only).
            return true;
        }

        private static string ExtractErrorMessage(JsonElement response)
        {
            var message = ReadString(response, "ResponseMessage", "ErrorMessage", "Message", "message", "error");
            return string.IsNullOrWhiteSpace(message) ? "Request failed" : message;
        }

        private static string ExtractSuccessMessage(JsonElement response)
        {
            var message = ReadString(response, "ResponseMessage", "Message");
            return string.IsNullOrWhiteSpace(message) ? "Saved successfully" : message;
        }

        private static IEnumerable<JsonElement> ExtractDetails(JsonElement response, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (TryGetProperty(response, propertyName, out var element) && element.ValueKind == JsonValueKind.Array)
                {
                    return element.EnumerateArray();
                }
            }

            if (TryGetProperty(response, "data", out var data) && data.ValueKind == JsonValueKind.Object)
            {
                foreach (var propertyName in propertyNames)
                {
                    if (TryGetProperty(data, propertyName, out var element) && element.ValueKind == JsonValueKind.Array)
                    {
                        return element.EnumerateArray();
                    }
                }
            }

            return Array.Empty<JsonElement>();
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

        private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        value = property.Value;
                        return true;
                    }
                }
            }

            value = default;
            return false;
        }

        private static string ReadString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (TryGetProperty(element, propertyName, out var property))
                {
                    if (property.ValueKind == JsonValueKind.String)
                    {
                        return property.GetString() ?? string.Empty;
                    }

                    if (property.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
                    {
                        return property.ToString();
                    }
                }
            }

            return string.Empty;
        }

        private static int ReadInt(JsonElement element, string propertyName, int defaultValue)
        {
            if (element.ValueKind == JsonValueKind.Object && element.TryGetProperty(propertyName, out var value))
            {
                if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
                {
                    return number;
                }

                if (value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out var parsed))
                {
                    return parsed;
                }
            }

            return defaultValue;
        }

        private static string CombineWhere(string? whereStmt, string? extra)
        {
            var left = (whereStmt ?? string.Empty).Trim();
            var right = (extra ?? string.Empty).Trim();

            if (string.IsNullOrWhiteSpace(left))
            {
                return right;
            }

            if (string.IsNullOrWhiteSpace(right))
            {
                return left;
            }

            return $"({left}) AND ({right})";
        }

        private static string BuildWhereStmtFromSearchKey(JsonElement requestData)
        {
            if (!requestData.TryGetProperty("SearchKey", out var searchKey) || searchKey.ValueKind != JsonValueKind.Object)
            {
                return string.Empty;
            }

            var clauses = new List<string>();
            foreach (var prop in searchKey.EnumerateObject())
            {
                var field = prop.Name;
                var value = string.Empty;
                var mode = "like";

                if (prop.Value.ValueKind == JsonValueKind.Object)
                {
                    if (prop.Value.TryGetProperty("value", out var vEl) && vEl.ValueKind == JsonValueKind.String)
                    {
                        value = vEl.GetString() ?? string.Empty;
                    }

                    if (prop.Value.TryGetProperty("mode", out var mEl) && mEl.ValueKind == JsonValueKind.String)
                    {
                        mode = mEl.GetString() ?? "like";
                    }
                }
                else if (prop.Value.ValueKind == JsonValueKind.String)
                {
                    value = prop.Value.GetString() ?? string.Empty;
                }

                value = value.Trim();
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                var safeValue = value.Replace("'", "''");
                var normalizedMode = mode.Trim().ToLowerInvariant();

                clauses.Add(normalizedMode switch
                {
                    "equals" => $"{field} = '{safeValue}'",
                    "startswith" => $"{field} LIKE '{safeValue}%'",
                    "endswith" => $"{field} LIKE '%{safeValue}'",
                    _ => $"{field} LIKE '%{safeValue}%'"
                });
            }

            return string.Join(" AND ", clauses);
        }

        private void ApplyRequestDefaults(BranchUserCodeGetRequest request)
        {
            request.OurBranchID = FirstNonEmpty(
                request.OurBranchID,
                HttpContext.Session.GetString("branch_code"),
                HttpContext.Session.GetString("branch_id"),
                "0101");

            request.OperatorID = FirstNonEmpty(
                request.OperatorID,
                HttpContext.Session.GetString("user_name"),
                HttpContext.Session.GetString("user_id"),
                "SYSTEM");
        }

        private BranchUserCodeSaveRequest BuildSaveRequest(JsonElement requestData)
        {
            var ourBranchId = FirstNonEmpty(
                ReadString(requestData, "OurBranchID"),
                HttpContext.Session.GetString("branch_code"),
                HttpContext.Session.GetString("branch_id"),
                "0101");

            var operatorId = FirstNonEmpty(
                ReadString(requestData, "OperatedBy"),
                ReadString(requestData, "OperatorID"),
                HttpContext.Session.GetString("user_name"),
                HttpContext.Session.GetString("user_id"),
                "SYSTEM");

            return new BranchUserCodeSaveRequest
            {
                OurBranchID = ourBranchId,
                ID = ReadString(requestData, "ID"),
                OperatedBy = operatorId,
                OperatedOn = FirstNonEmpty(ReadString(requestData, "OperatedOn"), DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")),
                SupervisedBy = ReadString(requestData, "SupervisedBy"),
                DetailRecords = BuildDetailRecordsXml(requestData)
            };
        }

        private static string BuildDetailRecordsXml(JsonElement requestData)
        {
            if (!requestData.TryGetProperty("SubCodes", out var subCodesElement) || subCodesElement.ValueKind != JsonValueKind.Array)
            {
                return string.Empty;
            }

            var fragments = new List<string>();
            foreach (var item in subCodesElement.EnumerateArray())
            {
                var subCodeId = ReadString(item, "SubCodeID", "subCodeID", "SubCode", "ID");
                var description = ReadString(item, "Description", "SubCodeName", "CodeDescription", "Name");
                var buttonMark = FirstNonEmpty(
                    ReadString(item, "ButtonMark", "buttonMark"),
                    ReadBoolean(item, "_isDeleted") ? "R" : string.Empty,
                    ReadBoolean(item, "_isNew") ? "N" : string.Empty,
                    ReadBoolean(item, "_isModified") ? "E" : string.Empty,
                    "E");

                if (string.IsNullOrWhiteSpace(subCodeId))
                {
                    continue;
                }

                fragments.Add($"<dt_BranchUserCode><SubCodeID>{Escape(subCodeId)}</SubCodeID><Description>{Escape(description)}</Description><ButtonMark>{Escape(buttonMark)}</ButtonMark></dt_BranchUserCode>");
            }

            return string.Concat(fragments);
        }

        private static string Escape(string? value)
        {
            return SecurityElement.Escape(value ?? string.Empty) ?? string.Empty;
        }

        private static bool ReadBoolean(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (element.ValueKind != JsonValueKind.Object)
                {
                    break;
                }

                if (!element.TryGetProperty(propertyName, out var property))
                {
                    continue;
                }

                if (property.ValueKind == JsonValueKind.True)
                {
                    return true;
                }

                if (property.ValueKind == JsonValueKind.False)
                {
                    return false;
                }

                if (property.ValueKind == JsonValueKind.String && bool.TryParse(property.GetString(), out var parsed))
                {
                    return parsed;
                }
            }

            return false;
        }

        private static string FirstNonEmpty(params string?[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value.Trim();
                }
            }

            return string.Empty;
        }
    }
}