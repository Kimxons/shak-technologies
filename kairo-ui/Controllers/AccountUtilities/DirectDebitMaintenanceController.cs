using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountUtilities
{
    [Route("AccountUtilities/api")]
    [ApiController] 
    public class DirectDebitMaintenanceController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<DirectDebitMaintenanceController> _logger;

        public DirectDebitMaintenanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<DirectDebitMaintenanceController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [HttpPost("get-direct-debit-maintenance")]
        public async Task<IActionResult> Get([FromBody] DirectDebitRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                // p_GetDDTransfer expects SIID, ReferenceNo, OperatorID, OurBranchID, Direction
                var payload = new 
                {
                    OurBranchID = request.OurBranchID,
                    SIID = request.StandingInstructionID ?? request.SearchKey,
                    ReferenceNo = 0,
                    OperatorID = request.OperatorID,
                    Direction = 0
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.GET_DIRECT_DEBIT_MAINTENANCE,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting direct debit maintenance");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("create-direct-debit-maintenance")]
        public async Task<IActionResult> Create([FromBody] DirectDebitRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = request.BranchId ?? HttpContext.Session.GetString("branch_code");

                request.Direction = 0; // Add/Edit direction

                var payload = BuildSavePayload(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_EDIT_DIRECT_DEBIT_MAINTENANCE,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating direct debit maintenance");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("update-direct-debit-maintenance")]
        public async Task<IActionResult> Update([FromBody] DirectDebitRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = request.BranchId ?? HttpContext.Session.GetString("branch_code");

                request.Direction = 0;

                var payload = BuildSavePayload(request);

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_EDIT_DIRECT_DEBIT_MAINTENANCE,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating direct debit maintenance");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("delete-direct-debit-maintenance")]
        public async Task<IActionResult> Delete([FromBody] DirectDebitRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var siId = request.StandingInstructionID ?? request.SearchKey ?? request.DirectDebitInstructionID;

                var payload = new 
                {
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    SIID = siId
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.DELETE_DIRECT_DEBIT_MAINTENANCE,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting direct debit maintenance");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("stop-direct-debit-maintenance")]
        public async Task<IActionResult> Stop([FromBody] DirectDebitRequest request)
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
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    DirectDebitInstructionID = request.StandingInstructionID ?? request.SearchKey
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.STOP_DIRECT_DEBIT_MAINTENANCE,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error stopping direct debit maintenance");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("release-direct-debit-lock")]
        public async Task<IActionResult> ReleaseLock([FromBody] DirectDebitRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var siId = request.StandingInstructionID ?? request.SearchKey ?? request.DirectDebitInstructionID;
                var payload = new
                {
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    ModuleID = request.ModuleID ?? 3079,
                    LockModuleID = request.LockModuleID ?? 3079,
                    PKKey = request.PKKey ?? $"[OurBranchID:{request.OurBranchID}][SIID:{siId}]"
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.RELEASE_RECORD_LOCK,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error releasing direct debit lock");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("add-direct-debit-lock")]
        public async Task<IActionResult> AddLock([FromBody] DirectDebitRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                request.OperatorID = HttpContext.Session.GetString("user_name");
                if (string.IsNullOrEmpty(request.OurBranchID))
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                var siId = request.StandingInstructionID ?? request.SearchKey ?? request.DirectDebitInstructionID;
                var payload = new
                {
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    ModuleID = request.ModuleID ?? 3079,
                    LockModuleID = request.LockModuleID ?? 3079,
                    PKKey = request.PKKey ?? $"[OurBranchID:{request.OurBranchID}][SIID:{siId}]"
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "OldApi",
                    OldApiDBConstants.ADD_RECORD_LOCK,
                    payload
                );

                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding direct debit lock");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private static object BuildSavePayload(DirectDebitRequest request)
        {
            var branchId = request.OurBranchID ?? request.BranchId;
            var siId = request.DirectDebitInstructionID ?? request.StandingInstructionID ?? request.SearchKey;
            var debitAccountId = request.DebitAccountID ?? request.AccountID;
            var currencyId = request.TrfCurrencyID ?? request.TransactionCurrencyID;
            var amount = request.Amount ?? request.FixedAmount;
            var amountTypeId = string.IsNullOrWhiteSpace(request.AmountTypeID) ? "T" : request.AmountTypeID;
            var frequencyId = request.TrfFrequencyID ?? request.TransferFrequency;
            var executionCount = request.NoOfExecutions ?? request.NoOfExecution;
            var statusId = request.SIStatusID ?? request.StandingInstructionStatus;
            var chargeTypeId = request.ChargeTypeID ?? request.ChargeRecovery;
            var creditAccountBankId = request.CreditAccountBankID ?? request.BBankID ?? request.BankID;
            var creditAccountBranchId = request.CreditAccountBranchID ?? request.BBranchID ?? request.ContraBranchID;
            var creditAccountId = request.CreditAccountID ?? request.ContraAccountID;
            var createdBy = request.CreatedBy ?? request.OperatorID;
            var reference = request.Reference ?? request.Remarks;
            var effectiveDate = NormalizeSmallDate(request.EffectiveDate);
            var firstExecutionDate = NormalizeSmallDate(request.FirstExecutionDate);
            var lastExecutionDate = NormalizeSmallDate(request.LastExecutionDate);
            var valueDate = NormalizeSmallDate(request.ValueDate);

            return new
            {
                OurBranchID = branchId,
                SIID = siId,
                ReferenceNo = request.ReferenceNo,
                SITypeID = request.SITypeID ?? request.DirectDebitType,
                EffectiveDate = effectiveDate,
                DebitAccountID = debitAccountId,
                TrfCurrencyID = currencyId,
                AmountTypeID = amountTypeId,
                Amount = amount,
                TrfFrequencyID = frequencyId,
                NoOfExecutions = executionCount,
                FirstExecutionDate = firstExecutionDate,
                LastExecutionDate = lastExecutionDate,
                ChargeTypeID = chargeTypeId,
                CreditAccountBranchID = creditAccountBranchId,
                CreditAccountBankID = creditAccountBankId,
                CreditAccountID = creditAccountId,
                SIStatusID = statusId,
                OrigCode = request.OrigCode ?? request.OriginatorCode,
                OrigRef = request.OrigRef ?? request.OriginatorRef,
                Policy1 = request.Policy1 ?? request.PolicyNumber1,
                Policy2 = request.Policy2 ?? request.PolicyNumber2,
                CreatedBy = createdBy,
                VoucherNo = request.VoucherNo,
                Reference = reference,
                ReturnCode = request.ReturnCode,
                CreatedOn = request.CreatedOn,
                SupervisedBy = request.SupervisedBy,
                BBankID = request.BBankID ?? request.BankID,
                BBranchID = request.BBranchID ?? request.ContraBranchID,
                ValueDate = valueDate
            };
        }

        private static string? NormalizeSmallDate(string? rawDate)
        {
            if (string.IsNullOrWhiteSpace(rawDate))
                return null;

            if (!DateTime.TryParse(rawDate, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsedDate) &&
                !DateTime.TryParse(rawDate, CultureInfo.CurrentCulture, DateTimeStyles.AllowWhiteSpaces, out parsedDate))
            {
                return null;
            }

            if (parsedDate < new DateTime(1900, 1, 1) || parsedDate > new DateTime(2079, 6, 6))
                return null;

            return parsedDate.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        }
    }

    public class DirectDebitRequest
    {
        public string? SearchKey { get; set; }
        public string? StandingInstructionID { get; set; }
        public string? Oper { get; set; }

        public string? BranchId { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? DirectDebitInstructionID { get; set; }
        public int Direction { get; set; }

        // Form Fields
        public string? DirectDebitType { get; set; }
        public string? SITypeID { get; set; }
        public string? AccountID { get; set; }
        public string? DebitAccountID { get; set; }
        public string? ReferenceNo { get; set; }
        public string? TransactionCurrencyID { get; set; }
        public string? TrfCurrencyID { get; set; }
        public string? FixedAmount { get; set; }
        public string? Amount { get; set; }
        public string? AmountTypeID { get; set; }
        public string? EffectiveDate { get; set; }
        public string? TransferFrequency { get; set; }
        public string? TrfFrequencyID { get; set; }
        public string? NoOfExecution { get; set; }
        public string? NoOfExecutions { get; set; }
        public string? FirstExecutionDate { get; set; }
        public string? LastExecutionDate { get; set; }
        public string? ValueDate { get; set; }
        public string? StandingInstructionStatus { get; set; }
        public string? SIStatusID { get; set; }
        public string? ChargeRecovery { get; set; }
        public string? ChargeTypeID { get; set; }
        public string? BankID { get; set; }
        public string? BBankID { get; set; }
        public string? ContraBranchID { get; set; }
        public string? BBranchID { get; set; }
        public string? ContraAccountID { get; set; }
        public string? CreditAccountBankID { get; set; }
        public string? CreditAccountBranchID { get; set; }
        public string? CreditAccountID { get; set; }
        public string? OriginatorCode { get; set; }
        public string? OrigCode { get; set; }
        public string? OriginatorRef { get; set; }
        public string? OrigRef { get; set; }
        public string? PolicyNumber1 { get; set; }
        public string? Policy1 { get; set; }
        public string? PolicyNumber2 { get; set; }
        public string? Policy2 { get; set; }
        public string? ReturnCode { get; set; }
        public string? CreatedBy { get; set; }
        public string? VoucherNo { get; set; }
        public string? Reference { get; set; }
        public DateTime? CreatedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public string? Remarks { get; set; }
        public int? ModuleID { get; set; }
        public int? LockModuleID { get; set; }
        public string? PKKey { get; set; }
    }
}
