using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance")]
    public class ClientMaintenanceController : ClientMaintenanceControllerBase
    {
        public ClientMaintenanceController(
            IAuthService authService,
            IApiService apiService,
            ILogger<ClientMaintenanceController> logger)
            : base(authService, apiService, logger)
        {
        }

        [HttpGet]
        [Route("Index")]
        public IActionResult Index(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
            if (!AuthService.IsAuthenticated())
            {
                Logger.LogWarning("Unauthenticated access attempt to Client Maintenance");
                return RedirectToAction("Index", "Login");
            }

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["ClientId"] = clientId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            return PartialView();
        }

        [HttpPost]
        [Route("validate-client")]
        public async Task<IActionResult> ValidateClient([FromBody] ClientMaintenanceValidateRequest requestData)
        {
            return await ProxyRequestAsync(
                "SystemCoreApi",
                ApiEndpoints.GET_ID_DESCRIPTION,
                requestData,
                "client-maintenance.validate-client",
                requestData?.ModuleID);
        }

        [HttpPost]
        [Route("get-basic")]
        public async Task<IActionResult> GetBasic([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            return await ProxyRequestAsync(
                "ClientManagementApi",
                ApiEndpoints.GET_CLIENT_BASIC_DETAILS,
                requestData,
                "client-maintenance.get-basic",
                requestData?.ModuleID);
        }

        [HttpPost]
        [Route("create-basic")]
        public async Task<IActionResult> CreateBasic([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            return await ProxyRequestAsync(
                "ClientManagementApi",
                ApiEndpoints.CREATE_CLIENT_BASIC_DETAILS,
                requestData,
                "client-maintenance.create-basic",
                requestData?.ModuleID);
        }

        [HttpPost]
        [Route("update-basic")]
        public async Task<IActionResult> UpdateBasic([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            return await ProxyRequestAsync(
                "ClientManagementApi",
                ApiEndpoints.EDIT_CLIENT_BASIC_DETAILS,
                requestData,
                "client-maintenance.update-basic",
                requestData?.ModuleID);
        }

        [HttpPost]
        [Route("delete-basic")]
        public async Task<IActionResult> DeleteBasic([FromBody] ClientMaintenanceCrudRequest requestData)
        {
            return await ProxyRequestAsync(
                "ClientManagementApi",
                ApiEndpoints.DELETE_CLIENT_BASIC_DETAILS,
                requestData,
                "client-maintenance.delete-basic",
                requestData?.ModuleID);
        }

        [HttpPost]
        [Route("get-workflow-stage")]
        public async Task<IActionResult> GetWorkflowStage([FromBody] ClientMaintenanceBaseRequest requestData)
        {
            return await ProxyRequestAsync(
                "SystemCoreApi",
                ApiEndpoints.GET_WORKFLOW_STAGE,
                requestData,
                "client-maintenance.get-workflow-stage",
                requestData?.ModuleID);
        }
    }
}
