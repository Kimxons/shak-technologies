using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
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

                // Note: p_GetDirectDebitMaintenance takes DirectDebitInstructionID
                var payload = new 
                {
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    DirectDebitInstructionID = request.StandingInstructionID ?? request.SearchKey
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                request.Direction = 0; // Add/Edit direction

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.ADD_EDIT_DIRECT_DEBIT_MAINTENANCE,
                    request
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
                    request.OurBranchID = HttpContext.Session.GetString("branch_code");

                request.Direction = 0;

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    OldApiDBConstants.ADD_EDIT_DIRECT_DEBIT_MAINTENANCE,
                    request
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

                var payload = new 
                {
                    OurBranchID = request.OurBranchID,
                    OperatorID = request.OperatorID,
                    DirectDebitInstructionID = request.StandingInstructionID ?? request.SearchKey
                };

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
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
                    "AccountManagementApi",
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
    }

    public class DirectDebitRequest
    {
        public string? SearchKey { get; set; }
        public string? StandingInstructionID { get; set; }
        public string? Oper { get; set; }

        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        public string? DirectDebitInstructionID { get; set; }
        public int Direction { get; set; }

        // Form Fields
        public string? DirectDebitType { get; set; }
        public string? AccountID { get; set; }
        public string? ReferenceNo { get; set; }
        public string? TransactionCurrencyID { get; set; }
        public string? FixedAmount { get; set; }
        public string? EffectiveDate { get; set; }
        public string? TransferFrequency { get; set; }
        public string? NoOfExecution { get; set; }
        public string? FirstExecutionDate { get; set; }
        public string? LastExecutionDate { get; set; }
        public string? ValueDate { get; set; }
        public string? StandingInstructionStatus { get; set; }
        public string? ChargeRecovery { get; set; }
        public string? BankID { get; set; }
        public string? ContraBranchID { get; set; }
        public string? ContraAccountID { get; set; }
        public string? OriginatorCode { get; set; }
        public string? Remarks { get; set; }
    }
}
