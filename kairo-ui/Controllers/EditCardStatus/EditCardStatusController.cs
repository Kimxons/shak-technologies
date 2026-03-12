using kairo_ui.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Security;
using System.Text;
using System.Text.Json;

namespace kairo_ui.Controllers.EditCardStatus
{
    [Route("EditCardStatus")]
    public class EditCardStatusController : Controller
    {
        private const string OldApiName = "OldApi";
        private readonly IAuthService _authService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IOldApiService _oldApiService;
        private readonly ICommonUtilitiesService _commonUtilities;
        private readonly ILogger<EditCardStatusController> _logger;

        public EditCardStatusController(
            IAuthService authService,
            IApiCachedService apiCachedService,
            IOldApiService oldApiService,
            ICommonUtilitiesService commonUtilities,
            ILogger<EditCardStatusController> logger)
        {
            _authService = authService;
            _apiCachedService = apiCachedService;
            _oldApiService = oldApiService;
            _commonUtilities = commonUtilities;
            _logger = logger;
        }

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

        /// <summary>
        /// Edit Card Status View - requires authentication
        /// </summary>
        [HttpGet("")]
        [HttpGet("Index")]
        [HttpGet("~/MoneaSys/EditCardStatus")]
        [HttpGet("~/MoneaSys/EditCardStatus/Index")]
        public async Task<IActionResult> Index()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Edit Card Status");
                return RedirectToAction("Index", "Login");
            }

