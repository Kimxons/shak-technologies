using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.EditCardStatus
{
    [Route("EditCardStatus")]
    [Route("Account/EditCardStatus")]
    [Route("MoneaSys/EditCardStatus")]
    public class EditCardStatusController : Controller
    {
        private static readonly (string Label, string Code)[] LegacyStages =
        {
            ("Received Card", "APP"),
            ("Export Card", "EXP"),
            ("Activate Card", "ACT"),
            ("Disburse Card", "DIS"),
            ("Card Issue", "ISS"),
            ("Card Deactivation", "DEACT"),
            ("Card Reactivation", "REACT")
        };

        private const string OldApiClientName = "OldApi";
        private const string GetElectronicCardsStageWiseFormId = OldApiDBConstants.GET_ELECTRONIC_CARDS_STAGE_WISE;
        private const string EditCardStatusFormId = OldApiDBConstants.GET_EDIT_CARD_STATUS;

        private readonly IAuthService _authService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<EditCardStatusController> _logger;

        public EditCardStatusController(
            IAuthService authService,
            IApiCachedService apiCachedService,
            IOldApiService oldApiService,
            ILogger<EditCardStatusController> logger)
        {
            _authService = authService;
            _apiCachedService = apiCachedService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpGet("")]
        [HttpGet("Index")]
        [HttpGet("~/MoneaSys/frmEditCardStatus.aspx")]
        public async Task<IActionResult> Index()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Edit Card Status");
                return RedirectToAction("Index", "Login");
            }

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "CardStatus",
                    "CardStatusID"
                });

                dropdownOptions.TryGetValue("CardStatus", out var cardStatusOptions);
                dropdownOptions.TryGetValue("CardStatusID", out var cardStatusIdOptions);

                // StageID for p_GetElectronicCardsStageWise expects the coded values
                // (e.g. APP/EXP/ACT), which come from CardStatusID.
                var stageSource = HasSelectableOptions(cardStatusIdOptions)
                    ? cardStatusIdOptions
                    : cardStatusOptions ?? Enumerable.Empty<SelectListItem>();

                ViewData["StageOptions"] = BuildLegacyStageOptions(stageSource ?? Enumerable.Empty<SelectListItem>());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Edit Card Status dropdown options");
                ViewData["StageOptions"] = Enumerable.Empty<SelectListItem>();
            }

            ViewData["ApiBase"] = ResolveApiBase();
            return View();
        }

        [HttpPost("api/get-electronic-cards-stagewise")]
        [HttpPost("~/MoneaSys/frmEditCardStatus.aspx/api/get-electronic-cards-stagewise")]
        public async Task<IActionResult> GetElectronicCardsStagewise([FromBody] JsonElement requestData, CancellationToken cancellationToken = default)
        {
            return await HandleOldApiRequest(requestData, GetElectronicCardsStageWiseFormId, nameof(GetElectronicCardsStagewise), cancellationToken);
        }

        [HttpPost("api/edit-card-status")]
        [HttpPost("~/MoneaSys/frmEditCardStatus.aspx/api/edit-card-status")]
        public async Task<IActionResult> EditCardStatusAction([FromBody] JsonElement requestData, CancellationToken cancellationToken = default)
        {
            return await HandleOldApiRequest(requestData, EditCardStatusFormId, nameof(EditCardStatusAction), cancellationToken);
        }

        private async Task<IActionResult> HandleOldApiRequest(
            JsonElement requestData,
            string formId,
            string methodName,
            CancellationToken cancellationToken = default)
        {
            LogLevel logLevel = LogLevel.None;
            int httpStatusCode = 200;
            object? resp = null;

            try
            {
                if (!_authService.IsAuthenticated())
                {
                    logLevel = LogLevel.Warning;
                    httpStatusCode = 401;
                    resp = new { Success = false, ErrorMessage = "Not authenticated" };
                }
                else if (requestData.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
                {
                    logLevel = LogLevel.Error;
                    httpStatusCode = 400;
                    resp = new { Success = false, ErrorMessage = "Empty or Invalid Body" };
                }
                else
                {
                    var cleanFormId = formId.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase)
                        ? formId
                        : $"dbo.{formId}";

                    var requestDictionary = DeserializeOldApiRequestData(requestData);
                    EnsureOldApiDefaults(requestDictionary);
                    RestrictRequestDataForForm(cleanFormId, requestDictionary);

                    resp = await _oldApiService.CreateAsync<JsonElement>(OldApiClientName, cleanFormId, requestDictionary);

                    if (resp is null)
                    {
                        logLevel = LogLevel.Error;
                        httpStatusCode = 400;
                        resp = new { Success = false, ErrorMessage = "Empty response" };
                    }
                    else
                    {
                        logLevel = LogLevel.Information;
                    }
                }
            }
            catch (Exception ex)
            {
                logLevel = LogLevel.Error;
                httpStatusCode = 500;
                resp = new { Success = false, ErrorMessage = ex.Message };
            }
            finally
            {
                var remoteIp = Request.HttpContext.Connection.RemoteIpAddress?.MapToIPv4().ToString();
                _logger.Log(logLevel, "{@message}", new
                {
                    MethodName = methodName,
                    Request = requestData.GetRawText(),
                    Response = resp,
                    RemoteIp = remoteIp
                });
            }

            return StatusCode(httpStatusCode, resp);
        }

        private static Dictionary<string, object?> DeserializeOldApiRequestData(JsonElement requestData)
        {
            if (requestData.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null)
            {
                return new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            }

            var dictionary = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(requestData.GetRawText(), new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? new Dictionary<string, JsonElement>(StringComparer.OrdinalIgnoreCase);

            var normalized = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            foreach (var entry in dictionary)
            {
                normalized[entry.Key] = ConvertJsonElementToOldApiValue(entry.Value);
            }

            return normalized;
        }

        private static object? ConvertJsonElementToOldApiValue(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.ToString(),
                JsonValueKind.True => bool.TrueString,
                JsonValueKind.False => bool.FalseString,
                JsonValueKind.Null => null,
                JsonValueKind.Undefined => null,
                // Old API SP parameters are scalar; preserve nested payload as JSON text.
                JsonValueKind.Object => element.GetRawText(),
                JsonValueKind.Array => element.GetRawText(),
                _ => element.ToString()
            };
        }

        private void EnsureOldApiDefaults(IDictionary<string, object?> requestData)
        {
            var branchId = ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
            var operatorId = ResolveOperatorId();
            var bankId = ResolveSessionValue("bank_id", "bank_code") ?? "00";

            // Always trust server/session operator resolution for this old API call.
            requestData["OperatorID"] = operatorId;
            SetIfMissing(requestData, "OurBranchID", branchId);
            SetIfMissing(requestData, "BranchID", branchId);
            SetIfMissing(requestData, "BankID", bankId);

            _logger.LogInformation(
                "EditCardStatus request defaults | StageID={StageID} | OperatorID={OperatorID} | OurBranchID={OurBranchID} | BankID={BankID}",
                GetValueOrEmpty(requestData, "StageID"),
                GetValueOrEmpty(requestData, "OperatorID"),
                GetValueOrEmpty(requestData, "OurBranchID"),
                GetValueOrEmpty(requestData, "BankID"));
        }

        private static void RestrictRequestDataForForm(string cleanFormId, IDictionary<string, object?> requestData)
        {
            HashSet<string>? allowedKeys = null;
            var normalizedFormId = cleanFormId.Trim();
            var formIdWithoutSchema = normalizedFormId.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase)
                ? normalizedFormId.Substring(4)
                : normalizedFormId;

            if (normalizedFormId.Equals(OldApiDBConstants.GET_ELECTRONIC_CARDS_STAGE_WISE, StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals(OldApiDBConstants.GET_ELECTRONIC_CARDS_STAGE_WISE, StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals("p_GetElectronicCardsStageWise", StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals("GETELECTRONICCARDSSTAGEWISE", StringComparison.OrdinalIgnoreCase))
            {
                allowedKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "BankID",
                    "OurBranchID",
                    "StageID",
                    "OperatorID"
                };
            }
            else if (normalizedFormId.Equals(OldApiDBConstants.GET_EDIT_CARD_STATUS, StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals(OldApiDBConstants.GET_EDIT_CARD_STATUS, StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals("p_EditCardStatus", StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals("EDIT_CARD_STATUS", StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals("EDITCARDSTATUS", StringComparison.OrdinalIgnoreCase)
                || formIdWithoutSchema.Equals("EDIT_CARD", StringComparison.OrdinalIgnoreCase))
            {
                if (!requestData.ContainsKey("BranchID") && requestData.TryGetValue("OurBranchID", out var ourBranchId))
                {
                    requestData["BranchID"] = ourBranchId;
                }

                if (!requestData.ContainsKey("UpdateCount") && requestData.TryGetValue("updateCount", out var updateCount))
                {
                    requestData["UpdateCount"] = updateCount;
                }

                if (!requestData.ContainsKey("DetailRecords") && requestData.TryGetValue("DetailRecord", out var detailRecord))
                {
                    requestData["DetailRecords"] = detailRecord;
                }

                allowedKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "BranchID",
                    "UpdateCount",
                    "DetailRecords"
                };
            }

            if (allowedKeys is null)
            {
                return;
            }

            var keysToRemove = requestData.Keys
                .Where(key => !allowedKeys.Contains(key))
                .ToList();

            foreach (var key in keysToRemove)
            {
                requestData.Remove(key);
            }
        }

        private string ResolveOperatorId()
        {
            var operatorId = ResolveSessionValue("OperatorID", "user_id");
            if (!string.IsNullOrWhiteSpace(operatorId))
            {
                return NormalizeOperatorId(operatorId);
            }

            // auth_user stores userId and username from login; prefer userId for old API calls.
            operatorId = ResolveAuthUserField("userId");
            if (!string.IsNullOrWhiteSpace(operatorId))
            {
                return NormalizeOperatorId(operatorId);
            }

            operatorId = ResolveAuthUserField("username");
            if (!string.IsNullOrWhiteSpace(operatorId))
            {
                return NormalizeOperatorId(operatorId);
            }

            return NormalizeOperatorId(ResolveSessionValue("user_name") ?? "web_portal");
        }

        private static string NormalizeOperatorId(string operatorId)
        {
            var value = operatorId.Trim();
            return value.All(char.IsLetter) ? value.ToUpperInvariant() : value;
        }

        private string? ResolveAuthUserField(string fieldName)
        {
            try
            {
                var authUserJson = HttpContext.Session.GetString("auth_user");
                if (string.IsNullOrWhiteSpace(authUserJson))
                {
                    return null;
                }

                using var jsonDoc = JsonDocument.Parse(authUserJson);
                if (!jsonDoc.RootElement.TryGetProperty(fieldName, out var field))
                {
                    return null;
                }

                return field.GetString();
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Unable to parse auth_user session JSON for field {FieldName}", fieldName);
                return null;
            }
        }

        private static string GetValueOrEmpty(IDictionary<string, object?> requestData, string key)
        {
            return requestData.TryGetValue(key, out var value)
                ? (Convert.ToString(value) ?? string.Empty)
                : string.Empty;
        }

        private static void SetIfMissing(IDictionary<string, object?> requestData, string key, string value)
        {
            if (!requestData.TryGetValue(key, out var existing) || string.IsNullOrWhiteSpace(Convert.ToString(existing)))
            {
                requestData[key] = value;
            }
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

        private string ResolveApiBase()
        {
            var requestPath = HttpContext.Request.Path.Value ?? string.Empty;

            if (requestPath.Contains("/MoneaSys/frmEditCardStatus.aspx", StringComparison.OrdinalIgnoreCase))
            {
                return Url.Content("~/MoneaSys/frmEditCardStatus.aspx/api");
            }

            if (requestPath.Contains("/MoneaSys/EditCardStatus", StringComparison.OrdinalIgnoreCase))
            {
                return Url.Content("~/MoneaSys/EditCardStatus/api");
            }

            if (requestPath.Contains("/Account/EditCardStatus", StringComparison.OrdinalIgnoreCase))
            {
                return Url.Content("~/Account/EditCardStatus/api");
            }

            return Url.Content("~/EditCardStatus/api");
        }

        private static bool HasSelectableOptions(IEnumerable<SelectListItem>? options)
        {
            return options?.Any(option => !string.IsNullOrWhiteSpace(option.Value)) == true;
        }

        private static IEnumerable<SelectListItem> BuildLegacyStageOptions(IEnumerable<SelectListItem> options)
        {
            var list = options?.ToList() ?? new List<SelectListItem>();

            var result = new List<SelectListItem>
            {
                new SelectListItem { Value = string.Empty, Text = "Select..." }
            };

            foreach (var stage in LegacyStages)
            {
                var match = list.FirstOrDefault(option =>
                    IsMatch(option, stage.Label, stage.Code));

                result.Add(new SelectListItem
                {
                    Text = stage.Label,
                    Value = string.IsNullOrWhiteSpace(match?.Value) ? stage.Code : match!.Value
                });
            }

            return result;
        }

        private static bool IsMatch(SelectListItem? option, string label, string code)
        {
            if (option is null)
            {
                return false;
            }

            var text = (option.Text ?? string.Empty).Trim();
            var value = (option.Value ?? string.Empty).Trim();

            return text.Equals(label, StringComparison.OrdinalIgnoreCase)
                || value.Equals(code, StringComparison.OrdinalIgnoreCase)
                || text.Equals(code, StringComparison.OrdinalIgnoreCase)
                || value.Equals(label, StringComparison.OrdinalIgnoreCase);
        }
    }
}