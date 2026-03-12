using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("GroupAttendance")]
    [Route("MicroFinance/GroupAttendance")]
    [Route("MicroFinance/CenterAttendance")]
    [Route("CenterAttendance")]
    public class CenterAttendanceController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<CenterAttendanceController> _logger;

        public CenterAttendanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<CenterAttendanceController> logger)
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
        public async Task<IActionResult> CenterAttendancePage(string? moduleId = null)
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            await PopulateCenterAttendanceViewDataAsync(moduleId);
            return View("~/Views/MicroFinance/CenterAttendance.cshtml");
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

            await PopulateCenterAttendanceViewDataAsync(moduleId);
            return View("~/Views/MicroFinance/CenterAttendance.cshtml");
        }

        private async Task PopulateCenterAttendanceViewDataAsync(string? moduleId)
        {
            ViewData["ModuleId"] = moduleId ?? "5080";

            try
            {
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "PaymentTypeID",
                    "AttendanceStatusID"
                });

                dropdownOptions.TryGetValue("PaymentTypeID", out var paymentTypeOptions);
                dropdownOptions.TryGetValue("AttendanceStatusID", out var attendanceStatusOptions);
                ViewData["PaymentTypeOptions"] = paymentTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["AttendanceStatusOptions"] = attendanceStatusOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options for Center Attendance");
                ViewData["PaymentTypeOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["AttendanceStatusOptions"] = Enumerable.Empty<SelectListItem>();
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
                    OldApiDBConstants.GET_GROUP_ATTENDANCE,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting group attendance");
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
                    OldApiDBConstants.ADD_EDIT_GROUP_ATTENDANCE,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving group attendance");
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
                    OldApiDBConstants.DELETE_GROUP_ATTENDANCE,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting group attendance");
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
