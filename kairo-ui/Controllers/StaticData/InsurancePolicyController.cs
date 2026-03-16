using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData/InsurancePolicy")]
    public class InsurancePolicyController : StaticDataModuleControllerBase
    {
        public InsurancePolicyController(
            IAuthService authService,
            ILogger<InsurancePolicyController> logger)
            : base(authService, logger)
        {
        }

        [HttpGet("")]
        [HttpGet("Index")]
        public IActionResult Index()
        {
            return RenderModuleView("InsurancePolicy");
        }
    }
}