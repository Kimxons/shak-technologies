using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/BreftBins")]
    public class BreftBinsController : StaticDataModuleControllerBase
    {
        public BreftBinsController(
            IAuthService authService,
            ILogger<BreftBinsController> logger)
            : base(authService, logger)
        {
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("BreftBins");
        }
    }
}