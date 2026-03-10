using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance/ChangeInstallmentDate")]
    public class ChangeInstallmentDateController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<ChangeInstallmentDateController> _logger;

        public ChangeInstallmentDateController(
            IAuthService authService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<ChangeInstallmentDateController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _config = configuration;
            _logger = logger;
        }

        // ═════════════════════════════════════════════════════════════════
        // INDEX - Entry point from dashboard
        // ═════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public IActionResult Index()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Change Installment Date");
                return RedirectToAction("Index", "Login");
            }

            _logger.LogInformation("Change Installment Date loaded successfully");
            return PartialView("~/Views/MicroFinance/ChangeInstallmentDate.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // DEDICATED ENDPOINTS (same pattern as MicroFinanceController)
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("generate-installments")]
        public async Task<IActionResult> GenerateInstallments([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.GET_GROUP_LOAN_INST_DATE_CHANGE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating installment dates");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("change-installment-date")]
        public async Task<IActionResult> ChangeInstallmentDate([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.CHANGE_INSTALLMENT_DATE, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing installment date");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("get-installment-dates")]
        public async Task<IActionResult> GetInstallmentDates([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.GET_INSTALLMENT_DATES, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching installment dates");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
