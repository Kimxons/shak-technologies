using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Documents")]
    public class ClientDocumentsController : ClientMaintenanceControllerBase
    {
        private readonly IApiCachedService _apiCachedService;

        public ClientDocumentsController(IAuthService authService, IApiService apiService, IApiCachedService apiCachedService, ILogger<ClientDocumentsController> logger)
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
                    "DocumentID",
                    "DocumentTypeID",
                    "DocumentLocationID"
                });

                dropdownOptions.TryGetValue("DocumentID", out var documentIdOptions);
                dropdownOptions.TryGetValue("DocumentTypeID", out var documentTypeOptions);
                dropdownOptions.TryGetValue("DocumentLocationID", out var documentLocationOptions);

                ViewData["DocumentIdOptions"] = documentIdOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["DocumentTypeOptions"] = documentTypeOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["DocumentLocationOptions"] = documentLocationOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error loading Documents tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientDocuments.cshtml");
        }

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.GET_CLIENT_DOCUMENTS, requestData, "client-maintenance.documents.get", requestData?.ModuleID);

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_DOCUMENTS, requestData, "client-maintenance.documents.create", requestData?.ModuleID);

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_DOCUMENTS, requestData, "client-maintenance.documents.update", requestData?.ModuleID);

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_DOCUMENTS, requestData, "client-maintenance.documents.delete", requestData?.ModuleID);
    }
}
