using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    public abstract class StaticDataModuleControllerBase : Controller
    {
        private readonly IAuthService _authService;
        private readonly ILogger _logger;

        protected StaticDataModuleControllerBase(IAuthService authService, ILogger logger)
        {
            _authService = authService;
            _logger = logger;
        }

        protected IActionResult RenderModuleView(string viewName)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return RedirectToAction("Index", "Login");
                }

                return View($"~/Views/StaticData/{viewName}.cshtml");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Static Data view {ViewName}", viewName);
                return RedirectToAction("Index", "Dashboard");
            }
        }
    }
}