using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Corporate")]
    public class ClientCorporateController : ClientMaintenanceControllerBase
    {
        private readonly IApiCachedService _apiCachedService;

        public ClientCorporateController(IAuthService authService, IApiService apiService, IApiCachedService apiCachedService, ILogger<ClientCorporateController> logger)
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
                    "BusinessOwnershipID",
                    "BusinessLineID",
                    "IdentificationTypeID",
                    "CountryID",
                    "RelationshipManagerID"
                });

                dropdownOptions.TryGetValue("BusinessOwnershipID", out var businessOwnershipOptions);
                dropdownOptions.TryGetValue("BusinessLineID", out var businessLineOptions);
                dropdownOptions.TryGetValue("IdentificationTypeID", out var identificationTypeOptions);
                dropdownOptions.TryGetValue("CountryID", out var countryOptions);
                dropdownOptions.TryGetValue("RelationshipManagerID", out var relationshipManagerOptions);

                ViewData["CorporateBusinessOwnershipOptions"] = businessOwnershipOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateBusinessLineOptions"] = businessLineOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateIdentificationTypeOptions"] = identificationTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateCountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CorporateRelationshipManagerOptions"] = relationshipManagerOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error loading Corporate tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientCorporate.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.GET_CLIENT_CORPORATE, requestData, "client-maintenance.corporate.get", requestData?.ModuleID);

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_CORPORATE, requestData, "client-maintenance.corporate.create", requestData?.ModuleID);

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_CORPORATE, requestData, "client-maintenance.corporate.update", requestData?.ModuleID);

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_CORPORATE, requestData, "client-maintenance.corporate.delete", requestData?.ModuleID);
    }
}
