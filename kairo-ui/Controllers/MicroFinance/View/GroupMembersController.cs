using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.MicroFinance.View
{
    [Route("MicroFinance/View/GroupMembers")]
    public class GroupMembersController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ILogger<GroupMembersController> _logger;

        public GroupMembersController(IAuthService authService, ILogger<GroupMembersController> logger)
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
                _logger.LogWarning("Unauthenticated access attempt to Group Members");
                return RedirectToAction("Index", "Login");
            }

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            return PartialView("~/Views/MicroFinance/View/GroupMembers/GroupMembers.cshtml");
        }
    }
}
