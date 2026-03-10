using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountUtilities
{
    [Route("AccountUtilities/StandingInstructionTransfer")]
    public class StandingInstructionTransferController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<StandingInstructionTransferController> _logger;

        public StandingInstructionTransferController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<StandingInstructionTransferController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // INDEX - Load View
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

            return View("~/Views/AccountUtilities/_StandingInstructionTransfer.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // DROPDOWN - Load system code options for dropdowns (client-side)
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("get-dropdown-options")]
        public async Task<IActionResult> GetDropdownOptions([FromQuery] string codeId, [FromQuery] string? valueField = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(codeId))
                    return BadRequest(new { success = false, message = "codeId is required" });

                var options = await _apiCachedService.GetSystemCodeOptionsAsync(codeId);

                var result = options.Select(o => new
                {
                    value = string.Equals(valueField, "ChargingCurrencyID", StringComparison.OrdinalIgnoreCase)
                        ? (o.ChargingCurrencyID ?? o.SubCodeID)
                        : o.SubCodeID,
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
        // GET - Fetch Standing Instruction Transfer record
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get")]
        public async Task<IActionResult> Get([FromBody] StandingInstructionTransferRequest requestData)
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
                    OldApiDBConstants.GET_STANDING_INSTRUCTION_TRANSFER,
                    requestData
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting standing instruction transfer");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // CREATE / UPDATE - Save Standing Instruction Transfer record
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("save")]
        public async Task<IActionResult> Save([FromBody] StandingInstructionTransferRequest requestData)
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
                    OldApiDBConstants.ADD_EDIT_STANDING_INSTRUCTION_TRANSFER,
                    requestData
                );

                return Ok(new { success = true, data = result, message = "Saved successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving standing instruction transfer");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // DELETE - Remove Standing Instruction Transfer record
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("delete")]
        public async Task<IActionResult> Delete([FromBody] StandingInstructionTransferRequest requestData)
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
                    OldApiDBConstants.DELETE_STANDING_INSTRUCTION_TRANSFER,
                    requestData
                );

                return Ok(new { success = true, message = "Deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting standing instruction transfer");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // STOP - Stop a Standing Instruction Transfer
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("stop")]
        public async Task<IActionResult> Stop([FromBody] StandingInstructionTransferRequest requestData)
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
                    OldApiDBConstants.STOP_STANDING_INSTRUCTION_TRANSFER,
                    requestData
                );

                return Ok(new { success = true, message = "Standing instruction stopped successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping standing instruction transfer");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // GET SIGNATORIES - Fetch account signatory records
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-signatories")]
        public async Task<IActionResult> GetSignatories([FromBody] SignatoryRequest requestData)
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
                    OldApiDBConstants.GET_ACCOUNT_SIGNATORIES,
                    requestData
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting account signatories");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // GET SIGNATORY IMAGE - Fetch signature/photo image data
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-signatory-image")]
        public async Task<IActionResult> GetSignatoryImage([FromBody] SignatoryImageRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.GET_SIGNATORY_IMAGE,
                    requestData
                );

                return Ok(new { success = true, data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting signatory image");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST DTO
    // ═══════════════════════════════════════════════════════════════════

    public class StandingInstructionTransferRequest
    {
        // Context
        public string? ModuleID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }

        // Account Details
        public string? AccountID { get; set; }         // Debit Account ID
        public string? BranchID { get; set; }          // Branch

        // Standing Instruction Identity
        public string? StandingInstructionID { get; set; }
        public string? ReferenceNo { get; set; }

        // SI Details
        public string? SIType { get; set; }            // SI Type dropdown
        public string? EffectiveDate { get; set; }

        // Transfer Details
        public string? TransferCurrencyID { get; set; }
        public string? AmountIn { get; set; }          // Transaction CurrencyID / Transfer CurrencyID
        public string? FixedAmount { get; set; }
        public string? ChargeRecovery { get; set; }

        // Frequency & Execution
        public string? TransferFrequency { get; set; }
        public string? NoOfExecution { get; set; }
        public string? RegularExecutionDay { get; set; }
        public string? FirstExecutionDate { get; set; }

        // Beneficiary Account Details
        public string? BeneficiaryBranchID { get; set; }
        public string? BeneficiaryAccountType { get; set; }
        public string? BeneficiaryAccountID { get; set; }

        // Action mode
        public string? ActionMode { get; set; }
    }

    public class SignatoryRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class SignatoryImageRequest
    {
        public int? SignID { get; set; }
        public int? PhotoID { get; set; }
        public int? DocumentID { get; set; }
    }
}
