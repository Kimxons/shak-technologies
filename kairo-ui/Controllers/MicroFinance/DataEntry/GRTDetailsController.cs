using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.MicroFinance.DataEntry
{
    [Route("MicroFinance/DataEntry/GRTDetails")]
    public class GRTDetailsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ILogger<GRTDetailsController> _logger;

        public GRTDetailsController(IAuthService authService, ILogger<GRTDetailsController> logger)
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
                _logger.LogWarning("Unauthenticated access attempt to GRT Details");
                return RedirectToAction("Index", "Login");
            }

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            return PartialView("~/Views/MicroFinance/DataEntry/GRTDetails/GRTDetails.cshtml");
        }
    }
}
