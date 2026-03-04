using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/GroupDetail")]
    public class ClientGroupDetailController : ClientMaintenanceControllerBase
    {
        private readonly IApiCachedService _apiCachedService;

        public ClientGroupDetailController(IAuthService authService, IApiService apiService, IApiCachedService apiCachedService, ILogger<ClientGroupDetailController> logger)
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
                // Use GetMultipleDropdownCodeOptionsAsync - returns SelectListItem format
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "JoinOn"
                });

                dropdownOptions.TryGetValue("JoinOn", out var joinOnOptions);
                ViewData["GroupJoinOnOptions"] = joinOnOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error loading Group Detail tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientGroupDetail.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.GET_CLIENT_GROUP_DETAIL, requestData, "client-maintenance.groupdetail.get", requestData?.ModuleID);

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_GROUP_DETAIL, requestData, "client-maintenance.groupdetail.create", requestData?.ModuleID);

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_GROUP_DETAIL, requestData, "client-maintenance.groupdetail.update", requestData?.ModuleID);

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_GROUP_DETAIL, requestData, "client-maintenance.groupdetail.delete", requestData?.ModuleID);
    }
}
