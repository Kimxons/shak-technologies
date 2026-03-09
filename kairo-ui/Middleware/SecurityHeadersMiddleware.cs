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
        private readonly IConfiguration _configuration;

        public SecurityHeadersMiddleware(RequestDelegate next, IWebHostEnvironment environment, IConfiguration configuration)
        {
            _next = next;
            _environment = environment;
            _configuration = configuration;
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

            // In development, allow localhost + configured API hosts
            if (_environment.IsDevelopment())
            {
                var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "'self'",
                    "ws://localhost:*",
                    "wss://localhost:*",
                    "http://localhost:*",
                    "https://localhost:*",
                    "http://172.16.2.31:3308"
                };

                var apiSettings = _configuration.GetSection("ApiSettings");
                foreach (var child in apiSettings.GetChildren())
                {
                    if (!child.Key.EndsWith("BaseUrl", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (Uri.TryCreate(child.Value, UriKind.Absolute, out var uri))
                    {
                        allowed.Add(uri.GetLeftPart(UriPartial.Authority));
                    }
                }

                var oauthUrl = _configuration["OAuth:TokenEndpoint"];
                if (Uri.TryCreate(oauthUrl, UriKind.Absolute, out var oauthUri))
                {
                    allowed.Add(oauthUri.GetLeftPart(UriPartial.Authority));
                }

                connectSrc = string.Join(' ', allowed);
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
