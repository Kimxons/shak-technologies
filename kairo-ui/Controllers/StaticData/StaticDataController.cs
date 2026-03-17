using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData")]
    public class StaticDataController : StaticDataModuleControllerBase
    {
        public StaticDataController(
            IAuthService authService,
            ILogger<StaticDataController> logger)
            : base(authService, logger)
        {
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index() => RenderModuleView("StaticData");
    }
}
