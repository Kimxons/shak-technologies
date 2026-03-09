using CBS.Entities.SystemCore;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.MicroFinance.DataEntry
{
    [Route("MicroFinance/DataEntry/GroupBankDetails")]
    public class GroupBankDetailsController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<GroupBankDetailsController> _logger;

        public GroupBankDetailsController(
            IAuthService authService,
            IApiCachedService apiCachedService,
            ILogger<GroupBankDetailsController> logger)
        {
            _authService = authService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        [HttpGet]
        [Route("")]
        [Route("Index")]
        public async Task<IActionResult> Index()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Group Bank Details");
                return RedirectToAction("Index", "Login");
            }

            var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
            {
                "ProductTypeID",
                "InstitutionTypeID"
            });

            dropdowns.TryGetValue("ProductTypeID", out var accountTypeOptions);
            dropdowns.TryGetValue("InstitutionTypeID", out var institutionTypeOptions);

            ViewData["AccountTypeOptions"] = accountTypeOptions ?? new List<SelectListItem>();
            ViewData["InstitutionTypeOptions"] = institutionTypeOptions ?? new List<SelectListItem>();

            return PartialView("~/Views/MicroFinance/DataEntry/GroupBankDetails/GroupBankDetails.cshtml");
        }
    }
}
