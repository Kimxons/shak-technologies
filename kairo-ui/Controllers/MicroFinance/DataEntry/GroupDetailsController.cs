using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.MicroFinance.DataEntry
{
    [Route("MicroFinance/DataEntry/GroupDetails")]
    public class GroupDetailsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ILogger<GroupDetailsController> _logger;

        public GroupDetailsController(IAuthService authService, ILogger<GroupDetailsController> logger)
        {
            _authService = authService;
            _logger = logger;
        }

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public IActionResult Index(string? moduleId = null)
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Group Details");
                return RedirectToAction("Index", "Login");
            }

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            return PartialView("~/Views/MicroFinance/DataEntry/GroupDetails/GroupDetails.cshtml");
        }
    }
}
