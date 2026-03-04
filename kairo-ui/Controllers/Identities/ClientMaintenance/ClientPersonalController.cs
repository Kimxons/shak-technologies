using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Personal")]
    public class ClientPersonalController : ClientMaintenanceControllerBase
    {
        private readonly IApiCachedService _apiCachedService;

        public ClientPersonalController(IAuthService authService, IApiService apiService, IApiCachedService apiCachedService, ILogger<ClientPersonalController> logger)
            : base(authService, apiService, logger)
        {
            _apiCachedService = apiCachedService;
        }

        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!AuthService.IsAuthenticated()) return RedirectToAction("Index", "Login");

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            try
            {
                // Use GetMultipleDropdownCodeOptionsAsync - now returns SelectListItem format
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "TitleID",
                    "GenderID",
                    "CountryID",
                    "ResidentID",
                    "IdentificationTypeID",
                    "LiteracyLevelID",
                    "MaritalStatusID",
                    "BloodGroupID",
                    "RelationshipManagerID"
                });

                dropdownOptions.TryGetValue("TitleID", out var titleOptions);
                dropdownOptions.TryGetValue("GenderID", out var genderOptions);
                dropdownOptions.TryGetValue("CountryID", out var nationalityOptions);
                dropdownOptions.TryGetValue("ResidentID", out var residentOptions);
                dropdownOptions.TryGetValue("IdentificationTypeID", out var identificationTypeOptions);
                dropdownOptions.TryGetValue("LiteracyLevelID", out var literacyLevelOptions);
                dropdownOptions.TryGetValue("MaritalStatusID", out var maritalStatusOptions);
                dropdownOptions.TryGetValue("BloodGroupID", out var bloodGroupOptions);
                dropdownOptions.TryGetValue("RelationshipManagerID", out var relationshipManagerOptions);

                ViewData["TitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["GenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["NationalityOptions"] = nationalityOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["ResidentOptions"] = residentOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["IdentificationTypeOptions"] = identificationTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["LiteracyLevelOptions"] = literacyLevelOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["MaritalStatusOptions"] = maritalStatusOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["BloodGroupOptions"] = bloodGroupOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["RelationshipManagerOptions"] = relationshipManagerOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error loading Personal tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientPersonal.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.GET_CLIENT_INDIVIDUAL, requestData, "client-maintenance.personal.get", requestData?.ModuleID);

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_INDIVIDUAL, requestData, "client-maintenance.personal.create", requestData?.ModuleID);

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_INDIVIDUAL, requestData, "client-maintenance.personal.update", requestData?.ModuleID);

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_INDIVIDUAL, requestData, "client-maintenance.personal.delete", requestData?.ModuleID);
    }
}
