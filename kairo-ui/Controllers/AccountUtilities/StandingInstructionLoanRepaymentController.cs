using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountUtilities
{
    [Route("AccountUtilities/StandingInstructionLoanRepayment")]
    public class StandingInstructionLoanRepaymentController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<StandingInstructionLoanRepaymentController> _logger;

        public StandingInstructionLoanRepaymentController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<StandingInstructionLoanRepaymentController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // INDEX - Load View with Dropdowns
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? entityId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["EntityId"] = entityId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(entityId)).ToString().ToLower();

            // Pass session branch/operator info to the view for JS to consume
            ViewData["BranchCode"] = HttpContext.Session.GetString("branch_code") ?? string.Empty;
            ViewData["BranchName"] = HttpContext.Session.GetString("branch_name") ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;

            return View("~/Views/AccountUtilities/_StandingInstructionLoanRepayment.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // DROPDOWN - Load system code options for dropdowns (client-side)
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("get-dropdown-options")]
        public async Task<IActionResult> GetDropdownOptions([FromQuery] string codeId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(codeId))
                    return BadRequest(new { success = false, message = "codeId is required" });

                var options = await _apiCachedService.GetSystemCodeOptionsAsync(codeId);

                var result = options.Select(o => new
                {
                    value = o.SubCodeID,
                    label = o.CodeDescription ?? o.SubCodeID
                });

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for {CodeId}", codeId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // GET - Fetch Standing Instruction Loan Repayment record
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get")]
        public async Task<IActionResult> Get([FromBody] StandingInstructionLoanRepaymentRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                // Inject session data
                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(requestData.OurBranchID))
                    requestData.OurBranchID = HttpContext.Session.GetString("branch_code");

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.GET_STANDING_INSTRUCTION_LOAN_REPAYMENT,
                    requestData
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting standing instruction loan repayment");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // CREATE / UPDATE - Save Standing Instruction Loan Repayment record
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("save")]
        public async Task<IActionResult> Save([FromBody] StandingInstructionLoanRepaymentRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                // Inject session data
                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(requestData.OurBranchID))
                    requestData.OurBranchID = HttpContext.Session.GetString("branch_code");

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.ADD_EDIT_STANDING_INSTRUCTION_LOAN_REPAYMENT,
                    requestData
                );

                return Ok(new { success = true, data = result, message = "Saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving standing instruction loan repayment");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // DELETE - Remove Standing Instruction Loan Repayment record
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("delete")]
        public async Task<IActionResult> Delete([FromBody] StandingInstructionLoanRepaymentRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(requestData.OurBranchID))
                    requestData.OurBranchID = HttpContext.Session.GetString("branch_code");

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.DELETE_STANDING_INSTRUCTION_LOAN_REPAYMENT,
                    requestData
                );

                return Ok(new { success = true, message = "Deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting standing instruction loan repayment");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // STOP - Stop a Standing Instruction
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("stop")]
        public async Task<IActionResult> Stop([FromBody] StandingInstructionLoanRepaymentRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                requestData.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(requestData.OurBranchID))
                    requestData.OurBranchID = HttpContext.Session.GetString("branch_code");

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.STOP_STANDING_INSTRUCTION_LOAN_REPAYMENT,
                    requestData
                );

                return Ok(new { success = true, message = "Standing instruction stopped successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping standing instruction loan repayment");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST DTO
    // ═══════════════════════════════════════════════════════════════════

    public class StandingInstructionLoanRepaymentRequest
    {
        // Context
        public string? ModuleID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }

        // Top Section: Header Fields
        public string? ReferenceNo { get; set; }
        public string? LoanID { get; set; }          // Loan Account ID
        public string? LoanAccountID { get; set; }   // Alias
        public string? RepaymentType { get; set; }   // SI Type dropdown
        public string? EffectiveDate { get; set; }

        // Savings Account Details
        public string? BankID { get; set; }
        public string? BranchID { get; set; }        // Savings account branch
        public string? AccountID { get; set; }       // Savings account ID

        // Standing Instruction Identity (used by backend)
        public string? StandingInstructionID { get; set; }

        // Action mode
        public string? ActionMode { get; set; }
    }
}
