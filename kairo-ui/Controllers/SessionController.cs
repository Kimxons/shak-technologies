using kairo_ui.Models.Login;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;
using System.Threading.Tasks;

namespace kairo_ui.Controllers
{
    /// <summary>
    /// Session management controller - handles session extension and re-authentication
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SessionController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<SessionController> _logger;
        private readonly IConfiguration _configuration;

        // Session keys (must match AuthService)
        private const string TOKEN_SESSION_KEY = "auth_token";
        private const string USER_SESSION_KEY = "auth_user";
        private const string USERNAME_SESSION_KEY = "user_name";

        public SessionController(
            IAuthService authService,
            IHttpContextAccessor httpContextAccessor,
            ILogger<SessionController> logger,
            IConfiguration configuration)
        {
            _authService = authService;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
            _configuration = configuration;
        }

        /// <summary>
        /// Gets current user information for session re-authentication modal
        /// </summary>
        [HttpGet("current-user")]
        public IActionResult GetCurrentUser()
        {
            try
            {
                var session = HttpContext.Session;
                var username = session.GetString(USERNAME_SESSION_KEY);

                if (string.IsNullOrEmpty(username))
                {
                    _logger.LogWarning("Session expired: No username found in session");
                    return Unauthorized(new { message = "Session expired. Please login again." });
                }

                return Ok(new
                {
                    username = username,
                    sessionExpiredAt = DateTime.UtcNow.ToString("O")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving current user");
                return StatusCode(500, new { message = "Error retrieving user information" });
            }
        }

        /// <summary>
        /// Re-authenticates user with password to extend session
        /// </summary>
        [HttpPost("renew")]
        public async Task<IActionResult> RenewSession([FromBody] RenewSessionRequest request)
        {
            try
            {
                if (request == null || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new { message = "Password is required" });
                }

                var session = HttpContext.Session;
                var username = session.GetString(USERNAME_SESSION_KEY);

                if (string.IsNullOrEmpty(username))
                {
                    _logger.LogWarning("Session renewal failed: No username in session");
                    return Unauthorized(new { message = "Session has expired completely. Please login again." });
                }

                // Create re-authentication request
                var authRequest = new LoginRequest
                {
                    Username = username,
                    Password = request.Password,
                    BranchId = (request.BranchId ?? 0).ToString()  // Convert int to string for BranchId
                };

                _logger.LogInformation("Attempting session renewal for user: {Username}", username);

                // Re-authenticate with the provided password
                var tokenResponse = await _authService.AuthenticateAsync(authRequest);

                if (tokenResponse?.Success == true && !string.IsNullOrEmpty(tokenResponse.AccessToken))
                {
                    _logger.LogInformation("Session successfully renewed for user: {Username}", username);

                    // Access token was already stored in session by AuthService.AuthenticateAsync
                    // The HttpContext is automatically updated with the new session timeout
                    return Ok(new
                    {
                        success = true,
                        message = "Session renewed successfully",
                        expiresIn = tokenResponse.ExpiresIn,
                        newSessionExpiry = DateTime.UtcNow.AddSeconds(tokenResponse.ExpiresIn).ToString("O")
                    });
                }
                else
                {
                    _logger.LogWarning("Session renewal failed for user: {Username} - Invalid credentials", username);
                    return Unauthorized(new
                    {
                        success = false,
                        message = "Invalid credentials. Session renewal failed.",
                        errorCode = "INVALID_CREDENTIALS"
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error renewing session");
                return StatusCode(500, new { message = "Error renewing session: " + ex.Message });
            }
        }

        /// <summary>
        /// Check if session is still valid
        /// </summary>
        [HttpGet("check")]
        public IActionResult CheckSession()
        {
            try
            {
                var session = HttpContext.Session;
                var token = session.GetString(TOKEN_SESSION_KEY);
                var username = session.GetString(USERNAME_SESSION_KEY);

                var isValid = !string.IsNullOrEmpty(token) && !string.IsNullOrEmpty(username);

                if (!isValid)
                {
                    _logger.LogWarning("Session check failed: Session appears to be expired");
                }

                return Ok(new
                {
                    isValid = isValid,
                    username = username,
                    checkedAt = DateTime.UtcNow.ToString("O")
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking session");
                return StatusCode(500, new { message = "Error checking session" });
            }
        }

        /// <summary>
        /// Force logout (different from re-auth modal decline)
        /// </summary>
        [HttpPost("logout")]
        public IActionResult LogoutSession()
        {
            try
            {
                _authService.Logout();
                _logger.LogInformation("User session terminated via SessionController");
                return Ok(new { message = "Logged out successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during logout");
                return StatusCode(500, new { message = "Error during logout" });
            }
        }
    }

    /// <summary>
    /// Request model for session renewal
    /// </summary>
    public class RenewSessionRequest
    {
        public string? Password { get; set; }
        public int? BranchId { get; set; }
        public string? MfaCode { get; set; }  // For future MFA support
    }
}
