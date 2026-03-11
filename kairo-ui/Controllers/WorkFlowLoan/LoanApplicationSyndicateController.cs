using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.WorkFlowLoan
{
    [Route("WorkFlowLoan/LoanApplicationSyndicate")]
    public class LoanApplicationSyndicateController : Controller
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<LoanApplicationSyndicateController> _logger;

        public LoanApplicationSyndicateController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<LoanApplicationSyndicateController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        [HttpGet]
        [Route("~/Workflow/Loans/frmWFLoanApplicationSyndicate.aspx")]
        public IActionResult LegacyLoanApplicationSyndicate(
            [FromQuery(Name = "ModuleID")] string? moduleId = null,
            [FromQuery(Name = "EntityID")] string? entityId = null,
            [FromQuery(Name = "RequestID")] string? requestId = null)
        {
            return RedirectToAction(nameof(LoanApplicationSyndicate), new
            {
                moduleId,
                entityId,
                requestId
            });
        }

        [HttpGet]
        [Route("")]
        [Route("LoanApplicationSyndicate")]
        public async Task<IActionResult> LoanApplicationSyndicate(
            string? moduleId = null,
            string? entityId = null,
            string? requestId = null)
        {
            if (!_authService.IsAuthenticated())
            {
                return RedirectToAction("Index", "Login");
            }

            ViewData["Title"] = "Loan Application Syndicate";
            ViewData["ModuleId"] = moduleId ?? string.Empty;
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
                    "PurposeCodeID",
                    "BusinessLineID",
                    "LocationID",
                    "BusinessStatus",
                    "StartUpType",
                    "LimitTypeID"
                });

                dropdownOptions.TryGetValue("PurposeCodeID", out var purposeOptions);
                dropdownOptions.TryGetValue("BusinessLineID", out var businessLineOptions);
                dropdownOptions.TryGetValue("LocationID", out var businessLocationOptions);
                dropdownOptions.TryGetValue("BusinessStatus", out var businessStatusOptions);
                dropdownOptions.TryGetValue("StartUpType", out var startupCapitalOptions);
                dropdownOptions.TryGetValue("LimitTypeID", out var loanLimitTypeOptions);

                ViewData["PurposeOptions"] = purposeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["BusinessLineOptions"] = businessLineOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["BusinessLocationOptions"] = businessLocationOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["BusinessStatusOptions"] = businessStatusOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["StartupCapitalOptions"] = startupCapitalOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["LoanLimitTypeOptions"] = loanLimitTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Loan Application Syndicate");
                ViewData["PurposeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["BusinessLineOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["BusinessLocationOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["BusinessStatusOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["StartupCapitalOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["LoanLimitTypeOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return View("~/Views/WorkFlowLoan/LoanApplicationSyndicate.cshtml");
        }

        [HttpPost]
        [Route("get")]
        public async Task<IActionResult> Get([FromBody] LoanApplicationSyndicateGetRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                ApplySessionDefaults(requestData);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_WF_LOAN_BANK_SYNDICATE,
                    requestData);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting loan application syndicate data");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("save")]
        public async Task<IActionResult> Save([FromBody] LoanApplicationSyndicateSaveRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                ApplySessionDefaults(requestData);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_WF_LOAN_APPLICATIONS,
                    requestData);

                if (!IsOldApiSuccess(result))
                {
                    return Ok(new
                    {
                        success = false,
                        data = result,
                        message = ExtractOldApiMessage(result, "Save failed")
                    });
                }

                return Ok(new { success = true, data = result, message = "Saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving loan application syndicate");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("save-syndicate")]
        public async Task<IActionResult> SaveSyndicate([FromBody] LoanBankSyndicateSaveRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                ApplySessionDefaults(requestData);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_WF_LOAN_BANK_SYNDICATE,
                    requestData);

                if (!IsOldApiSuccess(result))
                {
                    return Ok(new
                    {
                        success = false,
                        data = result,
                        message = ExtractOldApiMessage(result, "Syndicate save failed")
                    });
                }

                return Ok(new { success = true, data = result, message = "Saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving loan bank syndicate details");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("delete")]
        public async Task<IActionResult> Delete([FromBody] LoanApplicationSyndicateDeleteRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                ApplySessionDefaults(requestData);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.DELETE_WF_LOAN_APPLICATIONS,
                    requestData);

                return Ok(new { success = true, data = result, message = "Deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting loan application syndicate");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("get-client-details")]
        public async Task<IActionResult> GetClientDetails([FromBody] ClientDetailsRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                ApplySessionDefaults(requestData);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_CLIENT_MIN_DETAILS,
                    requestData);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting client details");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost]
        [Route("get-product-details")]
        public async Task<IActionResult> GetProductDetails([FromBody] ProductDetailsRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                ApplySessionDefaults(requestData);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_WF_PRODUCT_DETAILS,
                    requestData);

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting product details");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private void ApplySessionDefaults(LoanApplicationSyndicateGetRequest requestData)
        {
            requestData.OperatorID ??= HttpContext.Session.GetString("user_name") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            }
        }

        private void ApplySessionDefaults(LoanApplicationSyndicateDeleteRequest requestData)
        {
            requestData.OperatorID ??= HttpContext.Session.GetString("user_name") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            }
        }

        private void ApplySessionDefaults(LoanApplicationSyndicateSaveRequest requestData)
        {
            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            }

            var operatorId = HttpContext.Session.GetString("user_name") ?? string.Empty;
            requestData.CreatedBy ??= operatorId;
            requestData.ModifiedBy ??= operatorId;
        }

        private void ApplySessionDefaults(LoanBankSyndicateSaveRequest requestData)
        {
            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            }

            requestData.CreatedBy ??= HttpContext.Session.GetString("user_name") ?? string.Empty;
        }

        private void ApplySessionDefaults(ClientDetailsRequest requestData)
        {
            requestData.OperatorID ??= HttpContext.Session.GetString("user_name") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            }
        }

        private void ApplySessionDefaults(ProductDetailsRequest requestData)
        {
            requestData.OperatorID ??= HttpContext.Session.GetString("user_name") ?? string.Empty;
            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            }
        }

        private static bool IsOldApiSuccess(JsonElement result)
        {
            if (result.ValueKind != JsonValueKind.Object)
            {
                return true;
            }

            if (result.TryGetProperty("Status", out var statusEl))
            {
                var status = statusEl.GetString();
                if (!string.IsNullOrWhiteSpace(status))
                {
                    return status == "00" || status == "000" || status == "0";
                }
            }

            return true;
        }

        private static string ExtractOldApiMessage(JsonElement result, string fallback)
        {
            if (result.ValueKind != JsonValueKind.Object)
            {
                return fallback;
            }

            if (result.TryGetProperty("Message", out var messageEl))
            {
                var message = messageEl.GetString();
                if (!string.IsNullOrWhiteSpace(message))
                {
                    return message;
                }
            }

            if (result.TryGetProperty("ErrorMessage", out var errorMessageEl))
            {
                var message = errorMessageEl.GetString();
                if (!string.IsNullOrWhiteSpace(message))
                {
                    return message;
                }
            }

            return fallback;
        }
    }

    public class LoanApplicationSyndicateGetRequest
    {
        public string? ModuleID { get; set; }
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class LoanApplicationSyndicateSaveRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? ApplicationDate { get; set; }
        public string? WFAdvTypeID { get; set; }
        public int? IsExistingClient { get; set; }
        public string? ClientID { get; set; }
        public string? ProductID { get; set; }
        public string? RepaymentAccountID { get; set; }
        public string? PurposeCodeID { get; set; }
        public string? CreditOfficerID { get; set; }
        public string? SalesOfficerID { get; set; }
        public decimal? LoanAmount { get; set; }
        public int? LoanTerm { get; set; }
        public string? LoanPeriodID { get; set; }
        public string? DisbursementDate { get; set; }
        public string? BusinessLineID { get; set; }
        public string? AccountClassID { get; set; }
        public string? FileNumber { get; set; }
        public decimal? InterestRate { get; set; }
        public string? BusinessDetails { get; set; }
        public decimal? CommissionRate { get; set; }
        public decimal? TaxRate { get; set; }
        public decimal? EffectiveRate { get; set; }
        public string? Penalty { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public string? LoanTypeID { get; set; }
        public int? UpdateCount { get; set; }
        public decimal? ProductEffective { get; set; }
        public string? DonorID { get; set; }
        public string? GroupID { get; set; }
        public string? SubGroupID { get; set; }
        public string? LoanSchemeID { get; set; }
        public int? IsOutPutRequired { get; set; }
    }

    public class LoanBankSyndicateSaveRequest
    {
        public string? DetailRecords { get; set; }
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public int? UpdateCount { get; set; }
    }

    public class LoanBankSyndicateDetail
    {
        public string? BankID { get; set; }
        public decimal? Percentage { get; set; }
    }

    public class LoanApplicationSyndicateDeleteRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationId { get; set; }
        public string? OperatorID { get; set; }
        public int? UpdateCount { get; set; }
    }

    public class ClientDetailsRequest
    {
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class ProductDetailsRequest
    {
        public string? OurBranchID { get; set; }
        public string? WFAdvTypeID { get; set; }
        public string? ProductID { get; set; }
        public string? OperatorID { get; set; }
    }
}
