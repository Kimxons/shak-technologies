using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.MicroFinance.DataEntry
{
    [Route("MicroFinance/DataEntry/UserDefinedFields")]
    public class UserDefinedFieldsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ILogger<UserDefinedFieldsController> _logger;

        public UserDefinedFieldsController(IAuthService authService, ILogger<UserDefinedFieldsController> logger)
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
                _logger.LogWarning("Unauthenticated access attempt to User Defined Fields");
                return RedirectToAction("Index", "Login");
            }

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            return PartialView("~/Views/MicroFinance/DataEntry/UserDefinedFields/UserDefinedFields.cshtml");
        }
    }
}
