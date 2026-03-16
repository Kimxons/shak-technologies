using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/DeviceManager")]
    public class DeviceManagerController : StaticDataModuleControllerBase
    {
        public DeviceManagerController(
            IAuthService authService,
            ILogger<DeviceManagerController> logger)
            : base(authService, logger)
        {
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("DeviceManager");
        }
    }
}