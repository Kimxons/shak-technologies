using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models;
using kairo_ui.Models.Login;
using kairo_ui.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Threading.Tasks;

namespace kairo_ui.Controllers.login
{
    public class loginController : Controller
    {
        private readonly IApiService _apiService;
        private readonly IAuthService _authService;
        private readonly ILogger<loginController> _logger;
        private readonly IConfiguration _conf;
        public loginController(
            IApiService apiService,
            IAuthService authService,
            ILogger<loginController> logger,
            IConfiguration configuration)
        {
            _apiService = apiService;
            _authService = authService;
            _logger = logger;
            _conf = configuration;
        }

        public IActionResult Index()
        {
            // If already authenticated, redirect to dashboard
            if (_authService.IsAuthenticated())
            {
                _logger.LogInformation("User already authenticated, redirecting to dashboard");
                return RedirectToAction("Index", "Dashboard");
            }

            // OAuth 2.0 is the only authentication method
            _logger.LogInformation("Redirecting to OAuth 2.0 authorization endpoint");
            return RedirectToAction("OAuthAuthorize");
        }

        [HttpPost]
        public IActionResult Logout()
        {
            _logger.LogInformation("User logging out");
            _authService.Logout();
            return RedirectToAction("Index");
        }

        [HttpGet("login/oauth-authorize")]
        public IActionResult OAuthAuthorize()
        {
            try
            {
                var authorizationUrl = _authService.GetAuthorizationCodeUrl(out var state, out var codeVerifier);

                _logger.LogInformation("OAuth authorization initiated | State: {State} | RedirectUrl: {RedirectUrl}",
                    state, authorizationUrl);

                return Redirect(authorizationUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error initiating OAuth authorization");
                var viewModel = new LoginViewModel
                {
                    ErrorMessage = "OAuth authentication is temporarily unavailable. Please try again."
                };
                return View("Index", viewModel);
            }
        }

        /// <summary>
        /// OAuth 2.0 callback endpoint - handles authorization code and exchanges for token
        /// </summary>
        [HttpGet("login/callback")]
        public async Task<IActionResult> OAuthCallback(string code, string state, string error, string error_description)
        {
            // Handle authorization server errors
            if (!string.IsNullOrEmpty(error))
            {
                _logger.LogWarning("OAuth authorization error | Error: {Error} | Description: {ErrorDescription}",
                    error, error_description);

                var viewModel = new LoginViewModel
                {
                    ErrorMessage = $"Authorization failed: {error_description ?? error}"
                };
                return View("Index", viewModel);
            }

            if (string.IsNullOrEmpty(code))
            {
                _logger.LogError("OAuth callback missing authorization code");
                var viewModel = new LoginViewModel
                {
                    ErrorMessage = "Authorization failed: Missing authorization code"
                };
                return View("Index", viewModel);
            }

            try
            {
                // Retrieve PKCE parameters from session
                var httpContext = HttpContext;
                var session = httpContext.Session;

                var codeVerifier = session?.GetString("oauth_code_verifier") ?? "";
                var storedState = session?.GetString("oauth_state") ?? "";

                if (string.IsNullOrEmpty(codeVerifier) || string.IsNullOrEmpty(storedState))
                {
                    _logger.LogError("OAuth callback missing session data | CodeVerifier: {HasVerifier} | State: {HasState}",
                        !string.IsNullOrEmpty(codeVerifier), !string.IsNullOrEmpty(storedState));

                    var viewModel = new LoginViewModel
                    {
                        ErrorMessage = "Session expired. Please try logging in again."
                    };
                    return View("Index", viewModel);
                }

                _logger.LogInformation("Processing OAuth callback | Code: {CodeLength} chars | State: {State}",
                    code?.Length ?? 0, state);

                // Exchange authorization code for access token
                var tokenResponse = await _authService.ExchangeCodeForTokenAsync(code ?? "", codeVerifier, storedState);

                if (tokenResponse?.Success == true)
                {
                    HttpContext.Session.SetString("appname", _conf["OAuth:ClientId"]!);
                    // Extract and store branchId from token response
                    if (tokenResponse.BranchId != 0)
                    {
                        HttpContext.Session.SetString("branch_id", Convert.ToString(tokenResponse.BranchId)!);
                        HttpContext.Session.SetString("roles", JsonSerializer.Serialize(tokenResponse.Roles)!);
                        var branch = await _authService.GetByIdAsync<BranchSetting>(ApiEndpoints.GET_BRANCHSETTINGS_IAM, tokenResponse.BranchId);
                        HttpContext.Session.SetString("branch_code", branch.BranchCode);
                        HttpContext.Session.SetString("branch_name", branch.BranchName);

                        object? apiReq = new { RequestID = HttpContext.Connection.Id, BankID = "00", OurBranchID = branch.BranchCode, OperatorID = tokenResponse.Username! };

                        var respApi = await _apiService.CreateAsync<ResponseDetail<JsonDocument>>("SystemCoreApi", ApiEndpoints.GET_SYSTEMBANKSETTINGS, apiReq);
                        _logger.LogInformation("SystemBankSettings response | resp: {@res}", respApi);

                        if (respApi == null || respApi.Details == null)
                        {
                            _logger.LogError("SystemCoreApi  GET_SYSTEMBANKSETTINGS failed| response: {@resp}", respApi);
                            var viewModel = new LoginViewModel
                            {
                                ErrorMessage = "SystemCoreApi  GET_SYSTEMBANKSETTINGS failed"
                            };
                            return View("Index", viewModel);
                        }
                        SystemBankSetting? bank = JsonSerializer.Deserialize<SystemBankSetting?>(respApi.Details!.RootElement.GetProperty("SystemBankSettingData").GetRawText()!)!;
                        HttpContext.Session.SetString("bank_name", bank!.BankName!);

                        _logger.LogInformation("BranchId,Roles extracted from token response and saved to session | BranchId: {BranchId}", tokenResponse.BranchId);
                    }
                    _logger.LogInformation("OAuth token exchange successful | User: {UserId} | Email: {Email} | BranchId: {BranchId}",
                        tokenResponse.UserId, tokenResponse.Email, tokenResponse.BranchId);

                    return RedirectToAction("Index", "Dashboard");
                }
                else
                {
                    var errorMessage = tokenResponse?.Message ?? "Token exchange failed. Please try again.";
                    _logger.LogWarning("OAuth token exchange failed | Message: {Message}", errorMessage);

                    var viewModel = new LoginViewModel
                    {
                        ErrorMessage = errorMessage
                    };
                    return View("Index", viewModel);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during OAuth callback processing");
                var viewModel = new LoginViewModel
                {
                    ErrorMessage = "An error occurred during authentication. Please try again."
                };
                return View("Index", viewModel);
            }
        }
    }
}