            // Loads dropdwn options for main screen
            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "CardStatus",
                    "CardStatusID"
                });

                dropdownOptions.TryGetValue("CardStatus", out var cardStatusOptions);
                dropdownOptions.TryGetValue("CardStatusID", out var cardStatusIdOptions);

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

            return View();
        }

        [HttpPost("api/get-electronic-cards-stagewise")]
        [HttpPost("~/MoneaSys/EditCardStatus/api/get-electronic-cards-stagewise")]
        public async Task<IActionResult> GetElectronicCardsStagewise([FromBody] JsonElement requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            try
            {
                var payload = BuildStagewiseRequest(requestData);
                EnsureStagewiseDefaults(payload);

                _logger.LogInformation(
                    "GetElectronicCardsStagewise request defaults | StageID={StageID} | OperatorID={OperatorID} | OurBranchID={OurBranchID} | BankID={BankID}",
                    GetDictionaryString(payload, "StageID"),
                    GetDictionaryString(payload, "OperatorID"),
                    GetDictionaryString(payload, "OurBranchID"),
                    GetDictionaryString(payload, "BankID"));

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    FormatStoredProcedure(OldApiDBConstants.GET_ELECTRONIC_CARDS_STAGE_WISE),
                    payload);

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading electronic cards stagewise");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("api/edit-card-status")]
        [HttpPost("~/MoneaSys/EditCardStatus/api/edit-card-status")]
        public async Task<IActionResult> EditCardStatusAction([FromBody] JsonElement requestData)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
            }

            try
            {
                var payload = BuildEditCardStatusRequest(requestData);
                EnsureEditCardStatusDefaults(payload);

                _logger.LogInformation(
                    "EditCardStatus request defaults | StageID={StageID} | OperatorID={OperatorID} | OurBranchID={OurBranchID} | BankID={BankID}",
                    string.Empty,
                    GetDictionaryString(payload, "OperatorID"),
                    GetDictionaryString(payload, "OurBranchID"),
                    GetDictionaryString(payload, "BankID"));

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    FormatStoredProcedure(OldApiDBConstants.GET_EDIT_CARD_STATUS),
                    payload);

                _logger.LogInformation(
                    "{Log}",
                    JsonSerializer.Serialize(new
                    {
                        MethodName = nameof(EditCardStatusAction),
                        Request = JsonSerializer.Serialize(payload),
                        Response = response,
                        RemoteIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? string.Empty
                    }));

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error editing card status");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private static bool HasSelectableOptions(IEnumerable<SelectListItem>? options)
        {
            return options?.Any(option => !string.IsNullOrWhiteSpace(option.Value)) == true;
        }

        private void EnsureStagewiseDefaults(Dictionary<string, object> payload)
        {
            SetIfMissing(payload, "BankID", ResolveSessionValue("bank_id", "bank_code", "BankID") ?? "00");
            SetIfMissing(payload, "OurBranchID", ResolveSessionValue("branch_code", "branch_id", "OurBranchID", "BranchID") ?? string.Empty);
            SetIfMissing(payload, "OperatorID", ResolveSessionValue("user_name", "user_id", "OperatorID") ?? "web_portal");
        }

        private void EnsureEditCardStatusDefaults(Dictionary<string, object> payload)
        {
            var branchId = FirstNonEmpty(
                GetDictionaryString(payload, "BranchID"),
                ResolveSessionValue("branch_code", "branch_id", "OurBranchID", "BranchID"),
                string.Empty);

            payload["BranchID"] = branchId;
            payload["UpdateCount"] = ReadDictionaryInt(payload, "UpdateCount");
        }

        private static string FormatStoredProcedure(string storedProcedure)
        {
            return storedProcedure.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase)
                ? storedProcedure
                : $"dbo.{storedProcedure}";
        }

        private static Dictionary<string, object> BuildStagewiseRequest(JsonElement requestData)
        {
            var payload = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            AddIfNotEmpty(payload, "BankID", ReadJsonString(requestData, "BankID"));
            AddIfNotEmpty(payload, "OurBranchID", ReadJsonString(requestData, "OurBranchID"));
            AddIfNotEmpty(payload, "StageID", ReadJsonString(requestData, "StageID"));
            AddIfNotEmpty(payload, "OperatorID", ReadJsonString(requestData, "OperatorID"));

            return payload;
        }

        private static Dictionary<string, object> BuildEditCardStatusRequest(JsonElement requestData)
        {
            var now = DateTime.UtcNow.ToString("o");
            var branchId = FirstNonEmpty(
                ReadJsonString(requestData, "BranchID"),
                ReadJsonString(requestData, "OurBranchID"),
                string.Empty);
            var operatorId = FirstNonEmpty(
                ReadJsonString(requestData, "OperatorID"),
                ReadJsonString(requestData, "ApprovedBy"),
                ReadJsonString(requestData, "ModifiedBy"),
                ReadJsonString(requestData, "CreatedBy"),
                "web_portal");
            var updateCount = ReadJsonInt(requestData, "UpdateCount") ?? 0;

            return new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
            {
                ["BranchID"] = branchId,
                ["UpdateCount"] = updateCount,
                ["DetailRecords"] = BuildCardDetailsXml(requestData, operatorId, branchId, now, updateCount)
            };
        }

        private static string BuildCardDetailsXml(JsonElement requestData, string operatorId, string branchId, string now, int updateCount)
        {
            var xml = new StringBuilder();
            xml.Append("<dt_Cards>");
            AppendXmlElement(xml, "TrackingCardID", FirstNonEmpty(ReadJsonString(requestData, "TrackingCardID"), ReadJsonString(requestData, "TrackingID"), "0"));
            AppendXmlElement(xml, "CardName", ReadJsonString(requestData, "CardName"));
            AppendXmlElement(xml, "CardProvider", ReadJsonString(requestData, "CardProvider"));
            AppendXmlElement(xml, "CardType", ReadJsonString(requestData, "CardType"));
            AppendXmlElement(xml, "BranchID", FirstNonEmpty(ReadJsonString(requestData, "BranchID"), ReadJsonString(requestData, "OurBranchID"), branchId));
            AppendXmlElement(xml, "AccountID", ReadJsonString(requestData, "AccountID"));
            AppendXmlElement(xml, "CreatedBy", FirstNonEmpty(ReadJsonString(requestData, "CreatedBy"), operatorId));
            AppendXmlElement(xml, "CreatedOn", NormalizeDateValue(ReadJsonString(requestData, "CreatedOn")));
            AppendXmlElement(xml, "ModifiedBy", FirstNonEmpty(ReadJsonString(requestData, "ModifiedBy"), operatorId));
            AppendXmlElement(xml, "ModifiedOn", NormalizeDateValue(ReadJsonString(requestData, "ModifiedOn"), now));
            AppendXmlElement(xml, "CardBlockReasonID", FirstNonEmpty(ReadJsonString(requestData, "CardBlockReasonID"), "null"));
            AppendXmlElement(xml, "IsApproved", NormalizeBooleanValue(requestData, "IsApproved", true));
            AppendXmlElement(xml, "IsClientExported", NormalizeBooleanValue(requestData, "IsClientExported", false));
            AppendXmlElement(xml, "IsAccountExported", NormalizeBooleanValue(requestData, "IsAccountExported", false));
            AppendXmlElement(xml, "IsCardExported", NormalizeBooleanValue(requestData, "IsCardExported", false));
            AppendXmlElement(xml, "IsActive", NormalizeBooleanValue(requestData, "IsActive", false));
            AppendXmlElement(xml, "IsCollected", NormalizeBooleanValue(requestData, "IsCollected", false));
            AppendXmlElement(xml, "ApprovalDate", NormalizeDateValue(ReadJsonString(requestData, "ApprovalDate"), now));
            AppendXmlElement(xml, "ClientExportedDate", NormalizeDateValue(ReadJsonString(requestData, "ClientExportedDate")));
            AppendXmlElement(xml, "AccountExportedDate", NormalizeDateValue(ReadJsonString(requestData, "AccountExportedDate")));
            AppendXmlElement(xml, "CardExportedDate", NormalizeDateValue(ReadJsonString(requestData, "CardExportedDate")));
            AppendXmlElement(xml, "ActvationDate", NormalizeDateValue(FirstNonEmpty(ReadJsonString(requestData, "ActvationDate"), ReadJsonString(requestData, "ActivationDate"))));
            AppendXmlElement(xml, "CollectionDate", NormalizeDateValue(ReadJsonString(requestData, "CollectionDate")));
            AppendXmlElement(xml, "StartDate", NormalizeDateValue(ReadJsonString(requestData, "StartDate")));
            AppendXmlElement(xml, "ExpiryDate", NormalizeDateValue(ReadJsonString(requestData, "ExpiryDate")));
            AppendXmlElement(xml, "CardStatus", FirstNonEmpty(ReadJsonString(requestData, "CardStatus"), "APPROVED"));
            AppendXmlElement(xml, "UpdateCount", updateCount.ToString());
            AppendXmlElement(xml, "ButtonMark", "N");
            AppendXmlElement(xml, "ApprovedBy", FirstNonEmpty(ReadJsonString(requestData, "ApprovedBy"), operatorId));
            AppendXmlElement(xml, "ApprovedOn", NormalizeDateValue(FirstNonEmpty(ReadJsonString(requestData, "ApprovedOn"), ReadJsonString(requestData, "ApprovalDate")), now));
            xml.Append("</dt_Cards>");

            return xml.ToString();
        }

        private static void AppendXmlElement(StringBuilder xml, string elementName, string? value)
        {
            xml.Append('<').Append(elementName).Append('>');
            xml.Append(SecurityElement.Escape(value ?? string.Empty));
            xml.Append("</").Append(elementName).Append('>');
        }

        private static string NormalizeBooleanValue(JsonElement requestData, string propertyName, bool defaultValue)
        {
            var value = ReadJsonBool(requestData, propertyName);
            return (value ?? defaultValue) ? "true" : "false";
        }

        private static string NormalizeDateValue(string? value, string defaultValue = "1900-01-01T00:00:00")
        {
            return string.IsNullOrWhiteSpace(value) ? defaultValue : value.Trim();
        }

        private static string ReadJsonString(JsonElement element, string propertyName)
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                return string.Empty;
            }

            foreach (var property in element.EnumerateObject())
            {
                if (!property.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return property.Value.ValueKind switch
                {
                    JsonValueKind.String => property.Value.GetString() ?? string.Empty,
                    JsonValueKind.Number => property.Value.GetRawText(),
                    JsonValueKind.True => "true",
                    JsonValueKind.False => "false",
                    JsonValueKind.Null => string.Empty,
                    _ => property.Value.GetRawText().Trim('"')
                };
            }

            return string.Empty;
        }

        private static int? ReadJsonInt(JsonElement element, string propertyName)
        {
            var value = ReadJsonString(element, propertyName);
            return int.TryParse(value, out var parsed) ? parsed : null;
        }

        private static bool? ReadJsonBool(JsonElement element, string propertyName)
        {
            if (element.ValueKind != JsonValueKind.Object)
            {
                return null;
            }

            foreach (var property in element.EnumerateObject())
            {
                if (!property.Name.Equals(propertyName, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                return property.Value.ValueKind switch
                {
                    JsonValueKind.True => true,
                    JsonValueKind.False => false,
                    JsonValueKind.Number when property.Value.TryGetInt32(out var numericValue) => numericValue != 0,
                    JsonValueKind.String => ParseBoolean(property.Value.GetString()),
                    _ => null
                };
            }

            return null;
        }

        private static bool? ParseBoolean(string? value)
        {
            if (string.IsNullOrWhiteSpace(value))
            {
                return null;
            }

            return value.Trim().ToUpperInvariant() switch
            {
                "1" => true,
                "Y" => true,
                "YES" => true,
                "TRUE" => true,
                "0" => false,
                "N" => false,
                "NO" => false,
                "FALSE" => false,
                _ => null
            };
        }

        private static void AddIfNotEmpty(Dictionary<string, object> payload, string key, string? value)
        {
            if (!string.IsNullOrWhiteSpace(value))
            {
                payload[key] = value.Trim();
            }
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

        private static string GetDictionaryString(Dictionary<string, object> payload, string key)
        {
            return payload.TryGetValue(key, out var value) ? Convert.ToString(value) ?? string.Empty : string.Empty;
        }

        private static int ReadDictionaryInt(Dictionary<string, object> payload, string key)
        {
            if (!payload.TryGetValue(key, out var value) || value is null)
            {
                return 0;
            }

            return value switch
            {
                int intValue => intValue,
                long longValue when longValue >= int.MinValue && longValue <= int.MaxValue => (int)longValue,
                JsonElement json when json.ValueKind == JsonValueKind.Number && json.TryGetInt32(out var jsonValue) => jsonValue,
                _ when int.TryParse(Convert.ToString(value), out var parsed) => parsed,
                _ => 0
            };
        }

        private static void SetIfMissing(Dictionary<string, object> payload, string key, string value)
        {
            if (!payload.ContainsKey(key) || string.IsNullOrWhiteSpace(Convert.ToString(payload[key])))
            {
                payload[key] = value;
            }
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext?.Session?.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
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