using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance/ExitTypes")]
    [Route("ExitTypes")]
    public class ExitTypesController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<ExitTypesController> _logger;

        public ExitTypesController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<ExitTypesController> logger)
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
        public async Task<IActionResult> ExitTypesPage(string? moduleId = null, string? exitTypeId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            await PopulateExitTypesViewDataAsync(moduleId, exitTypeId);
            return View("~/Views/MicroFinance/ExitTypes.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // INDEX - Load Partial View with Dropdowns (for modal/iframe)
        // ═══════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? exitTypeId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            await PopulateExitTypesViewDataAsync(moduleId, exitTypeId);
            return View("~/Views/MicroFinance/ExitTypes.cshtml");
        }

        private async Task PopulateExitTypesViewDataAsync(string? moduleId, string? exitTypeId)
        {
            ViewData["ModuleId"] = moduleId ?? "1000";
            ViewData["ExitTypeId"] = exitTypeId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(exitTypeId)).ToString().ToLower();

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "LoanCycleID",
                    "ExitChargeoffTypeID"
                });

                dropdownOptions.TryGetValue("LoanCycleID", out var loanCycleOptions);
                dropdownOptions.TryGetValue("ExitChargeoffTypeID", out var chargeOffTypeOptions);

                // Both Within Level and After Level use the same LoanCycleID code
                ViewData["ReinCycleOptions"] = loanCycleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["GraceReinCycleOptions"] = loanCycleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ChargeOffTypeOptions"] = chargeOffTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Exit Types");
                ViewData["ReinCycleOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["GraceReinCycleOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["ChargeOffTypeOptions"] = Enumerable.Empty<SelectListItem>();
            }
        }

        // ═══════════════════════════════════════════════════════════════════
        // CRUD ENDPOINTS - JsonElement passthrough (preserves API field casing)
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
                    OldApiDBConstants.GET_EXIT_TYPES,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting exit type");
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
                    OldApiDBConstants.ADD_EDIT_EXIT_TYPES,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving exit type");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName,
                    OldApiDBConstants.DELETE_EXIT_TYPES,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting exit type");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
