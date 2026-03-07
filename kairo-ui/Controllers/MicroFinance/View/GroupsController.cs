using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.MicroFinance.View
{
    [Route("MicroFinance/View/Groups")]
    public class GroupsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ILogger<GroupsController> _logger;

        public GroupsController(IAuthService authService, ILogger<GroupsController> logger)
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
                _logger.LogWarning("Unauthenticated access attempt to Groups");
                return RedirectToAction("Index", "Login");
            }

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            return PartialView("~/Views/MicroFinance/View/Groups/Groups.cshtml");
        }
    }
}
