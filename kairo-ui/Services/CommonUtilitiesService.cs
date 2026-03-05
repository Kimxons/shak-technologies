using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Reflection;

namespace kairo_ui.Services
{
    /// <summary>
    /// Common utilities service providing shared utility methods across the application
    /// </summary>
    public class CommonUtilitiesService : ICommonUtilitiesService
    {
        private readonly ILogger<CommonUtilitiesService> _logger;
        private readonly IConfiguration _configuration;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CommonUtilitiesService(
            ILogger<CommonUtilitiesService> logger,
            IConfiguration configuration,
            IHttpContextAccessor httpContextAccessor)
        {
            _logger = logger;
            _configuration = configuration;
            _httpContextAccessor = httpContextAccessor;
        }
        public void EnsureDefaults<T>(T requestData, string? moduleId = null) where T : class
        {
            if (requestData == null)
            {
                _logger.LogWarning("EnsureDefaults called with null requestData of type {TypeName}", typeof(T).Name);
                return;
            }

            try
            {
                var type = requestData.GetType();
                var operatorIdProp = type.GetProperty("OperatorID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var branchIdProp = type.GetProperty("OurBranchID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var bankIdProp = type.GetProperty("BankID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var moduleIdProp = type.GetProperty("ModuleID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

                if (operatorIdProp != null && string.IsNullOrWhiteSpace(operatorIdProp.GetValue(requestData) as string))
                {
                    operatorIdProp.SetValue(requestData, ResolveSessionValue("user_name", "user_id") ?? "web_portal");
                }

                if (branchIdProp != null && string.IsNullOrWhiteSpace(branchIdProp.GetValue(requestData) as string))
                {
                    branchIdProp.SetValue(requestData, ResolveSessionValue("branch_code", "branch_id") ?? string.Empty);
                }

                if (bankIdProp != null && string.IsNullOrWhiteSpace(bankIdProp.GetValue(requestData) as string))
                {
                    bankIdProp.SetValue(requestData, ResolveSessionValue("bank_id", "bank_code") ?? "00");
                }

                if (!string.IsNullOrWhiteSpace(moduleId)
                    && moduleIdProp != null
                    && string.IsNullOrWhiteSpace(moduleIdProp.GetValue(requestData) as string))
                {
                    moduleIdProp.SetValue(requestData, moduleId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring defaults for type {TypeName}", typeof(T).Name);
            }
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            var session = _httpContextAccessor?.HttpContext?.Session;
            if (session == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                var value = session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }
        ///// <summary>
        ///// Ensures default values are set on the request data object.
        ///// Attempts to set properties like ModuleId with provided values or defaults.
        ///// </summary>
        ///// <typeparam name="T">The type of the request data (must be a reference type)</typeparam>
        ///// <param name="requestData">The request data object to apply defaults to</param>
        ///// <param name="moduleId">Optional module ID to set as default if available</param>
        ///// <returns>The request data object with defaults applied</returns>
        //public T EnsureDefaults<T>(T requestData, string? moduleId = null) where T : class
        //{
        //    if (requestData == null)
        //    {
        //        _logger.LogWarning("EnsureDefaults called with null requestData of type {TypeName}", typeof(T).Name);
        //        return requestData;
        //    }

        //    try
        //    {
        //        var type = typeof(T);
        //        var properties = type.GetProperties(
        //            BindingFlags.Public | 
        //            BindingFlags.Instance | 
        //            BindingFlags.IgnoreCase);

        //        // Try to set ModuleId if provided and property exists
        //        if (!string.IsNullOrWhiteSpace(moduleId))
        //        {
        //            var moduleIdProp = Array.Find(properties, p => p.Name.Equals("ModuleId", StringComparison.OrdinalIgnoreCase));
        //            if (moduleIdProp != null && moduleIdProp.CanWrite)
        //            {
        //                object? currentValue = moduleIdProp.GetValue(requestData);
        //                if (currentValue == null || (currentValue is string str && string.IsNullOrWhiteSpace(str)))
        //                {
        //                    moduleIdProp.SetValue(requestData, moduleId);
        //                    _logger.LogDebug("Set ModuleId to '{ModuleId}' on {TypeName}", moduleId, type.Name);
        //                }
        //            }
        //        }

        //        // Try to set CreatedDate if it's null and property exists
        //        var createdDateProp = Array.Find(properties, p => p.Name.Equals("CreatedDate", StringComparison.OrdinalIgnoreCase));
        //        if (createdDateProp != null && createdDateProp.CanWrite)
        //        {
        //            object? currentValue = createdDateProp.GetValue(requestData);
        //            if (currentValue == null || (currentValue is DateTime dt && dt == default(DateTime)))
        //            {
        //                createdDateProp.SetValue(requestData, DateTime.UtcNow);
        //                _logger.LogDebug("Set CreatedDate to current UTC time on {TypeName}", type.Name);
        //            }
        //        }

        //        // Try to set CreatedBy if it's empty and property exists
        //        var createdByProp = Array.Find(properties, p => p.Name.Equals("CreatedBy", StringComparison.OrdinalIgnoreCase));
        //        if (createdByProp != null && createdByProp.CanWrite)
        //        {
        //            object? currentValue = createdByProp.GetValue(requestData);
        //            if (currentValue == null || (currentValue is string str && string.IsNullOrWhiteSpace(str)))
        //            {
        //                var currentUser = GetCurrentUserId();
        //                if (!string.IsNullOrWhiteSpace(currentUser))
        //                {
        //                    createdByProp.SetValue(requestData, currentUser);
        //                    _logger.LogDebug("Set CreatedBy to current user on {TypeName}", type.Name);
        //                }
        //            }
        //        }

        //        _logger.LogDebug("EnsureDefaults completed successfully for type {TypeName}", type.Name);
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "Error occurred while ensuring defaults for type {TypeName}", typeof(T).Name);
        //        // Don't throw - gracefully continue with the request
        //    }

        //    return requestData;
        //}

        ///// <summary>
        ///// Gets the current authenticated user ID from the HTTP context
        ///// </summary>
        ///// <returns>The user ID if available; otherwise null</returns>
        //private string? GetCurrentUserId()
        //{
        //    try
        //    {
        //        var httpContext = _httpContextAccessor?.HttpContext;
        //        if (httpContext?.User?.Identity?.IsAuthenticated == true)
        //        {
        //            var nameClaim = httpContext.User.FindFirst("sub") 
        //                ?? httpContext.User.FindFirst("preferred_username")
        //                ?? httpContext.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);

        //            return nameClaim?.Value;
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogWarning(ex, "Failed to retrieve current user ID from HTTP context");
        //    }

        //    return null;
        //}
    }
}
