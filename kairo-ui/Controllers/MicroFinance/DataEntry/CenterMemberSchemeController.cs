using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance.DataEntry
{
    [Route("MicroFinance/DataEntry/CenterMemberScheme")]
    public class CenterMemberSchemeController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<CenterMemberSchemeController> _logger;

        public CenterMemberSchemeController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<CenterMemberSchemeController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        // ═════════════════════════════════════════════════════════════════
        // INDEX - Renders the DataEntry view inside iframe
        // ═════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public IActionResult Index()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Center Member Scheme");
                return RedirectToAction("Index", "Login");
            }

            return PartialView("~/Views/MicroFinance/DataEntry/CenterMemberScheme/CenterMemberScheme.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // DEDICATED ENDPOINTS
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-group-member-scheme")]
        public async Task<IActionResult> GetGroupMemberScheme([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.GET_GROUP_MEMBER_SCHEME, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching group member scheme");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("save-group-member-scheme")]
        public async Task<IActionResult> SaveGroupMemberScheme([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.ADD_EDIT_GROUP_MEMBER_SCHEME, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving group member scheme");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("delete-group-member-scheme")]
        public async Task<IActionResult> DeleteGroupMemberScheme([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.DELETE_GROUP_MEMBER_SCHEME, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting group member scheme");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
