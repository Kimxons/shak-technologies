using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace kairo_ui.Middleware
{
    /// <summary>
    /// Middleware to redirect unauthenticated users to login page
    /// </summary>
    public class AuthenticationRedirectMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<AuthenticationRedirectMiddleware> _logger;
        private const string TOKEN_SESSION_KEY = "auth_token";

        public AuthenticationRedirectMiddleware(
            RequestDelegate next,
            ILogger<AuthenticationRedirectMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var path = context.Request.Path.Value?.ToLower() ?? "";
            
            // Skip authentication check for login page, OAuth endpoints, static assets, and health checks
            if (path.StartsWith("/login") || 
                path.StartsWith("/health") ||
                path.StartsWith("/assets") || 
                path.StartsWith("/lib") ||
                path.StartsWith("/fonts") ||
                path.StartsWith("/css") || 
                path.StartsWith("/js") || 
                path.StartsWith("/images") ||
                path.Contains(".css") ||
                path.Contains(".js") ||
                path.Contains(".woff") ||
                path.Contains(".woff2") ||
                path.Contains(".png") ||
                path.Contains(".jpg") ||
                path.Contains(".ico"))
            {
                await _next(context);
                return;
            }

            // Check if user has valid session token
            var token = context.Session.GetString(TOKEN_SESSION_KEY);
            
            if (string.IsNullOrEmpty(token) && !path.StartsWith("/login"))
            {
                _logger.LogWarning("Unauthenticated access attempt to: {Path} from {RemoteIp}", 
                    path, context.Connection.RemoteIpAddress);
                
                context.Response.Redirect("/login");
                return;
            }

            await _next(context);
        }
    }

    /// <summary>
    /// Extension method to register the middleware
    /// </summary>
    public static class AuthenticationRedirectMiddlewareExtensions
    {
        public static IApplicationBuilder UseAuthenticationRedirect(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<AuthenticationRedirectMiddleware>();
        }
    }
}
