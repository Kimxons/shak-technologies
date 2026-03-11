using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using CBS.Entities.Common;
using System.Text.Json;

namespace kairo_ui.Controllers.WorkFlowLoan
{
    [Route("WorkFlowLoan/LoanDisbursement")]
    public class LoanDisbursementController : Controller
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<LoanDisbursementController> _logger;

        public LoanDisbursementController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<LoanDisbursementController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // LEGACY ROUTE COMPATIBILITY
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("~/Workflow/Loans/frmLoanDisbursement.aspx")]
        public IActionResult LegacyLoanDisbursement(
            [FromQuery(Name = "ModuleID")] string? moduleId = null,
            [FromQuery(Name = "EntityID")] string? entityId = null,
            [FromQuery(Name = "RequestID")] string? requestId = null)
        {
            return RedirectToAction(nameof(LoanDisbursement), new
            {
                moduleId,
                entityId,
                requestId
            });
        }

        [HttpGet]
        [Route("~/Workflow/Loans/LoanDisbursement")]
        public IActionResult LegacyLoanDisbursementAlt(
            [FromQuery(Name = "ModuleID")] string? moduleId = null,
            [FromQuery(Name = "EntityID")] string? entityId = null,
            [FromQuery(Name = "RequestID")] string? requestId = null)
        {
            return RedirectToAction(nameof(LoanDisbursement), new
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
        [Route("LoanDisbursement")]
        public IActionResult LoanDisbursement(
            string? moduleId = null,
            string? entityId = null,
            string? requestId = null)
        {
            if (!_authService.IsAuthenticated())
            {
                return RedirectToAction("Index", "Login");
            }

            ViewData["Title"] = "Loan Disbursement";
            ViewData["ModuleId"] = moduleId ?? "7097";
            ViewData["EntityId"] = entityId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(entityId) || !string.IsNullOrWhiteSpace(requestId))
                .ToString().ToLower();

            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BranchName"] = HttpContext.Session.GetString("branch_name") ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;

            return View("~/Views/WorkFlowLoan/LoanDisbursement.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // API ENDPOINTS - ALL USE [HttpPost]
        // ═══════════════════════════════════════════════════════════════════

        /// <summary>
        /// Load Loan Disbursement Data - Uses p_GetLoanDisbursement
        /// </summary>
        [HttpPost]
        [Route("GetDisbursement")]
        public async Task<IActionResult> GetDisbursement([FromBody] GetDisbursementRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Getting disbursement for Account: {AccountId}", request.AccountID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.GETLOANDISBURSEMENT,
                    request
                );

                if ((result?.ResponseCode == "00" && IsOldApiSuccess(result)) || HasDisbursementRows(result))
                {
                    return Ok(new { success = true, data = result });
                }

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractOldApiMessage(result, "Disbursement data not found")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting disbursement");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Save Loan Disbursement - Uses p_AddLoanDisbursement
        /// </summary>
        [HttpPost]
        [Route("SaveDisbursement")]
        public async Task<IActionResult> SaveDisbursement([FromBody] SaveDisbursementRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Saving disbursement for Account: {AccountId}", request.AccountID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.SAVELOANDISBURSEMENT,
                    request
                );

                if (result?.ResponseCode == "00" && IsOldApiSuccess(result))
                {
                    return Ok(new { success = true, message = "Disbursement saved successfully", data = result.Details });
                }

                return Ok(new
                {
                    success = false,
                    data = result,
                    message = ExtractOldApiMessage(result, "Failed to save disbursement")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving disbursement");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get Loan Installments - Uses p_GetLoanInstallments
        /// </summary>
        [HttpPost]
        [Route("GetInstallments")]
        public async Task<IActionResult> GetInstallments([FromBody] GetInstallmentsRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Getting installments for Account: {AccountId}", request.AccountID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.GETLOANINSTALLMENTS,
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
                    message = ExtractOldApiMessage(result, "No installments found")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting installments");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get WF Charges - Uses p_GetWFCharges
        /// </summary>
        [HttpPost]
        [Route("GetCharges")]
        public async Task<IActionResult> GetCharges([FromBody] GetChargesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Getting charges for Application: {ApplicationId}", request.ApplicationID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.GETWFCHARGES,
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
                    message = ExtractOldApiMessage(result, "No charges found")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting charges");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Get Till Details - Uses pc_GetTillDetailPerTill
        /// </summary>
        [HttpPost]
        [Route("GetTillDetails")]
        public async Task<IActionResult> GetTillDetails([FromBody] GetTillDetailsRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Getting till details for Cashier: {CashierId}", request.CashierID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.GETTILLDETAILS,
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
                    message = ExtractOldApiMessage(result, "No till details found")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting till details");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // ERROR EXTRACTION HELPERS
        // ═══════════════════════════════════════════════════════════════════

        /// <summary>
        /// Check if the old API call was successful by examining nested Status field
        /// Old API returns ResponseCode="00" but may have Status field indicating actual proc failure
        /// </summary>
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

        private static bool HasDisbursementRows(ResponseDetail<object>? result)
        {
            var details = SerializeDetails(result?.Details);
            if (details is not JsonElement detailsEl || detailsEl.ValueKind != JsonValueKind.Array)
            {
                return false;
            }

            return detailsEl.GetArrayLength() > 0;
        }

        /// <summary>
        /// Extract error message from nested API response payload
        /// Old API wraps DB errors in Details/Status/Message; this method excavates them
        /// </summary>
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

        /// <summary>
        /// Convert arbitrary object to JsonElement for property inspection
        /// Needed because OldApiService returns Details as object, not JsonElement
        /// </summary>
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

    /// <summary>
    /// Request for getting disbursement data
    /// Maps to p_GetLoanDisbursement parameters
    /// </summary>
    public class GetDisbursementRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? OperatorID { get; set; }
    }

    /// <summary>
    /// Request for saving disbursement
    /// Maps to p_AddLoanDisbursement parameters
    /// </summary>
    public class SaveDisbursementRequest
    {
        public string? OurBranchID { get; set; }
        public decimal NetDisbAmount { get; set; }
        public string? CurrencyID { get; set; }
        public decimal ExchangeRate { get; set; }
        public decimal LocalAmount { get; set; }
        public string? ApplicationID { get; set; }
        public string? LoanSeries { get; set; }
        public int TillID { get; set; }
        public string? AccountTypeID { get; set; }
        public string? AccountID { get; set; }
        public string? ContraBranchID { get; set; }
        public string? ContraAccountID { get; set; }
        public string? ProductID { get; set; }
        public string? ChequeID { get; set; }
        public string? ReferenceNo { get; set; }
        public string? BeneficiaryName { get; set; }
        public string? Narration { get; set; }
        public string? DisbursementModeID { get; set; }
        public string? OperatedBy { get; set; }
        public string? TrxFlagID { get; set; }
        public string? TrxBatchID { get; set; }
        public string? SerialID { get; set; }
    }

    /// <summary>
    /// Request for getting installments
    /// Maps to p_GetLoanInstallments parameters
    /// </summary>
    public class GetInstallmentsRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? LoanSeries { get; set; }
    }

    /// <summary>
    /// Request for getting charges
    /// Maps to p_GetWFCharges parameters
    /// </summary>
    public class GetChargesRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
    }

    /// <summary>
    /// Request for getting till details
    /// Maps to pc_GetTillDetailPerTill parameters
    /// </summary>
    public class GetTillDetailsRequest
    {
        public string? CashierID { get; set; }
    }
}
