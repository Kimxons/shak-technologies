using kairo_ui.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Http.Headers;
using System.Text.Json;

namespace kairo_ui.Handlers
{
    /// <summary>
    /// HTTP Message Handler that automatically:
    /// 1. Attaches Bearer token to outgoing API requests
    /// 2. Refreshes expired tokens (if refresh token available)
    /// 3. Handles authentication failures (401 Unauthorized)
    /// </summary>
    public class AuthenticationHandler : DelegatingHandler
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IAuthService _authService;
        private readonly ILogger<AuthenticationHandler> _logger;
        private const string TOKEN_SESSION_KEY = "auth_token";
        private readonly IConfiguration _config;
        public AuthenticationHandler(
            IHttpContextAccessor httpContextAccessor,
            IAuthService authService,
            ILogger<AuthenticationHandler> logger, IConfiguration configuration)
        {
            _httpContextAccessor = httpContextAccessor;
            _authService = authService;
            _logger = logger;
            _config = configuration;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var httpContext = _httpContextAccessor.HttpContext;

            if (httpContext?.Session != null)
            {
                try
                {
                    // Check if token is expired and refresh if needed
                    if (_authService.IsTokenExpired())
                    {
                        _logger.LogInformation("Access token expired, attempting refresh | Request URI: {RequestUri}",
                            request.RequestUri);

                        var refreshToken = _authService.GetRefreshToken();
                        if (!string.IsNullOrEmpty(refreshToken))
                        {
                            var newTokenResponse = await _authService.RefreshAccessTokenAsync(refreshToken);
                            if (newTokenResponse?.Success == true && !string.IsNullOrEmpty(newTokenResponse.AccessToken))
                            {
                                _logger.LogInformation("Token refreshed successfully | New expiry: {ExpiresIn}s",
                                    newTokenResponse.ExpiresIn);
                                // Use the new token (already set in AuthService)
                            }
                            else
                            {
                                _logger.LogWarning("Token refresh failed, continuing with existing token");
                            }
                        }
                        else
                        {
                            _logger.LogWarning("No refresh token available, token cannot be renewed");
                        }
                    }

                    // Retrieve current token from session
                    var token = _authService.GetToken();

                    if (!string.IsNullOrEmpty(token))
                    {
                        // Attach Bearer token to Authorization header
                        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                        _logger.LogDebug("Authorization header added to request: {RequestUri}", request.RequestUri);
                    }
                    else
                    {
                        _logger.LogWarning("No authentication token found in session for request: {RequestUri}",
                            request.RequestUri);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error during token refresh/attachment for request: {RequestUri}",
                        request.RequestUri);
                }
            }

            var body = request.Content == null ? null : await request.Content.ReadAsStringAsync(cancellationToken);

            // Send the request
            var response = await base.SendAsync(request, cancellationToken);
            var responseContent = response.Content == null ? null : await response.Content.ReadAsStringAsync(cancellationToken);

            var builder = new UriBuilder(request.RequestUri!.AbsoluteUri);

            var log = new
            {
                //Url = request.RequestUri.AbsoluteUri,
                Url = builder.ToString(),
                Headers = JsonSerializer.Serialize(request.Headers!.ToDictionary(h => h.Key, h => h.Value)),
                Body = string.IsNullOrEmpty(body) ? string.Empty : body,
                Method = request.Method.Method,
                StatusCode = response.StatusCode,
                ReasonPhrase = response.ReasonPhrase,
                Response = responseContent,
                RequestDate = DateTime.Now
            };

            _ = Task.Run(async () => // Use Task.Run because we want to fire and forget and we don't want logging to make the call takes longer to run
            {
                try
                {
                    string logPath = _config?.GetValue<string>("ApiSettings:ApiLogPath") ?? AppDomain.CurrentDomain.BaseDirectory + "\\HttpLog\\";
                    // Log request and response here i.e Send message to queue, or log to a remote server
                    System.IO.Directory.CreateDirectory(logPath);
                    System.IO.File.AppendAllText(logPath + DateTime.Now.ToString("yyyy-MM-dd").Replace("-", "") + ".txt", string.Concat("\n", Convert.ToString(log)));

                }
                catch (Exception)
                {
                    // Do nothing or log why the request log had an exception
                }
            }, cancellationToken);

            // Handle 401 Unauthorized responses
            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                _logger.LogWarning("Received 401 Unauthorized response from: {RequestUri}", request.RequestUri);

                // Try one more refresh attempt
                var refreshToken = _authService.GetRefreshToken();
                if (!string.IsNullOrEmpty(refreshToken))
                {
                    _logger.LogInformation("Attempting token refresh after 401 response");
                    var newTokenResponse = await _authService.RefreshAccessTokenAsync(refreshToken);

                    if (newTokenResponse?.Success == true && !string.IsNullOrEmpty(newTokenResponse.AccessToken))
                    {
                        _logger.LogInformation("Token refreshed after 401, retrying request");

                        // Retry the request with new token
                        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", newTokenResponse.AccessToken);
                        response = await base.SendAsync(request, cancellationToken);
                    }
                    else
                    {
                        // Clear session to force re-authentication
                        if (httpContext?.Session != null)
                        {
                            try
                            {
                                httpContext.Session.Remove(TOKEN_SESSION_KEY);
                                httpContext.Session.Remove("auth_refresh_token");
                                httpContext.Session.Remove("auth_user");
                                _logger.LogInformation("Session cleared due to 401 and failed token refresh");
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error clearing session after 401 response");
                            }
                        }
                    }
                }
                else
                {
                    // No refresh token, clear session and force re-authentication
                    if (httpContext?.Session != null)
                    {
                        try
                        {
                            httpContext.Session.Remove(TOKEN_SESSION_KEY);
                            httpContext.Session.Remove("auth_refresh_token");
                            httpContext.Session.Remove("auth_user");
                            _logger.LogInformation("Session cleared due to 401 Unauthorized response (no refresh token)");
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error clearing session after 401 response");
                        }
                    }
                }
            }

            // Handle 403 Forbidden responses
            if (response.StatusCode == HttpStatusCode.Forbidden)
            {
                _logger.LogWarning("Received 403 Forbidden response from: {RequestUri} | User may lack permissions",
                    request.RequestUri);
            }

            return response;
        }
    }
}
