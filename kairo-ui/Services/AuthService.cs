using kairo_ui.Models;
using kairo_ui.Utilities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace kairo_ui.Services
{
    /// <summary>
    /// Authentication service interface supporting both OAuth 2.0 and basic authentication flows
    /// </summary>
    public interface IAuthService
    {
        /// <summary>
        /// Authenticates user with username/password credentials
        /// </summary>
        Task<TokenResponse?> AuthenticateAsync(LoginRequest request);

        /// <summary>
        /// Generates OAuth 2.0 authorization code URL with PKCE
        /// </summary>
        string GetAuthorizationCodeUrl(out string state, out string codeVerifier);

        /// <summary>
        /// Exchanges OAuth authorization code for access token
        /// </summary>
        Task<TokenResponse?> ExchangeCodeForTokenAsync(string code, string codeVerifier, string state);

        /// <summary>
        /// Refreshes expired access token using refresh token
        /// </summary>
        Task<TokenResponse?> RefreshAccessTokenAsync(string refreshToken);

        /// <summary>
        /// Gets the current authentication token from store
        /// </summary>
        string? GetToken();

        /// <summary>
        /// Gets the refresh token from store
        /// </summary>
        string? GetRefreshToken();

        /// <summary>
        /// Gets token expiration time
        /// </summary>
        DateTime? GetTokenExpiry();

        /// <summary>
        /// Checks if user is currently authenticated
        /// </summary>
        bool IsAuthenticated();

        /// <summary>
        /// Checks if token is expired
        /// </summary>
        bool IsTokenExpired();

        /// <summary>
        /// Clears authentication token from store
        /// </summary>
        void Logout();

        /// <summary>
        /// Fetches a single item from the specified endpoint
        /// </summary>
        Task<T> GetSingleAsync<T>(string endpoint);

        /// <summary>
        /// Fetches a single item by ID from the specified endpoint
        /// </summary>
        Task<T> GetByIdAsync<T>(string endpoint, int id);

        /// <summary>
        /// Fetches a collection of items from the specified endpoint
        /// </summary>
        Task<IEnumerable<T>> GetAsync<T>(string endpoint, params KeyValuePair<string, string>[] qparams);
    }

    /// <summary>
    /// Authentication service supporting OAuth 2.0 Authorization Code Flow with PKCE and basic authentication
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AuthService> _logger;
        private readonly OAuthSettings _oauthSettings;
        private readonly string _authEndpoint;
        private readonly string apiBaseUrl;

        // Session keys
        private const string TOKEN_SESSION_KEY = "auth_token";
        private const string REFRESH_TOKEN_SESSION_KEY = "auth_refresh_token";
        private const string TOKEN_EXPIRY_SESSION_KEY = "auth_token_expiry";
        private const string USER_SESSION_KEY = "auth_user";
        private const string STATE_SESSION_KEY = "oauth_state";
        private const string CODE_VERIFIER_SESSION_KEY = "oauth_code_verifier";

        private readonly JsonSerializerOptions _jsonSerializerOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public AuthService(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, IConfiguration configuration, ILogger<AuthService> logger)
        {
            _httpClient = httpClient;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;

            // Load OAuth settings
            _oauthSettings = new OAuthSettings();
            configuration.GetSection("OAuth").Bind(_oauthSettings);

            apiBaseUrl = configuration?.GetValue<string>("ApiSettings:AuthBaseUrl") ?? "http://localhost:5001/api";
            _authEndpoint = $"{apiBaseUrl}/Auth/token";

            _logger.LogInformation("AuthService initialized | OAuth ClientId: {ClientId} | AuthEndpoint: {AuthEndpoint}",
                _oauthSettings.ClientId, _authEndpoint);
        }

        /// <summary>
        /// Authenticates user with username/password credentials
        /// </summary>
        public async Task<TokenResponse?> AuthenticateAsync(LoginRequest request)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var session = _httpContextAccessor.HttpContext?.Session;
            if (session == null)
            {
                _logger.LogError("Authentication failed: Session is not available");
                return new TokenResponse { Success = false, Message = "Session not available" };
            }

            try
            {
                var requestJson = JsonSerializer.Serialize(request, _jsonSerializerOptions);
                _logger.LogInformation("Authentication Request: POST {Endpoint} | User: {UserId} | Branch: {BranchId} | Payload Size: {PayloadSize} bytes",
                    _oauthSettings, request.Username, request.BranchId, requestJson.Length);

                var startTime = DateTime.UtcNow;
                var response = await _httpClient.PostAsJsonAsync(_authEndpoint, request, _jsonSerializerOptions);
                var duration = DateTime.UtcNow - startTime;

                _logger.LogInformation("Authentication Response: {Endpoint} | Status: {StatusCode} | Duration: {DurationMs}ms",
                    _authEndpoint, (int)response.StatusCode, duration.TotalMilliseconds);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning("Authentication failed: User {UserId} | Status: {StatusCode} | Error: {ErrorContent}",
                        request.Username, (int)response.StatusCode, errorContent);

                    return new TokenResponse
                    {
                        Success = false,
                        Message = $"Authentication failed: {response.StatusCode}"
                    };
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(responseJson, _jsonSerializerOptions);

                if (tokenResponse?.Success == true && !string.IsNullOrEmpty(tokenResponse.AccessToken))
                {
                    StoreTokenInSession(tokenResponse);
                    SetAuthorizationHeader(tokenResponse.AccessToken);

                    _logger.LogInformation("Authentication successful: User {UserId} | Token expires in {ExpiresIn}s | Response Size: {ResponseSize} bytes",
                        request.Username, tokenResponse.ExpiresIn, responseJson.Length);

                    return tokenResponse;
                }
                else
                {
                    _logger.LogWarning("Authentication response invalid: User {UserId} | Success: {Success} | Message: {Message}",
                        request.Username, tokenResponse?.Success ?? false, tokenResponse?.Message);

                    return tokenResponse ?? new TokenResponse
                    {
                        Success = false,
                        Message = "Invalid authentication response"
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Authentication exception: User {UserId} | Endpoint: {Endpoint} | Error: {ErrorMessage}",
                    request.Username, _authEndpoint, ex.Message);

                return new TokenResponse
                {
                    Success = false,
                    Message = $"Authentication error: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Generates OAuth 2.0 authorization code URL with PKCE
        /// </summary>
        public string GetAuthorizationCodeUrl(out string state, out string codeVerifier)
        {
            codeVerifier = PkceUtility.GenerateCodeVerifier();
            var codeChallenge = PkceUtility.GenerateCodeChallenge(codeVerifier);
            state = PkceUtility.GenerateState();

            SavePkceParameters(state, codeVerifier);

            var authUrl = $"{_oauthSettings.AuthorizeEndpoint}?" +
                $"client_id={Uri.EscapeDataString(_oauthSettings.ClientId ?? "")}&" +
                $"redirect_uri={Uri.EscapeDataString(_oauthSettings.RedirectUri ?? "")}&" +
                $"response_type={Uri.EscapeDataString(_oauthSettings.ResponseType ?? "")}&" +
                $"scope={Uri.EscapeDataString(_oauthSettings.Scope ?? "")}&" +
                $"state={Uri.EscapeDataString(state)}&" +
                $"code_challenge={Uri.EscapeDataString(codeChallenge)}&" +
                $"code_challenge_method=S256";

            _logger.LogInformation("OAuth authorization URL generated | State: {State} | Endpoint: {AuthorizeEndpoint}",
                state, _oauthSettings.AuthorizeEndpoint);

            return authUrl;
        }

        /// <summary>
        /// Exchanges OAuth authorization code for access token
        /// </summary>
        public async Task<TokenResponse?> ExchangeCodeForTokenAsync(string code, string codeVerifier, string state)
        {
            if (string.IsNullOrEmpty(code))
            {
                _logger.LogError("Authorization code is empty");
                return new TokenResponse { Success = false, Message = "Authorization code is required" };
            }

            var storedState = GetStoredState();
            if (storedState != state)
            {
                _logger.LogError("State parameter mismatch | Expected: {Expected} | Received: {Received}",
                    storedState, state);
                return new TokenResponse { Success = false, Message = "State parameter validation failed" };
            }

            try
            {
                var tokenRequest = new TokenRequest
                {
                    GrantType = "authorization_code",
                    Code = code,
                    ClientId = _oauthSettings.ClientId,
                    ClientSecret = _oauthSettings.ClientSecret,
                    RedirectUri = _oauthSettings.RedirectUri,
                    CodeVerifier = codeVerifier
                };

                _logger.LogInformation("Exchanging OAuth authorization code | TokenEndpoint: {TokenEndpoint}",
                    _oauthSettings.TokenEndpoint);

                var startTime = DateTime.UtcNow;
                var response = await _httpClient.PostAsJsonAsync(
                    _oauthSettings.TokenEndpoint,
                    tokenRequest,
                    _jsonSerializerOptions);
                var duration = DateTime.UtcNow - startTime;

                _logger.LogInformation("OAuth token endpoint response | Status: {StatusCode} | Duration: {DurationMs}ms",
                    (int)response.StatusCode, duration.TotalMilliseconds);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("OAuth code exchange failed | Status: {StatusCode} | Error: {ErrorContent}",
                        (int)response.StatusCode, errorContent);
                    return new TokenResponse
                    {
                        Success = false,
                        Message = $"Token exchange failed: {response.StatusCode}"
                    };
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(responseJson, _jsonSerializerOptions);

                if (tokenResponse?.Success == true && !string.IsNullOrEmpty(tokenResponse.AccessToken))
                {
                    StoreTokenInSession(tokenResponse);
                    SetAuthorizationHeader(tokenResponse.AccessToken);
                    // Create a handler to read the token
                    var handler = new JwtSecurityTokenHandler();

                    // Ensure it's a valid JWT format
                    if (!handler.CanReadToken(tokenResponse.AccessToken))
                    {
                        Console.WriteLine("Invalid JWT format.");

                        return tokenResponse ?? new TokenResponse
                        {
                            Success = false,
                            Message = "Invalid token response"
                        };
                    }

                    // Read token without validating signature
                    var token = handler.ReadJwtToken(tokenResponse.AccessToken);
                    tokenResponse.Username = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value;
                    tokenResponse.Roles = token.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();
                    tokenResponse.Email = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value;
                    DateTime.TryParse(token.ValidFrom.ToString(), out DateTime validfrom);
                    DateTime.TryParse(token.ValidTo.ToString(), out DateTime validTo);
                    TimeSpan tSpan = validTo - validfrom;
                    tokenResponse.ExpiresIn = tSpan.Seconds;
                    tokenResponse.BranchId = token.Claims.FirstOrDefault(c => c.Type == "BranchId") != null ? int.Parse(token.Claims.FirstOrDefault(c => c.Type == "BranchId")?.Value ?? "0") : 0;
                    tokenResponse.UserId = token.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
                    tokenResponse.TokenType = "Bearer";
                    tokenResponse.RefreshToken = tokenResponse.RefreshToken;
                    tokenResponse.Success = true;
                    StoreTokenInSession(tokenResponse);
                    _logger.LogInformation("OAuth token exchange successful | User: {UserId} | Token expires in: {ExpiresIn}s",
                        tokenResponse.UserId, tokenResponse.ExpiresIn);

                    return tokenResponse;
                }

                _logger.LogWarning("OAuth token response invalid | Message: {Message}", tokenResponse?.Message);
                return tokenResponse ?? new TokenResponse
                {
                    Success = false,
                    Message = "Invalid token response"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "OAuth code exchange exception | Endpoint: {TokenEndpoint}",
                    _oauthSettings.TokenEndpoint);
                return new TokenResponse
                {
                    Success = false,
                    Message = $"Token exchange error: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Refreshes expired access token using refresh token
        /// </summary>
        public async Task<TokenResponse?> RefreshAccessTokenAsync(string refreshToken)
        {
            if (string.IsNullOrEmpty(refreshToken))
            {
                _logger.LogError("Refresh token is empty");
                return null;
            }

            try
            {
                var tokenRequest = new TokenRequest
                {
                    GrantType = "refresh_token",
                    ClientId = _oauthSettings.ClientId,
                    ClientSecret = _oauthSettings.ClientSecret,
                    RefreshToken = refreshToken
                };

                _logger.LogInformation("Refreshing access token | TokenEndpoint: {TokenEndpoint}",
                    _oauthSettings.TokenEndpoint);

                var response = await _httpClient.PostAsJsonAsync(
                    _oauthSettings.TokenEndpoint,
                    tokenRequest,
                    _jsonSerializerOptions);

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Token refresh failed | Status: {StatusCode}",
                        (int)response.StatusCode);
                    return null;
                }

                var responseJson = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<TokenResponse>(responseJson, _jsonSerializerOptions);

                if (tokenResponse?.Success == true && !string.IsNullOrEmpty(tokenResponse.AccessToken))
                {
                    StoreTokenInSession(tokenResponse);
                    SetAuthorizationHeader(tokenResponse.AccessToken);
                    _logger.LogInformation("Access token refreshed successfully | Expires in: {ExpiresIn}s",
                        tokenResponse.ExpiresIn);
                    return tokenResponse;
                }

                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Token refresh exception");
                return null;
            }
        }

        /// <summary>
        /// Gets the current authentication token from session
        /// </summary>
        public string? GetToken()
        {
            var session = _httpContextAccessor.HttpContext?.Session;
            if (session == null)
                return null;

            return session.GetString(TOKEN_SESSION_KEY);
        }

        /// <summary>
        /// Gets the refresh token from session
        /// </summary>
        public string? GetRefreshToken()
        {
            var session = _httpContextAccessor.HttpContext?.Session;
            if (session == null)
                return null;

            return session.GetString(REFRESH_TOKEN_SESSION_KEY);
        }

        /// <summary>
        /// Gets token expiration time
        /// </summary>
        public DateTime? GetTokenExpiry()
        {
            var session = _httpContextAccessor.HttpContext?.Session;
            if (session == null)
                return null;

            var expiryStr = session.GetString(TOKEN_EXPIRY_SESSION_KEY);
            if (expiryStr != null && DateTime.TryParse(expiryStr, out var expiry))
                return expiry;

            return null;
        }

        /// <summary>
        /// Checks if user is currently authenticated
        /// </summary>
        public bool IsAuthenticated()
        {
            var token = GetToken();
            return !string.IsNullOrEmpty(token);
        }

        /// <summary>
        /// Checks if current token is expired
        /// </summary>
        public bool IsTokenExpired()
        {
            var expiry = GetTokenExpiry();
            if (expiry == null)
                return true;

            return DateTime.UtcNow >= expiry.Value.AddSeconds(-60); // Refresh 60 seconds before expiry
        }

        /// <summary>
        /// Gets stored OAuth state from session
        /// </summary>
        private string? GetStoredState()
        {
            var session = _httpContextAccessor.HttpContext?.Session;
            if (session == null)
                return null;

            return session.GetString(STATE_SESSION_KEY);
        }

        /// <summary>
        /// Saves PKCE parameters to session
        /// </summary>
        private void SavePkceParameters(string state, string codeVerifier)
        {
            var session = _httpContextAccessor.HttpContext?.Session;
            if (session != null)
            {
                session.SetString(STATE_SESSION_KEY, state);
                session.SetString(CODE_VERIFIER_SESSION_KEY, codeVerifier);
                _logger.LogDebug("PKCE parameters saved to session");
            }
        }

        /// <summary>
        /// Stores token and user info in session
        /// </summary>
        private void StoreTokenInSession(TokenResponse tokenResponse)
        {
            var session = _httpContextAccessor.HttpContext?.Session;
            if (session != null)
            {
                session.SetString(TOKEN_SESSION_KEY, tokenResponse.AccessToken!);

                if (!string.IsNullOrEmpty(tokenResponse.RefreshToken))
                {
                    session.SetString(REFRESH_TOKEN_SESSION_KEY, tokenResponse.RefreshToken);
                }

                var tokenExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn);
                session.SetString(TOKEN_EXPIRY_SESSION_KEY, tokenExpiry.ToString("O"));

                // Store user info if available
                if (!string.IsNullOrEmpty(tokenResponse.UserId))
                {
                    session.SetString("user_name", tokenResponse.Username!);
                    session.SetString(USER_SESSION_KEY, JsonSerializer.Serialize(new
                    {
                        tokenResponse.UserId,
                        tokenResponse.Username,
                        tokenResponse.Email,
                        tokenResponse.Roles
                    }, _jsonSerializerOptions));
                }
            }
        }

        /// <summary>
        /// Sets authorization header on HTTP client
        /// </summary>
        private void SetAuthorizationHeader(string token)
        {
            _httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);
        }

        /// <summary>
        /// Clears all authentication data from session and headers
        /// </summary>
        public void Logout()
        {
            var session = _httpContextAccessor.HttpContext?.Session;
            if (session != null)
            {
                session.Remove(TOKEN_SESSION_KEY);
                session.Remove(REFRESH_TOKEN_SESSION_KEY);
                session.Remove(TOKEN_EXPIRY_SESSION_KEY);
                session.Remove(USER_SESSION_KEY);
                session.Remove(STATE_SESSION_KEY);
                session.Remove(CODE_VERIFIER_SESSION_KEY);
                _logger.LogInformation("User logged out successfully - all session data cleared");
            }

            _httpClient.DefaultRequestHeaders.Authorization = null;
        }

        /// <summary>
        /// Fetches a single item by ID from the specified endpoint
        /// </summary>
        public async Task<T> GetByIdAsync<T>(string endpoint, int id)
        {
            try
            {
                var fullUrl = $"{apiBaseUrl}/{endpoint}/{id}";
                _logger.LogInformation($"Fetching item by ID from: {fullUrl}");
                // Retrieve current token from session
                var token = GetToken();

                if (!string.IsNullOrEmpty(token))
                {
                    // Attach Bearer token to Authorization header
                    _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                    _logger.LogDebug("Authorization header added to request: {RequestUri}", fullUrl);
                }
                else
                {
                    _logger.LogWarning("No authentication token found in session for request: {RequestUri}",
                       fullUrl);
                }
                var response = await _httpClient.GetAsync(fullUrl);
                response.EnsureSuccessStatusCode();

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<T>(json, _jsonSerializerOptions);

                _logger.LogInformation($"Successfully fetched item with ID {id}");
                return result!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to fetch {endpoint}/{id}");
                throw new Exception($"Failed to fetch {endpoint}/{id}: {ex.Message}", ex);
            }
        }


        /// <summary>
        /// Fetches a collection of items from the specified endpoint
        /// </summary>
        public async Task<IEnumerable<T>> GetAsync<T>(string endpoint, params KeyValuePair<string, string>[] qparams)
        {
            var fullUrl = $"{apiBaseUrl}/{endpoint}";
            try
            {
                QueryBuilder qbuilder = [];
                foreach (KeyValuePair<string, string> q in qparams)
                {
                    qbuilder.Append(q);
                }
                fullUrl += qbuilder.ToQueryString();
                _logger.LogInformation("API GET Request: {Endpoint} | URL: {FullUrl}", endpoint, fullUrl);

                var startTime = DateTime.UtcNow;
                var response = await _httpClient.GetAsync(fullUrl);
                var duration = DateTime.UtcNow - startTime;

                _logger.LogInformation("API GET Response: {Endpoint} | Status: {StatusCode} | Duration: {DurationMs}ms",
                    endpoint, (int)response.StatusCode, duration.TotalMilliseconds);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("API GET Error: {Endpoint} | Status: {StatusCode} | Error: {ErrorContent}",
                        endpoint, (int)response.StatusCode, errorContent);
                    throw new HttpRequestException($"API returned {response.StatusCode}: {errorContent}");
                }

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<IEnumerable<T>>(json, _jsonSerializerOptions) ?? Enumerable.Empty<T>();
                var itemCount = (result as List<T>)?.Count ?? 0;

                _logger.LogInformation("API GET Success: {Endpoint} | Items: {ItemCount} | Response Size: {ResponseSize} bytes",
                    endpoint, itemCount, json.Length);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "API GET Exception: {Endpoint} | Error: {ErrorMessage} | URL: {FullUrl}",
                    endpoint, ex.Message, fullUrl);
                throw new Exception($"Failed to fetch {endpoint}: {ex.Message}", ex);
            }
        }


        /// <summary>
        /// Fetches a single item from the specified endpoint
        /// </summary>
        public async Task<T> GetSingleAsync<T>(string endpoint)
        {
            try
            {
                var fullUrl = $"{apiBaseUrl}/{endpoint}";
                _logger.LogInformation($"Fetching single item from: {fullUrl}");

                var response = await _httpClient.GetAsync(fullUrl);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"API error {response.StatusCode}: {errorContent}");
                    throw new HttpRequestException($"API returned {response.StatusCode}: {errorContent}");
                }

                var json = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<T>(json, _jsonSerializerOptions);

                _logger.LogInformation("Successfully fetched single item");
                return result!;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to fetch {endpoint}");
                throw new Exception($"Failed to fetch {endpoint}: {ex.Message}", ex);
            }
        }
    }
}
