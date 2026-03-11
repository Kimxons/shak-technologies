using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountUtilities
{
    [Route("AccountUtilities/api")]
    [ApiController] 
    public class StandingInstructionTypeController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<StandingInstructionTypeController> _logger;

        public StandingInstructionTypeController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<StandingInstructionTypeController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpPost("get-si-type")]
        public async Task<IActionResult> Get([FromBody] SITypeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var payload = new 
                {
                    BankID = "00", // Default as per original JS
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    SITypeID = request.SITypeID,
                    Direction = 0
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_SI_TYPES,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting SI Type");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("create-si-type")]
        public async Task<IActionResult> Create([FromBody] SITypeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var bankId = HttpContext.Session.GetString("bank_id")
                    ?? HttpContext.Session.GetString("bank_code")
                    ?? "00";

                request.Direction = 0; // Add/Edit direction

                var payload = new
                {
                    BankID = bankId,
                    CreatedBy = request.CreatedBy ?? request.OperatorID,
                    CreatedOn = request.CreatedOn,
                    ModifiedBy = request.ModifiedBy ?? request.OperatorID,
                    ModifiedOn = request.ModifiedOn,
                    SupervisedBy = request.SupervisedBy,
                    SITypeID = request.SITypeID ?? request.InstructionTypeID,
                    Description = request.Description,
                    SITrfTypeID = request.SITransferType,
                    NoOfRetries = request.NoOfRetries,
                    RetryAfterDays = request.RetryAfterDays,
                    FailedChargeTypeID = request.FailedChargeType,
                    IsFailureFreezeAmount = request.FreezeAmountOnFailure == "1"
                        || string.Equals(request.FreezeAmountOnFailure, "true", StringComparison.OrdinalIgnoreCase),
                    SuccessfulTrxID = request.SuccessfulTrxId,
                    SuccessfulNarration = request.SuccessfulNarration,
                    FailureTrxID = request.FailureTrxId,
                    FailureNarration = request.FailureNarration,
                    NewRecord = request.NewRecord ?? 1
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_EDIT_SI_TYPES,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating SI Type");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("update-si-type")]
        public async Task<IActionResult> Update([FromBody] SITypeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var bankId = HttpContext.Session.GetString("bank_id")
                    ?? HttpContext.Session.GetString("bank_code")
                    ?? "00";

                request.Direction = 0;

                var payload = new
                {
                    BankID = bankId,
                    CreatedBy = request.CreatedBy ?? request.OperatorID,
                    CreatedOn = request.CreatedOn,
                    ModifiedBy = request.ModifiedBy ?? request.OperatorID,
                    ModifiedOn = request.ModifiedOn,
                    SupervisedBy = request.SupervisedBy,
                    SITypeID = request.SITypeID ?? request.InstructionTypeID,
                    Description = request.Description,
                    SITrfTypeID = request.SITransferType,
                    NoOfRetries = request.NoOfRetries,
                    RetryAfterDays = request.RetryAfterDays,
                    FailedChargeTypeID = request.FailedChargeType,
                    IsFailureFreezeAmount = request.FreezeAmountOnFailure == "1"
                        || string.Equals(request.FreezeAmountOnFailure, "true", StringComparison.OrdinalIgnoreCase),
                    SuccessfulTrxID = request.SuccessfulTrxId,
                    SuccessfulNarration = request.SuccessfulNarration,
                    FailureTrxID = request.FailureTrxId,
                    FailureNarration = request.FailureNarration,
                    NewRecord = request.NewRecord ?? request.UpdateCount ?? 0
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_EDIT_SI_TYPES,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating SI Type");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("delete-si-type")]
        public async Task<IActionResult> Delete([FromBody] SITypeRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var bankId = HttpContext.Session.GetString("bank_id")
                    ?? HttpContext.Session.GetString("bank_code")
                    ?? "00";

                var payload = new 
                {
                    BankID = bankId,
                    SITypeID = request.SITypeID,
                    NewRecord = request.NewRecord ?? request.UpdateCount ?? 0
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.DELETE_SI_TYPES,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting SI Type");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }

    public class SITypeRequest
    {
        public string? BankID { get; set; }
        public string? SITypeID { get; set; }
        public string? InstructionTypeID { get; set; }

        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? CreatedBy { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public DateTime? ModifiedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public int? NewRecord { get; set; }
        public int? UpdateCount { get; set; }
        public int Direction { get; set; }

        // Form Fields
        public string? Description { get; set; }
        public string? SITransferType { get; set; }
        public string? NoOfRetries { get; set; }
        public string? RetryAfterDays { get; set; }
        public string? FailedChargeType { get; set; }
        public string? FreezeAmountOnFailure { get; set; }
        public string? SuccessfulTrxId { get; set; }
        public string? SuccessfulNarration { get; set; }
        public string? FailureTrxId { get; set; }
        public string? FailureNarration { get; set; }
    }
}
