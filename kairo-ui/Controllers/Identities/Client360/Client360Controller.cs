using kairo_ui.Models.Identities.Client360;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Globalization;
using System.Text.Json;

namespace kairo_ui.Controllers.Identities.Client360
{
    [Route("Identities/Client360")]
    public class Client360Controller : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly IOldApiService _oldApiService;
        private readonly IConfiguration _config;
        private readonly ILogger<Client360Controller> _logger;

        public Client360Controller(
            IAuthService authService,
            IApiService apiService,
            IOldApiService oldapiService,
            IConfiguration configuration,
            ILogger<Client360Controller> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _config = configuration;
            _logger = logger;
            _oldApiService = oldapiService;
        }

        [Route("Index")]
        public IActionResult Index()
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to Client 360");
                    return RedirectToAction("Index", "Login");
                }

                _logger.LogInformation("Client 360 loaded successfully");
                //return PartialView("~/Identities/Client360/Index.cshtml");
                return PartialView();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Client 360");
                return RedirectToAction("Index", "Dashboard");
            }
        }

        [HttpPost]
        [Route("validate-client")]
        public async Task<IActionResult> ValidateClient([FromBody] Client360ValidateRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Client 360 validation attempt");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }

                if (requestData == null)
                {
                    return BadRequest(new
                    {
                        Success = false,
                        ErrorMessage = "Request data is required"
                    });
                }

                EnsureClient360Defaults(requestData);

                _logger.LogInformation("Client 360 validation request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("SystemCoreApi", ApiEndpoints.GET_ID_DESCRIPTION, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating Client 360 request");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error validating client: {ex.Message}"
                });
            }
        }

        [HttpPost]
        [Route("view-client-360")]
        public async Task<IActionResult> ViewClient360([FromBody] Client360ViewRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Client 360 view attempt");
                    return Unauthorized(new
                    {
                        Success = false,
                        ErrorMessage = "User is not authenticated"
                    });
                }

                if (requestData == null)
                {
                    return BadRequest(new
                    {
                        Success = false,
                        ErrorMessage = "Request data is required"
                    });
                }

                EnsureClient360Defaults(requestData);

                _logger.LogInformation("Client 360 view request: {Request}", JsonSerializer.Serialize(requestData));

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", ApiEndpoints.GET_CLIENT_360, requestData);
                //var response = await _oldApiService.CreateAsync<JsonElement>("OldApi", OldApiDBConstants.GET_SEARCHRESULT, requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Client 360 data");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error loading client 360: {ex.Message}"
                });
            }
        }

        private void EnsureClient360Defaults(Client360BaseRequest requestData)
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
        }

        private string? ResolveSessionValue(params string[] keys)
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
