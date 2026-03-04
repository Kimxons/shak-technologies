using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Address")]
    public class ClientAddressController : ClientMaintenanceControllerBase
    {
        private readonly IApiCachedService _apiCachedService;

        public ClientAddressController(IAuthService authService, IApiService apiService, IApiCachedService apiCachedService, ILogger<ClientAddressController> logger)
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
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(
                    [
                    "AddressTypeID"
                    ]);

                dropdownOptions.TryGetValue("AddressTypeID", out var addressTypeOptions);
                ViewData["AddressTypeOptions"] = addressTypeOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error loading Address tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientAddress.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.GET_CLIENT_ADDRESS, requestData, "client-maintenance.address.get", requestData?.ModuleID);

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_ADDRESS, requestData, "client-maintenance.address.create", requestData?.ModuleID);

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_ADDRESS, requestData, "client-maintenance.address.update", requestData?.ModuleID);

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_ADDRESS, requestData, "client-maintenance.address.delete", requestData?.ModuleID);
    }
}
