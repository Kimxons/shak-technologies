using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/InsuranceCode")]
    public class InsuranceCodeController : StaticDataModuleControllerBase
    {
        public InsuranceCodeController(
            IAuthService authService,
            ILogger<InsuranceCodeController> logger)
            : base(authService, logger)
        {
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("InsuranceCode");
        }
    }
}