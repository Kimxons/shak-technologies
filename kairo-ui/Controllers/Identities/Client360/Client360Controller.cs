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
        private readonly IConfiguration _config;
        private readonly ILogger<Client360Controller> _logger;

        public Client360Controller(
            IAuthService authService,
            IApiService apiService,
            IConfiguration configuration,
            ILogger<Client360Controller> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _config = configuration;
            _logger = logger;
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

                //var response = await PostOldApiAsync("dbo.p_GetIDDescription", requestData);


                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", "OldApi/GetIDDescription", requestData);
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
        [Route("search-clients")]
        public async Task<IActionResult> SearchClients([FromBody] Client360SearchRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated Client 360 search attempt");
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
                requestData.ModuleID ??= "1000";
                requestData.LanguageID ??= "en";

                _logger.LogInformation("Client 360 search request: {Request}", JsonSerializer.Serialize(requestData));

                //var response = await PostOldApiAsync("dbo.p_GetSearchResult", requestData);
                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", "OldApi/GetSearchResult", requestData);
                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching clients for Client 360");
                return StatusCode(500, new
                {
                    Success = false,
                    ErrorMessage = $"Error searching clients: {ex.Message}"
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

                //var response = await PostOldApiAsync("dbo.p_GetMember360", requestData);

                var response = await _apiService.CreateAsync<JsonElement>("ClientManagementApi", "OldApi/GetMember360", requestData);
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

        //private async Task<JsonElement> PostOldApiAsync(string formId, object requestData)
        //{
        //    var envelope = BuildOldApiEnvelope(formId, requestData);
        //    return await _apiService.CreateAsync<JsonElement>("ClientManagementApi","OldApi", envelope);
        //}

        //private object BuildOldApiEnvelope(string formId, object requestData)
        //{
        //    var cleanFormId = formId.StartsWith("dbo.", StringComparison.OrdinalIgnoreCase)
        //        ? formId.Substring(4)
        //        : formId;

        //    return new
        //    {
        //        RequestID = formId,
        //        FormID = cleanFormId,
        //        RequestData = requestData,
        //        RequestTime = DateTime.Now.ToString("MM/dd/yyyy HH:mm:ss", CultureInfo.InvariantCulture),
        //        AppName = ResolveOldApiAppName(),
        //        Checksum = ""
        //    };
        //}

        //private string ResolveOldApiAppName()
        //{
        //    return _config["ApiSettings:OldApiAppName"]
        //        ?? _config["ApiSettings:AppName"]
        //        ?? "PROJECT_KAIRO";
        //}

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
