using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/ThirdPartyProvider")]
    public class ThirdPartyProviderController : StaticDataModuleControllerBase
    {
        public ThirdPartyProviderController(
            IAuthService authService,
            ILogger<ThirdPartyProviderController> logger)
            : base(authService, logger)
        {
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("ThirdPartyProvider");
        }
    }
}