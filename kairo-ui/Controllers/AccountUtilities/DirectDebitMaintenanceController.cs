using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;
using System.Text.Json;

namespace kairo_ui.Controllers.AccountUtilities
{
    [Route("AccountUtilities")]
    public class DirectDebitMaintenanceController : Controller
    {
        private const string OldApiName = "OldApi";

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

        // =====================================================================
        // DIRECT DEBIT MAINTENANCE - Load Partial View with Static Dropdowns
        // =====================================================================

        [HttpGet]
        [Route("DirectDebitMaintenance")]
        public IActionResult DirectDebitMaintenance()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            // Direct Debit Type - static options matching legacy HTML
            ViewData["DirectDebitTypeOptions"] = new List<SelectListItem>
            {
                new SelectListItem { Value = "OUTGOING", Text = "Outgoing Direct Debit" },
                new SelectListItem { Value = "INCOMING", Text = "Incoming Direct Debit" }
            };

            // Transfer Frequency - static options matching legacy HTML
            ViewData["TransferFrequencyOptions"] = new List<SelectListItem>
            {
                new SelectListItem { Value = "DAILY",     Text = "Daily"     },
                new SelectListItem { Value = "WEEKLY",    Text = "Weekly"    },
                new SelectListItem { Value = "MONTHLY",   Text = "Monthly"   },
                new SelectListItem { Value = "QUARTERLY", Text = "Quarterly" },
                new SelectListItem { Value = "ANNUAL",    Text = "Annual"    }
            };

            // Charge Recovery - static options matching legacy HTML
            ViewData["ChargeRecoveryOptions"] = new List<SelectListItem>
            {
                new SelectListItem { Value = "NONE",      Text = "None"      },
                new SelectListItem { Value = "IMMEDIATE", Text = "Immediate" },
                new SelectListItem { Value = "DEFERRED",  Text = "Deferred"  }
            };

            return PartialView("~/Views/AccountUtilities/_DirectDebitMaintenance.cshtml");
        }

        // =====================================================================
        // SAVE DIRECT DEBIT - Add or Edit a Direct Debit Instruction
        // Proxies to dbo.p_AddEditDirectDebitTransfer via OldApiService
        // =====================================================================

        [HttpPost]
        [Route("api/save-direct-debit")]
        public async Task<IActionResult> SaveDirectDebit([FromBody] JsonElement requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiName,
                    OldApiDBConstants.ADD_EDIT_DIRECT_DEBIT_TRANSFER,
                    requestData
                );

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving Direct Debit instruction");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }
}
