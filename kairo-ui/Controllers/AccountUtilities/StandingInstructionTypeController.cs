using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountUtilities
{
    [Route("AccountUtilities")]
    public class StandingInstructionTypeController : Controller
    {
        private const string OldApiName = "OldApi";

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

        // =====================================================================
        // INDEX - Landing page for Account Utilities module
        // =====================================================================

        [HttpGet]
        [Route("Index")]
        public IActionResult Index()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");
            return View();
        }

        // =====================================================================
        // STANDING INSTRUCTION TYPE - Load Partial View with Static Dropdown Options
        // =====================================================================

        [HttpGet]
        [Route("StandingInstructionType")]
        public IActionResult StandingInstructionType()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            // SI Transfer Type - static options matching legacy HTML values
            ViewData["SITransferTypeOptions"] = new List<SelectListItem>
            {
                new SelectListItem { Value = "internal", Text = "Internal Transfer" },
                new SelectListItem { Value = "external", Text = "External Transfer" }
            };

            // Failed Charge Type - static options matching legacy HTML values
            ViewData["FailedChargeTypeOptions"] = new List<SelectListItem>
            {
                new SelectListItem { Value = "none",       Text = "None"       },
                new SelectListItem { Value = "fixed",      Text = "Fixed"      },
                new SelectListItem { Value = "percentage", Text = "Percentage" }
            };

            return PartialView("~/Views/AccountUtilities/StandingInstructionType.cshtml");
        }

        // =====================================================================
        // GET SI TYPE - Returns full record for the given SITypeID
        // Proxies to dbo.p_GetSITypes via OldApiService
        // =====================================================================

        [HttpPost]
        [Route("api/get-si-type")]
        public async Task<IActionResult> GetSIType([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.GET_SI_TYPES,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching SI Type record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // =====================================================================
        // SAVE SI TYPE - Add (NewRecord=1) or Edit (NewRecord=0) an SI Type
        // Proxies to dbo.p_AddEditSITypes via OldApiService
        // =====================================================================

        [HttpPost]
        [Route("api/save-si-type")]
        public async Task<IActionResult> SaveSIType([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_SI_TYPES,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving SI Type record");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
