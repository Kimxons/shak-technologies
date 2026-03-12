using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using CBS.Entities.Common;
using System.Text.Json;

namespace kairo_ui.Controllers.WorkFlowLoan
{
    [Route("WorkFlowLoan/LoanSanction")]
    public class LoanSanctionController : Controller
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<LoanSanctionController> _logger;

        public LoanSanctionController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<LoanSanctionController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // LEGACY ROUTE COMPATIBILITY
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("~/Workflow/Loans/frmWFLoanSanction.aspx")]
        public IActionResult LegacyLoanSanction(
            [FromQuery(Name = "ModuleID")] string? moduleId = null,
            [FromQuery(Name = "EntityID")] string? entityId = null,
            [FromQuery(Name = "RequestID")] string? requestId = null)
        {
            return RedirectToAction(nameof(LoanSanction), new
            {
                moduleId,
                entityId,
                requestId
            });
        }

        [HttpGet]
        [Route("~/Workflow/Loans/WFLoanSanction")]
        public IActionResult LegacyLoanSanctionAlt(
            [FromQuery(Name = "ModuleID")] string? moduleId = null,
            [FromQuery(Name = "EntityID")] string? entityId = null,
            [FromQuery(Name = "RequestID")] string? requestId = null)
        {
            return RedirectToAction(nameof(LoanSanction), new
            {
                moduleId,
                entityId,
                requestId
            });
        }

        // ═══════════════════════════════════════════════════════════════════
        // MAIN VIEW
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("")]
        [Route("LoanSanction")]
        public async Task<IActionResult> LoanSanction(
            string? moduleId = null,
            string? entityId = null,
            string? requestId = null)
        {
            if (!_authService.IsAuthenticated())
            {
                return RedirectToAction("Index", "Login");
            }

            ViewData["Title"] = "Loan Sanction";
            ViewData["ModuleId"] = moduleId ?? "7065";
            ViewData["EntityId"] = entityId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(entityId) || !string.IsNullOrWhiteSpace(requestId))
                .ToString().ToLower();

            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BranchName"] = HttpContext.Session.GetString("branch_name") ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "ModeOfDisbursement",
                    "TemplateSchedule",
                    "InterestRateType"
                });

                dropdownOptions.TryGetValue("ModeOfDisbursement", out var modeOfDisbursementOptions);
                dropdownOptions.TryGetValue("TemplateSchedule", out var templateScheduleOptions);
                dropdownOptions.TryGetValue("InterestRateType", out var interestRateTypeOptions);

                ViewData["ModeOfDisbursementOptions"] = modeOfDisbursementOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["TemplateScheduleOptions"] = templateScheduleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["InterestRateTypeOptions"] = interestRateTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Loan Sanction");
                ViewData["ModeOfDisbursementOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["TemplateScheduleOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["InterestRateTypeOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return View("~/Views/WorkFlowLoan/LoanSanction.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // API ENDPOINTS - ALL USE [HttpPost]
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("GetSanctionDetails")]
        public async Task<IActionResult> GetSanctionDetails([FromBody] GetSanctionRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Getting sanction details for Application: {ApplicationId}", request.ApplicationID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.GETLOANSANCTION,
                    request
                );

                if (result?.ResponseCode == "00" && IsOldApiSuccess(result))
                {
                    return Ok(new { success = true, data = result });
                }

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractOldApiMessage(result, "Sanction details not found")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting sanction details");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("SaveSanction")]
        public async Task<IActionResult> SaveSanction([FromBody] SaveSanctionRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Saving sanction for Application: {ApplicationId}", request.ApplicationID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.SAVELOANSANCTION,
                    request
                );

                if (result?.ResponseCode == "00" && IsOldApiSuccess(result))
                {
                    return Ok(new { success = true, message = "Sanction saved successfully", data = result.Details });
                }

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractOldApiMessage(result, "Failed to save sanction")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving sanction");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("DeviateApplication")]
        public async Task<IActionResult> DeviateApplication([FromBody] DeviateRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Deviating application: {ApplicationId}", request.ApplicationID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.DEVIATEAPPLICATION,
                    request
                );

                if (result?.ResponseCode == "00" && IsOldApiSuccess(result))
                {
                    return Ok(new { success = true, message = "Application deviated successfully" });
                }

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractOldApiMessage(result, "Failed to deviate application")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deviating application");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static bool IsOldApiSuccess(ResponseDetail<object>? result)
        {
            if (result == null)
            {
                return false;
            }

            if (result.ResponseCode != "00")
            {
                return false;
            }

            var details = SerializeDetails(result.Details);
            if (details is null || details.Value.ValueKind != JsonValueKind.Object)
            {
                return true;
            }

            if (details.Value.TryGetProperty("Status", out var statusEl))
            {
                var status = statusEl.GetString();
                if (!string.IsNullOrWhiteSpace(status))
                {
                    return status == "00" || status == "000" || status == "0";
                }
            }

            return true;
        }

        private static string ExtractOldApiMessage(ResponseDetail<object>? result, string fallback)
        {
            if (result == null)
            {
                return fallback;
            }

            var details = SerializeDetails(result.Details);
            if (details is JsonElement detailsEl && detailsEl.ValueKind == JsonValueKind.Object)
            {
                if (detailsEl.TryGetProperty("Message", out var messageEl))
                {
                    var message = messageEl.GetString();
                    if (!string.IsNullOrWhiteSpace(message))
                    {
                        return message;
                    }
                }

                if (detailsEl.TryGetProperty("ErrorMessage", out var errorMessageEl))
                {
                    var errorMessage = errorMessageEl.GetString();
                    if (!string.IsNullOrWhiteSpace(errorMessage))
                    {
                        return errorMessage;
                    }
                }
            }

            return string.IsNullOrWhiteSpace(result.ResponseMessage) ? fallback : result.ResponseMessage;
        }

        private static JsonElement? SerializeDetails(object? details)
        {
            if (details == null)
            {
                return null;
            }

            return JsonSerializer.SerializeToElement(details);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST/RESPONSE DTOs
    // ═══════════════════════════════════════════════════════════════════

    public class GetSanctionRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? OperatorID { get; set; }
        public int Direction { get; set; } = 0;
        public string? LogInBranchID { get; set; }
    }

    public class SaveSanctionRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? OperatorID { get; set; }
        public decimal ApprovedAmount { get; set; }
        public string? ModeOfDisbursement { get; set; }
        public int NoOfDisbursements { get; set; }
        public string? FirstDisbursementDate { get; set; }
        public bool CollectInterestDuringGrace { get; set; }
        public int RepaymentTerm { get; set; }
        public int GracePeriod { get; set; }
        public string? InstallmentStartDate { get; set; }
        public string? TemplateSchedule { get; set; }
        public decimal MarkingRate { get; set; }
        public string? InterestRateType { get; set; }
        public decimal InterestRate { get; set; }
        public decimal BaseRate { get; set; }
        public string? MainRepaymentAccountId { get; set; }
        public string? ApprovedBy { get; set; }
        public string? ApprovedDate { get; set; }
    }

    public class DeviateRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? OperatorID { get; set; }
        public string? DeviationStage { get; set; }
        public string? DeviationReason { get; set; }
    }
}
