using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("GroupLoanReversal")]
    [Route("MicroFinance/GroupLoanReversal")]
    [Route("CenterLoanDisbursementReversal")]
    public class CenterLoanDisbursementReversalController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<CenterLoanDisbursementReversalController> _logger;

        public CenterLoanDisbursementReversalController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<CenterLoanDisbursementReversalController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // MAIN PAGE - Full Page View (for direct navigation)
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("")]
        public async Task<IActionResult> CenterLoanDisbursementReversalPage(string? moduleId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            await PopulateViewDataAsync(moduleId);
            return View("~/Views/MicroFinance/CenterLoanDisbursementReversal.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // INDEX - Load View (for modal/iframe)
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            await PopulateViewDataAsync(moduleId);
            return View("~/Views/MicroFinance/CenterLoanDisbursementReversal.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // LEGACY MENU URL - Redirect old WebForms URL to new MVC route
        // LegacyMenuUrl: MicroFinance/frmGroupLoanReversal.aspx
        // NewMenuUrl: /GroupLoanReversal/Index
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("/MicroFinance/frmGroupLoanReversal.aspx")]
        public IActionResult LegacyMenuRedirect()
        {
            return Redirect("/GroupLoanReversal/Index");
        }

        private async Task PopulateViewDataAsync(string? moduleId)
        {
            // Legacy module uses 5092 for posting the reversal transaction.
            ViewData["ModuleId"] = string.IsNullOrWhiteSpace(moduleId) ? "5092" : moduleId;

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "LoanReversalReasonID"
                });

                dropdownOptions.TryGetValue("LoanReversalReasonID", out var reasonOptions);
                ViewData["LoanReversalReasonOptions"] = reasonOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Center Loan Disbursement Reversal");
                ViewData["LoanReversalReasonOptions"] = Enumerable.Empty<SelectListItem>();
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // ENDPOINTS - JsonElement passthrough (preserves API field casing)
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName,
                    OldApiDBConstants.GET_GROUP_LOAN_REVERSALS,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting group loan reversals");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("save")]
        public async Task<IActionResult> Save([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName,
                    OldApiDBConstants.ADD_LOAN_REVERSAL_TRX,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving loan reversal transaction");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("validate")]
        public async Task<IActionResult> Validate([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName,
                    OldApiDBConstants.VALIDATE_ID_DESCRIPTION,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating ID");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
