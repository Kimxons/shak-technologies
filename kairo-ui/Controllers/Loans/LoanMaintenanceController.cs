using CBS.Entities.Common;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.Loans
{
    [Route("Loans/LoanMaintenance")]
    public class LoanMaintenanceController : Controller
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<LoanMaintenanceController> _logger;

        public LoanMaintenanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<LoanMaintenanceController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public async Task<IActionResult> LoanMaintenance(string? moduleId = null, string? entityId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            ViewData["Title"] = "Loan Maintenance";
            ViewData["ModuleId"] = moduleId ?? "4300";
            ViewData["EntityId"] = entityId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(entityId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BranchName"] = HttpContext.Session.GetString("branch_name") ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "PurposeCodeID",
                    "RepaymentMethodID",
                    "LineOfBusinessID",
                    "LegalStatusID",
                    "HealthCodeID"
                });

                dropdownOptions.TryGetValue("PurposeCodeID", out var purposeOptions);
                dropdownOptions.TryGetValue("RepaymentMethodID", out var repaymentMethodOptions);
                dropdownOptions.TryGetValue("LineOfBusinessID", out var lineOfBusinessOptions);
                dropdownOptions.TryGetValue("LegalStatusID", out var legalStatusOptions);
                dropdownOptions.TryGetValue("HealthCodeID", out var healthCodeOptions);

                ViewData["PurposeOptions"] = purposeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["RepaymentMethodOptions"] = repaymentMethodOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["LineOfBusinessOptions"] = lineOfBusinessOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["LegalStatusOptions"] = legalStatusOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["HealthCodeOptions"] = healthCodeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Loan Maintenance");
                ViewData["PurposeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["RepaymentMethodOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["LineOfBusinessOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["LegalStatusOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["HealthCodeOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return View("~/Views/Loans/LoanMaintenance.cshtml");
        }

        [HttpPost]
        [Route("GetLoan")]
        public async Task<IActionResult> GetLoan([FromBody] GetLoanRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GETLOAN,
                    request
                );

                if (IsOldApiSuccess(result) || HasLoanRows(result))
                {
                    return Ok(new { success = true, data = result });
                }

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractOldApiMessage(result, "Loan details not found")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static bool IsOldApiSuccess(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object)
                return false;

            var responseCode = GetStringProperty(result, "ResponseCode");
            if (!IsSuccessCode(responseCode))
                return false;

            if (TryGetProperty(result, "Details", out var details) && details.ValueKind == JsonValueKind.Object)
            {
                var status = GetStringProperty(details, "Status");
                if (!string.IsNullOrWhiteSpace(status))
                    return IsSuccessCode(status);
            }

            return true;
        }

        private static bool HasLoanRows(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object)
                return false;

            if (HasRowsInNode(result))
                return true;

            if (TryGetProperty(result, "Details", out var details) && details.ValueKind == JsonValueKind.Object)
                return HasRowsInNode(details);

            return false;
        }

        private static bool HasRowsInNode(JsonElement node)
        {
            if (TryGetProperty(node, "Details01", out var details01) && details01.ValueKind == JsonValueKind.Array && details01.GetArrayLength() > 0)
                return true;

            if (TryGetProperty(node, "Details02", out var details02) && details02.ValueKind == JsonValueKind.Array && details02.GetArrayLength() > 0)
                return true;

            return TryGetProperty(node, "Details", out var details)
                && details.ValueKind == JsonValueKind.Array
                && details.GetArrayLength() > 0;
        }

        private static string ExtractOldApiMessage(JsonElement result, string fallback)
        {
            if (result.ValueKind != JsonValueKind.Object)
                return fallback;

            if (TryGetProperty(result, "Details", out var details) && details.ValueKind == JsonValueKind.Object)
            {
                var message = GetStringProperty(details, "Message");
                if (!string.IsNullOrWhiteSpace(message))
                    return message;

                var errorMessage = GetStringProperty(details, "ErrorMessage");
                if (!string.IsNullOrWhiteSpace(errorMessage))
                    return errorMessage;
            }

            var responseMessage = GetStringProperty(result, "ResponseMessage");
            return string.IsNullOrWhiteSpace(responseMessage) ? fallback : responseMessage;
        }

        private static bool IsSuccessCode(string? code)
        {
            return code == "00" || code == "000" || code == "0";
        }

        private static string? GetStringProperty(JsonElement source, string propertyName)
        {
            if (!TryGetProperty(source, propertyName, out var value))
                return null;

            return value.ValueKind == JsonValueKind.String
                ? value.GetString()
                : value.ToString();
        }

        private static bool TryGetProperty(JsonElement source, string propertyName, out JsonElement value)
        {
            if (source.ValueKind == JsonValueKind.Object)
            {
                if (source.TryGetProperty(propertyName, out value))
                    return true;

                var camel = char.ToLowerInvariant(propertyName[0]) + propertyName[1..];
                if (source.TryGetProperty(camel, out value))
                    return true;
            }

            value = default;
            return false;
        }

        [HttpPost]
        [Route("EditLoan")]
        public async Task<IActionResult> EditLoan([FromBody] EditLoanRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.EDITLOAN,
                    request
                );

                if (result?.ResponseCode == "00" && IsOldApiSuccess(result))
                {
                    return Ok(new { success = true, data = result, message = "Loan updated successfully" });
                }

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractOldApiMessage(result, "Failed to update loan")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating loan");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static bool IsOldApiSuccess(ResponseDetail<object>? result)
        {
            if (result == null || result.ResponseCode != "00")
                return false;

            var details = SerializeDetails(result.Details);
            if (details is null || details.Value.ValueKind != JsonValueKind.Object)
                return true;

            if (details.Value.TryGetProperty("Status", out var statusEl))
            {
                var status = statusEl.GetString();
                if (!string.IsNullOrWhiteSpace(status))
                    return status == "00" || status == "000" || status == "0";
            }

            return true;
        }

        private static bool HasRows(ResponseDetail<object>? result)
        {
            var details = SerializeDetails(result?.Details);
            return details is JsonElement detailsEl && detailsEl.ValueKind == JsonValueKind.Array && detailsEl.GetArrayLength() > 0;
        }

        private static string ExtractOldApiMessage(ResponseDetail<object>? result, string fallback)
        {
            if (result == null)
                return fallback;

            var details = SerializeDetails(result.Details);
            if (details is JsonElement detailsEl && detailsEl.ValueKind == JsonValueKind.Object)
            {
                if (detailsEl.TryGetProperty("Message", out var messageEl))
                {
                    var message = messageEl.GetString();
                    if (!string.IsNullOrWhiteSpace(message))
                        return message;
                }

                if (detailsEl.TryGetProperty("ErrorMessage", out var errorMessageEl))
                {
                    var errorMessage = errorMessageEl.GetString();
                    if (!string.IsNullOrWhiteSpace(errorMessage))
                        return errorMessage;
                }
            }

            return string.IsNullOrWhiteSpace(result.ResponseMessage) ? fallback : result.ResponseMessage;
        }

        private static JsonElement? SerializeDetails(object? details)
        {
            if (details == null)
                return null;

            return JsonSerializer.SerializeToElement(details);
        }
    }

    public class GetLoanRequest
    {
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? AccountID { get; set; }
        public string? LoanSeries { get; set; }
        public string? OperatorID { get; set; }
        public int? Direction { get; set; }
        public string? DirectionType { get; set; }
        public string? LoanRefNo { get; set; }
    }

    public class EditLoanRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public int? LoanSeries { get; set; }
        public int? LoanRefNo { get; set; }
        public string? PurposeCodeID { get; set; }
        public string? FundID { get; set; }
        public string? CreditOfficerID { get; set; }
        public string? HealthCodeID { get; set; }
        public string? RepaymentMethodID { get; set; }
        public string? RepaymentAccountID { get; set; }
        public int? SuspendInterest { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public int? NewRecord { get; set; }
        public string? BusinessLineID { get; set; }
        public string? LegalOfficer { get; set; }
        public string? LegalStatusID { get; set; }
    }
}
