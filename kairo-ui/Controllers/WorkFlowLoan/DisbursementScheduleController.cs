using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using CBS.Entities.Common;

namespace kairo_ui.Controllers.WorkFlowLoan
{
    [Route("WorkFlowLoan/LoanSanction/DisbursementSchedule")]
    public class DisbursementScheduleController : Controller
    {
        private const string OldApiName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<DisbursementScheduleController> _logger;

        public DisbursementScheduleController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<DisbursementScheduleController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // MAIN VIEW - Disbursement Schedule Submodule (Loaded in iframe)
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public IActionResult Index(
            string? branchId = null,
            string? applicationId = null,
            string? accountId = null,
            string? loanSeries = null)
        {
            if (!_authService.IsAuthenticated())
            {
                return Unauthorized(new { success = false, message = "Not authenticated" });
            }

            ViewData["Title"] = "Disbursement Schedule";
            ViewData["BranchId"] = branchId ?? string.Empty;
            ViewData["ApplicationId"] = applicationId ?? string.Empty;
            ViewData["AccountId"] = accountId ?? string.Empty;
            ViewData["LoanSeries"] = loanSeries ?? string.Empty;
            ViewData["OperatorId"] = HttpContext.Session.GetString("user_name") ?? string.Empty;

            return PartialView("~/Views/WorkFlowLoan/_DisbursementSchedule.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // API ENDPOINTS - ALL USE [HttpPost]
        // ═══════════════════════════════════════════════════════════════════

        /// <summary>
        /// Load Disbursement Schedules - Uses p_GetWFLoanDisbSchedules
        /// </summary>
        [HttpPost]
        [Route("GetSchedules")]
        public async Task<IActionResult> GetSchedules([FromBody] GetSchedulesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Getting disbursement schedules for Application: {ApplicationId}", request.ApplicationID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.GETDISBURSEMENTSCHEDULES,
                    request
                );

                if (result?.ResponseCode == "00")
                {
                    return Ok(new { success = true, data = result });
                }

                return Ok(new { success = false, message = result?.ResponseMessage ?? "No schedules found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting disbursement schedules");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Save/Update Disbursement Schedules - Uses p_AddEditWFLoanDisbSchedules
        /// </summary>
        [HttpPost]
        [Route("SaveSchedules")]
        public async Task<IActionResult> SaveSchedules([FromBody] SaveSchedulesRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                _logger.LogInformation("Saving disbursement schedules for Application: {ApplicationId}", request.ApplicationID);

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    OldApiName,
                    OldApiDBConstants.SAVEDISBURSEMENTSCHEDULES,
                    request
                );

                if (result?.ResponseCode == "00")
                {
                    return Ok(new { success = true, message = "Schedules saved successfully", data = result.Details });
                }

                return Ok(new { success = false, message = result?.ResponseMessage ?? "Failed to save schedules" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving disbursement schedules");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST DTOs
    // ═══════════════════════════════════════════════════════════════════

    /// <summary>
    /// Request for getting disbursement schedules
    /// Maps to p_GetWFLoanDisbSchedules parameters
    /// </summary>
    public class GetSchedulesRequest
    {
        public string? OurBranchID { get; set; }
        public string? ApplicationID { get; set; }
        public string? OperatorID { get; set; }
        public int ModuleID { get; set; } = 7065;
    }

    /// <summary>
    /// Request for saving/updating disbursement schedules
    /// Maps to p_AddEditWFLoanDisbSchedules parameters
    /// </summary>
    public class SaveSchedulesRequest
    {
        public string? OurBranchID { get; set; }
        public string? AccountID { get; set; }
        public string? LoanSeries { get; set; }
        public string? ApplicationID { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? SupervisedBy { get; set; }
        public string? UpdateCount { get; set; }
        public string? DetailRecords { get; set; }  // XML string containing schedule records
    }
}
