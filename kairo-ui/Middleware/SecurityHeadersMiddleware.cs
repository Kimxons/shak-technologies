using Microsoft.AspNetCore.Http;

namespace kairo_ui.Middleware
{
    /// <summary>
    /// Middleware to add security headers to all HTTP responses
    /// </summary>
    public class SecurityHeadersMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IWebHostEnvironment _environment;

        public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment)
        {
            _next = next;
            _environment = environment;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Prevent clickjacking attacks
            //context.Response.Headers.Append("X-Frame-Options", "DENY");
            context.Response.Headers.Append("X-Frame-Options", "SAMEORIGIN");

            // Prevent MIME-sniffing
            context.Response.Headers.Append("X-Content-Type-Options", "nosniff");

            // Enable XSS protection in older browsers
            context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");

            // Control referrer information
            context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");

            // Content Security Policy - adjust based on environment
            var connectSrc = "'self'";

            // In development, allow localhost connections for Browser Link and WebSockets
            if (_environment.IsDevelopment())
            {
                connectSrc = "'self' ws://localhost:* wss://localhost:* http://localhost:* https://localhost:*  http://172.16.2.31:*";
            }

            context.Response.Headers.Append("Content-Security-Policy",
                "default-src 'self'; " +
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
                "font-src 'self' data:; " +
                "img-src 'self' data: https:; " +
                $"connect-src {connectSrc};");

            // Permissions Policy (formerly Feature Policy)
            context.Response.Headers.Append("Permissions-Policy",
                "geolocation=(), microphone=(), camera=()");

            await _next(context);
        }
    }

    /// <summary>
    /// Extension method to register the middleware
    /// </summary>
    public static class SecurityHeadersMiddlewareExtensions
    {
        public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<SecurityHeadersMiddleware>();
        }
    }
}
