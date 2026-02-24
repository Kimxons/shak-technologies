using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Extensions;
using Serilog;
using Serilog.Context;
using System.Text;

namespace ClientDocumentApi.Middleware
{
    /// <summary>
    /// Middleware for logging HTTP request and response details
    /// </summary>
    public class RequestResponseLoggingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly Serilog.ILogger _logger;

        public RequestResponseLoggingMiddleware(RequestDelegate next, Serilog.ILogger logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Log request
            await LogRequest(context);

            // Store original response body stream
            var originalBodyStream = context.Response.Body;

            using (var responseBody = new MemoryStream())
            {
                context.Response.Body = responseBody;

                try
                {
                    await _next(context);
                }
                catch (Exception ex)
                {
                    _logger.Error(ex, "Unhandled exception in request processing for {RequestPath}", context.Request.Path);
                    throw;
                }
                finally
                {
                    // Log response
                    await LogResponse(context);

                    // Copy response body to original stream
                    await responseBody.CopyToAsync(originalBodyStream);
                    context.Response.Body = originalBodyStream;
                }
            }
        }

        private async Task LogRequest(HttpContext context)
        {
            var request = context.Request;
            var body = string.Empty;

            // Only log body for POST, PUT, PATCH requests
            if (request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase) ||
                request.Method.Equals("PUT", StringComparison.OrdinalIgnoreCase) ||
                request.Method.Equals("PATCH", StringComparison.OrdinalIgnoreCase))
            {
                request.EnableBuffering();

                if (request.Body.CanRead && request.ContentLength > 0)
                {
                    using (var reader = new StreamReader(request.Body, Encoding.UTF8, true, 1024, leaveOpen: true))
                    {
                        body = await reader.ReadToEndAsync();
                        request.Body.Position = 0;
                    }

                    // Truncate large bodies
                    if (body.Length > 1000)
                    {
                        body = body.Substring(0, 1000) + "... (truncated)";
                    }
                }
            }

            using (LogContext.PushProperty("RequestId", context.TraceIdentifier))
            {
                _logger.Information(
                    "HTTP Request: {RequestMethod} {RequestPath} | Host: {RequestHost} | ContentType: {ContentType} | Body: {RequestBody}",
                    request.Method,
                    request.GetDisplayUrl(),
                    request.Host.Value,
                    request.ContentType,
                    body);
            }
        }

        private async Task LogResponse(HttpContext context)
        {
            var response = context.Response;
            var body = string.Empty;

            // Log response body for JSON responses
            if (response.Body.CanSeek)
            {
                response.Body.Seek(0, SeekOrigin.Begin);

                using (var reader = new StreamReader(response.Body, Encoding.UTF8, true, 1024, leaveOpen: true))
                {
                    body = await reader.ReadToEndAsync();
                    response.Body.Seek(0, SeekOrigin.Begin);

                    // Truncate large bodies
                    if (body.Length > 1000)
                    {
                        body = body.Substring(0, 1000) + "... (truncated)";
                    }
                }
            }

            using (LogContext.PushProperty("RequestId", context.TraceIdentifier))
            {
                _logger.Information(
                    "HTTP Response: {ResponseStatusCode} | Path: {RequestPath} | ContentType: {ContentType} | Body: {ResponseBody}",
                    response.StatusCode,
                    context.Request.Path,
                    response.ContentType,
                    body);
            }
        }
    }

    /// <summary>
    /// Extension method for adding request/response logging middleware
    /// </summary>
    public static class RequestResponseLoggingMiddlewareExtensions
    {
        public static IApplicationBuilder UseRequestResponseLogging(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<RequestResponseLoggingMiddleware>();
        }
    }
}
