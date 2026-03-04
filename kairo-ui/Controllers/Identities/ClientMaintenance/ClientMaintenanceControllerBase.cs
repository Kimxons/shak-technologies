using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    public abstract class ClientMaintenanceControllerBase : Controller
    {
        protected readonly IAuthService AuthService;
        protected readonly IApiService ApiService;
        protected readonly ILogger Logger;

        protected ClientMaintenanceControllerBase(
            IAuthService authService,
            IApiService apiService,
            ILogger logger)
        {
            AuthService = authService;
            ApiService = apiService;
            Logger = logger;
        }

        protected IActionResult? EnsureAuthenticated(string context)
        {
            if (AuthService.IsAuthenticated())
            {
                return null;
            }

            Logger.LogWarning("Unauthenticated access attempt: {Context}", context);
            return Unauthorized(new
            {
                Success = false,
                ErrorMessage = "User is not authenticated"
            });
        }

        protected void EnsureRequestDefaults(ClientMaintenanceBaseRequest requestData, string? moduleId = null)
        {
            if (string.IsNullOrWhiteSpace(requestData.OperatorID))
            {
                requestData.OperatorID = ResolveSessionValue("user_name", "user_id") ?? "web_portal";
            }

            if (string.IsNullOrWhiteSpace(requestData.OurBranchID))
            {
                requestData.OurBranchID = ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
            }

            if (string.IsNullOrWhiteSpace(requestData.BankID))
            {
                requestData.BankID = ResolveSessionValue("bank_id", "bank_code") ?? "00";
            }

            if (string.IsNullOrWhiteSpace(requestData.ModuleID) && !string.IsNullOrWhiteSpace(moduleId))
            {
                requestData.ModuleID = moduleId;
            }
        }

        protected async Task<IActionResult> ProxyRequestAsync(
            string apiName,
            string endpoint,
            ClientMaintenanceBaseRequest? requestData,
            string operation,
            string? moduleId = null)
        {
            var unauthenticated = EnsureAuthenticated(operation);
            if (unauthenticated != null)
            {
                return unauthenticated;
            }

            if (requestData == null)
            {
                return BadRequest(new
                {
                    Success = false,
                    ErrorMessage = "Request data is required"
                });
            }

            try
            {
                EnsureRequestDefaults(requestData, moduleId);
                Logger.LogInformation("{Operation} request: {Request}", operation, JsonSerializer.Serialize(requestData));

                var response = await ApiService.CreateAsync<JsonElement>(apiName, endpoint, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error on operation: {Operation}", operation);
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = ex.Message
                });
            }
        }

        protected string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }
    }
}