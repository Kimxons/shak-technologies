using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.MicroFinance
{
    [Route("MicroFinance/CenterMemberMaintenance")]
    public class CenterMemberMaintenanceController : Controller
    {
        private const string MicroFinanceApiName = "MicroFinanceApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<CenterMemberMaintenanceController> _logger;

        public CenterMemberMaintenanceController(
            IAuthService authService,
            IOldApiService oldApiService,
            IConfiguration configuration,
            ILogger<CenterMemberMaintenanceController> logger)
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
                _logger.LogWarning("Unauthenticated access attempt to Center Member Maintenance");
                return RedirectToAction("Index", "Login");
            }

            _logger.LogInformation("Center Member Maintenance loaded successfully");
            return PartialView("~/Views/MicroFinance/CenterMemberMaintenance.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // SUBMODULE PARTIAL VIEWS (loaded inline via fetch)
        // ═════════════════════════════════════════════════════════════════

        [HttpGet]
        [Route("CenterMemberScheme")]
        public IActionResult CenterMemberScheme()
        {
            if (!_authService.IsAuthenticated()) return Unauthorized();
            return PartialView("~/Views/MicroFinance/DataEntry/CenterMemberScheme/CenterMemberScheme.cshtml");
        }

        // ═════════════════════════════════════════════════════════════════
        // DEDICATED ENDPOINTS
        // ═════════════════════════════════════════════════════════════════

        [HttpPost]
        [Route("get-group-members")]
        public async Task<IActionResult> GetGroupMembers([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.GET_GROUP_MEMBERS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching group members");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("save-group-member")]
        public async Task<IActionResult> SaveGroupMember([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.ADD_EDIT_GROUP_MEMBERS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving group member");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("delete-group-member")]
        public async Task<IActionResult> DeleteGroupMember([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.DELETE_GROUP_MEMBERS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting group member");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("get-group-product-details")]
        public async Task<IActionResult> GetGroupProductDetails([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    MicroFinanceApiName, OldApiDBConstants.GET_GROUP_PRODUCT_DETAILS, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching group product details");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

    }
}
