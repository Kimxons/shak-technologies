using kairo_ui.Models;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using System.Reflection;

namespace kairo_ui.Controllers
{
    /// <summary>
    /// Health check endpoint for monitoring and orchestration
    /// Used by load balancers, Kubernetes, Docker, etc.
    /// </summary>
    [ApiController]
    [Route("[controller]")]
    public class HealthController : ControllerBase
    {
        private readonly ILogger<HealthController> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IConfiguration _configuration;

        public HealthController(
            ILogger<HealthController> logger,
            IHttpContextAccessor httpContextAccessor,
            IConfiguration configuration)
        {
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _configuration = configuration;
        }

        /// <summary>
        /// Simple healthcheck - responds with 200 if application is running
        /// </summary>
        [HttpGet]
        public IActionResult Index()
        {
            return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
        }

        /// <summary>
        /// Detailed health check - verifies all components
        /// </summary>
        [HttpGet("detailed")]
        public IActionResult Detailed()
        {
            var stopwatch = Stopwatch.StartNew();
            var assembly = Assembly.GetExecutingAssembly();
            var version = assembly.GetName().Version?.ToString() ?? "unknown";
            var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown";

            try
            {
                var healthDetails = new HealthCheckDetails
                {
                    Application = CheckApplicationHealth(),
                    Session = CheckSessionHealth(),
                    OAuth = CheckOAuthHealth(),
                    Configuration = CheckConfigurationHealth()
                };

                stopwatch.Stop();

                // Determine overall status
                var overallStatus = healthDetails.Application?.Status == "healthy"
                    && healthDetails.Session?.Status == "healthy"
                    && healthDetails.Configuration?.Status == "healthy"
                    ? "healthy"
                    : "degraded";

                var response = new HealthCheckResponse
                {
                    Status = overallStatus,
                    Timestamp = DateTime.UtcNow,
                    Version = version,
                    Environment = environment,
                    Details = healthDetails
                };

                var statusCode = overallStatus == "healthy" ? StatusCodes.Status200OK : StatusCodes.Status503ServiceUnavailable;
                
                _logger.LogInformation("Health check completed | Status: {Status} | Duration: {DurationMs}ms",
                    overallStatus, stopwatch.ElapsedMilliseconds);

                return StatusCode(statusCode, response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed with exception");
                stopwatch.Stop();

                var response = new HealthCheckResponse
                {
                    Status = "unhealthy",
                    Timestamp = DateTime.UtcNow,
                    Version = version,
                    Environment = environment,
                    Details = new HealthCheckDetails
                    {
                        Application = new ComponentHealth
                        {
                            Status = "unhealthy",
                            Message = ex.Message,
                            ResponseTimeMs = stopwatch.ElapsedMilliseconds
                        }
                    }
                };

                return StatusCode(StatusCodes.Status503ServiceUnavailable, response);
            }
        }

        /// <summary>
        /// Liveness probe - indicates if application is running (Kubernetes)
        /// </summary>
        [HttpGet("live")]
        public IActionResult Live()
        {
            _logger.LogDebug("Liveness probe called");
            return Ok(new { status = "alive", timestamp = DateTime.UtcNow });
        }

        /// <summary>
        /// Readiness probe - indicates if application is ready to handle traffic (Kubernetes)
        /// </summary>
        [HttpGet("ready")]
        public IActionResult Ready()
        {
            try
            {
                var stopwatch = Stopwatch.StartNew();

                // Check critical dependencies
                var sessionOk = _httpContextAccessor.HttpContext != null;
                var configOk = _configuration != null;

                stopwatch.Stop();

                if (!sessionOk || !configOk)
                {
                    _logger.LogWarning("Readiness check failed | SessionOk: {SessionOk} | ConfigOk: {ConfigOk}",
                        sessionOk, configOk);
                    return StatusCode(StatusCodes.Status503ServiceUnavailable, 
                        new { status = "not_ready", timestamp = DateTime.UtcNow });
                }

                _logger.LogDebug("Readiness probe check completed in {DurationMs}ms", stopwatch.ElapsedMilliseconds);
                return Ok(new { status = "ready", timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Readiness check failed");
                return StatusCode(StatusCodes.Status503ServiceUnavailable, 
                    new { status = "not_ready", error = ex.Message });
            }
        }

        /// <summary>
        /// Startup probe - indicates if application has fully started (Kubernetes)
        /// </summary>
        [HttpGet("startup")]
        public IActionResult Startup()
        {
            try
            {
                _logger.LogDebug("Startup probe called");
                
                // Verify critical systems are initialized
                var configLoaded = _configuration != null && 
                    !string.IsNullOrEmpty(_configuration.GetValue<string>("ApiSettings:BaseUrl"));

                if (!configLoaded)
                {
                    _logger.LogWarning("Startup check failed - configuration not fully loaded");
                    return StatusCode(StatusCodes.Status503ServiceUnavailable,
                        new { status = "starting", timestamp = DateTime.UtcNow });
                }

                return Ok(new { status = "started", timestamp = DateTime.UtcNow });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Startup check failed");
                return StatusCode(StatusCodes.Status503ServiceUnavailable,
                    new { status = "starting", error = ex.Message });
            }
        }

        /// <summary>
        /// Checks application component health
        /// </summary>
        private ComponentHealth CheckApplicationHealth()
        {
            var stopwatch = Stopwatch.StartNew();
            try
            {
                // Check if application is responding
                var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Unknown";
                stopwatch.Stop();

                return new ComponentHealth
                {
                    Status = "healthy",
                    Message = $"Application is running ({environment})",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new ComponentHealth
                {
                    Status = "unhealthy",
                    Message = $"Application check failed: {ex.Message}",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
        }

        /// <summary>
        /// Checks session capability
        /// </summary>
        private ComponentHealth CheckSessionHealth()
        {
            var stopwatch = Stopwatch.StartNew();
            try
            {
                var httpContext = _httpContextAccessor.HttpContext;
                var session = httpContext?.Session;

                if (session == null)
                {
                    stopwatch.Stop();
                    return new ComponentHealth
                    {
                        Status = "warning",
                        Message = "Session not available in current context",
                        ResponseTimeMs = stopwatch.ElapsedMilliseconds
                    };
                }

                // Try to access session - indicates if it's working
                var testValue = session.GetString("_health_check_test");
                session.SetString("_health_check_test", "ok");
                session.Remove("_health_check_test");

                stopwatch.Stop();

                return new ComponentHealth
                {
                    Status = "healthy",
                    Message = "Session storage is operational",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new ComponentHealth
                {
                    Status = "degraded",
                    Message = $"Session check failed: {ex.Message}",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
        }

        /// <summary>
        /// Checks OAuth configuration
        /// </summary>
        private ComponentHealth CheckOAuthHealth()
        {
            var stopwatch = Stopwatch.StartNew();
            try
            {
                var clientId = _configuration.GetValue<string>("OAuth:ClientId");
                var tokenEndpoint = _configuration.GetValue<string>("OAuth:TokenEndpoint");

                stopwatch.Stop();

                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(tokenEndpoint))
                {
                    return new ComponentHealth
                    {
                        Status = "warning",
                        Message = "OAuth configuration incomplete",
                        ResponseTimeMs = stopwatch.ElapsedMilliseconds
                    };
                }

                return new ComponentHealth
                {
                    Status = "healthy",
                    Message = $"OAuth configured (ClientId: {clientId})",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new ComponentHealth
                {
                    Status = "degraded",
                    Message = $"OAuth check failed: {ex.Message}",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
        }

        /// <summary>
        /// Checks configuration loading
        /// </summary>
        private ComponentHealth CheckConfigurationHealth()
        {
            var stopwatch = Stopwatch.StartNew();
            try
            {
                var apiBaseUrl = _configuration.GetValue<string>("ApiSettings:BaseUrl");
                var apiTimeout = _configuration.GetValue<int>("ApiSettings:HttpClientTimeoutSeconds", -1);
                var sessionTimeout = _configuration.GetValue<int>("Session:IdleTimeoutMinutes", -1);

                stopwatch.Stop();

                if (string.IsNullOrEmpty(apiBaseUrl) || apiTimeout <= 0 || sessionTimeout <= 0)
                {
                    return new ComponentHealth
                    {
                        Status = "warning",
                        Message = "Configuration incomplete or invalid",
                        ResponseTimeMs = stopwatch.ElapsedMilliseconds
                    };
                }

                return new ComponentHealth
                {
                    Status = "healthy",
                    Message = $"Configuration loaded (API: {apiTimeout}s timeout, Session: {sessionTimeout}min timeout)",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new ComponentHealth
                {
                    Status = "unhealthy",
                    Message = $"Configuration check failed: {ex.Message}",
                    ResponseTimeMs = stopwatch.ElapsedMilliseconds
                };
            }
        }
    }
}
