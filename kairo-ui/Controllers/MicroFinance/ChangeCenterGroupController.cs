using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance/ChangeCenterGroup")]
    public class ChangeCenterGroupController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<ChangeCenterGroupController> _logger;

        public ChangeCenterGroupController(
            IAuthService authService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<ChangeCenterGroupController> logger)
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
                _logger.LogWarning("Unauthenticated access attempt to Change Center/Group");
                return RedirectToAction("Index", "Login");
            }

            _logger.LogInformation("Change Center/Group loaded successfully");
            return PartialView("~/Views/MicroFinance/ChangeCenterGroup.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // DEDICATED ENDPOINTS (same pattern as MicroFinanceController)
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("group-details")]
        public async Task<IActionResult> GetGroupDetails([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.GET_GROUP_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching group details");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("group-member-list")]
        public async Task<IActionResult> GetGroupMemberList([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.GET_GROUP_MEMBER_LIST, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching group member list");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("change-member-group")]
        public async Task<IActionResult> ChangeMemberGroupID([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.CHANGE_MEMBER_GROUP_ID, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error changing member group ID");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }
    }
}
