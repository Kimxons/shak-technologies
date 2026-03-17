using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;

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
                var createdByProp = type.GetProperty("CreatedBy", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var modifiedByProp = type.GetProperty("ModifiedBy", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var branchIdProp = type.GetProperty("OurBranchID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var bankIdProp = type.GetProperty("BankID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var moduleIdProp = type.GetProperty("ModuleID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var moduleTypeIdProp = type.GetProperty("ModuleTypeID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var relevantIdProp = type.GetProperty("RelevantID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);
                var accountIdProp = type.GetProperty("AccountID", BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase);

                var userValue = ResolveSessionValue("user_name", "user_id") ?? "web_portal";
                var branchValue = ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                var bankValue = ResolveSessionValue("bank_id", "bank_code") ?? "00";

                // Override OperatorID/CreatedBy/ModifiedBy if empty or a JS placeholder fallback
                if (operatorIdProp != null && IsPlaceholderUser(operatorIdProp.GetValue(requestData) as string))
                    operatorIdProp.SetValue(requestData, userValue);

                if (createdByProp != null && IsPlaceholderUser(createdByProp.GetValue(requestData) as string))
                    createdByProp.SetValue(requestData, userValue);

                if (modifiedByProp != null && IsPlaceholderUser(modifiedByProp.GetValue(requestData) as string))
                    modifiedByProp.SetValue(requestData, userValue);

                if (branchIdProp != null && string.IsNullOrWhiteSpace(branchIdProp.GetValue(requestData) as string))
                    branchIdProp.SetValue(requestData, branchValue);

                if (bankIdProp != null && string.IsNullOrWhiteSpace(bankIdProp.GetValue(requestData) as string))
                    bankIdProp.SetValue(requestData, bankValue);

                if (relevantIdProp != null && string.IsNullOrWhiteSpace(relevantIdProp.GetValue(requestData) as string))
                {
                    var accId = accountIdProp?.GetValue(requestData) as string;
                    if (!string.IsNullOrWhiteSpace(accId))
                        relevantIdProp.SetValue(requestData, accId);
                }

                if (moduleTypeIdProp != null && string.IsNullOrWhiteSpace(moduleTypeIdProp.GetValue(requestData) as string))
                    moduleTypeIdProp.SetValue(requestData, "A"); // Default to 'A' for Accounts maintenance

                if (!string.IsNullOrWhiteSpace(moduleId) && moduleIdProp != null)
                {
                    var currentModuleId = moduleIdProp.GetValue(requestData);
                    if (currentModuleId == null || (currentModuleId is string s && string.IsNullOrWhiteSpace(s)) || (currentModuleId is int i && i == 0))
                    {
                        if (moduleIdProp.PropertyType == typeof(int) || moduleIdProp.PropertyType == typeof(int?))
                            moduleIdProp.SetValue(requestData, int.Parse(moduleId));
                        else
                            moduleIdProp.SetValue(requestData, moduleId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring defaults for type {TypeName}", typeof(T).Name);
            }
        }

        public void EnsureDefaults(System.Collections.Generic.Dictionary<string, object> requestData, string? moduleId = null)
        {
            if (requestData == null) return;

            try
            {
                var userValue = ResolveSessionValue("user_name", "user_id") ?? "web_portal";
                var branchValue = ResolveSessionValue("branch_code", "branch_id") ?? string.Empty;
                var bankValue = ResolveSessionValue("bank_id", "bank_code") ?? "00";

                void SetIfEmpty(string key, object value)
                {
                    if (!requestData.ContainsKey(key) || requestData[key] == null || (requestData[key] is string s && string.IsNullOrWhiteSpace(s)))
                        requestData[key] = value;
                }

                // Override OperatorID/CreatedBy/ModifiedBy if empty or a JS placeholder fallback
                void SetUserIfPlaceholder(string key, object value)
                {
                    if (!requestData.ContainsKey(key) || requestData[key] == null || IsPlaceholderUser(requestData[key] as string ?? requestData[key]?.ToString()))
                        requestData[key] = value;
                }

                SetUserIfPlaceholder("OperatorID", userValue);
                SetUserIfPlaceholder("CreatedBy", userValue);
                SetUserIfPlaceholder("ModifiedBy", userValue);
                SetIfEmpty("OurBranchID", branchValue);
                SetIfEmpty("BankID", bankValue);
                SetIfEmpty("ModuleTypeID", "A");

                if (requestData.ContainsKey("AccountID") && !requestData.ContainsKey("RelevantID"))
                    requestData["RelevantID"] = requestData["AccountID"];

                if (!string.IsNullOrWhiteSpace(moduleId))
                    SetIfEmpty("ModuleID", moduleId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ensuring defaults for Dictionary");
            }
        }

        /// <summary>
        /// Returns true if the value is empty or a JS-side placeholder that should be
        /// replaced by the real session user (e.g. "SYSTEM", "web_portal").
        /// </summary>
        private static bool IsPlaceholderUser(string? value)
        {
            if (string.IsNullOrWhiteSpace(value)) return true;
            return value.Equals("SYSTEM", StringComparison.OrdinalIgnoreCase)
                || value.Equals("web_portal", StringComparison.OrdinalIgnoreCase);
        }

        public string? ResolveSessionValue(params string[] keys)
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

        public Dictionary<string, object> EnrichDefaults(Dictionary<string, object> requestData, params KeyValuePair<string, object>[] defaultValues)
        {

            void SetIfEmpty(string key, object value)
            {
                if (!requestData.ContainsKey(key) || requestData[key] == null || (requestData[key] is string s && string.IsNullOrWhiteSpace(s)))
                    requestData[key] = value;
            }
            foreach (var kvp in defaultValues)
            {
                SetIfEmpty(kvp.Key, kvp.Value);
            }
            return requestData;
        }

        public long? ResolveRequestDataLong(JsonNode? requestData, params string[] keys)
        {
            if (requestData == null)
            {
                return null;
            }

            if (TryGetRequestNodeValue(requestData, "RecordID", out var recordIdNode) && TryParseLong(recordIdNode, out var recordId))
            {
                return recordId;
            }

            foreach (var key in keys)
            {
                if (TryGetRequestDataNodeValue(requestData, key, out var valueNode) && TryParseLong(valueNode, out var parsedValue))
                {
                    return parsedValue;
                }
            }

            return null;
        }

        public short? ResolveRequestDataShort(JsonNode? requestData, params string[] keys)
        {
            if (requestData == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (TryGetRequestDataNodeValue(requestData, key, out var valueNode) && TryParseShort(valueNode, out var parsedValue))
                {
                    return parsedValue;
                }
            }

            return null;
        }

        public string? ResolveRequestDataString(JsonNode? requestData, params string[] keys)
        {
            if (requestData == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (TryGetRequestDataNodeValue(requestData, key, out var valueNode))
                {
                    return TryParseString(valueNode);
                }
            }

            return null;
        }

        public DateTime? ResolveRequestDataDateTime(JsonNode? requestData, params string[] keys)
        {
            if (requestData == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (TryGetRequestDataNodeValue(requestData, key, out var valueNode) && TryParseDateTime(valueNode, out var parsedValue))
                {
                    return parsedValue;
                }
            }

            return null;
        }

        public bool? ResolveRequestDataBool(JsonNode? requestData, params string[] keys)
        {
            if (requestData == null)
            {
                return null;
            }

            foreach (var key in keys)
            {
                if (TryGetRequestDataNodeValue(requestData, key, out var valueNode) && TryParseBool(valueNode, out var parsedValue))
                {
                    return parsedValue;
                }
            }

            return null;
        }

        private static bool TryGetRequestDataNodeValue(JsonNode requestData, string key, out JsonNode? valueNode)
        {
            valueNode = null;

            if (TryGetRequestNodeValue(requestData, key, out valueNode))
            {
                return true;
            }

            if (TryGetChildNodeValue(requestData, "Payload", key, out valueNode))
            {
                return true;
            }

            if (TryGetChildNodeValue(requestData, "RequestData", key, out valueNode))
            {
                return true;
            }

            return false;
        }

        private static bool TryGetChildNodeValue(JsonNode requestData, string childKey, string key, out JsonNode? valueNode)
        {
            valueNode = null;
            if (!TryGetRequestNodeValue(requestData, childKey, out var childNode) || childNode is not JsonObject childObject)
            {
                return false;
            }

            return TryGetObjectNodeValue(childObject, key, out valueNode);
        }

        private static bool TryGetRequestNodeValue(JsonNode requestData, string key, out JsonNode? valueNode)
        {
            valueNode = null;
            return requestData is JsonObject requestObject && TryGetObjectNodeValue(requestObject, key, out valueNode);
        }

        private static bool TryGetObjectNodeValue(JsonObject requestObject, string key, out JsonNode? valueNode)
        {
            if (requestObject.TryGetPropertyValue(key, out valueNode))
            {
                return true;
            }

            foreach (var property in requestObject)
            {
                if (string.Equals(property.Key, key, StringComparison.OrdinalIgnoreCase))
                {
                    valueNode = property.Value;
                    return true;
                }
            }

            valueNode = null;
            return false;
        }

        private static bool TryParseLong(JsonNode? valueNode, out long value)
        {
            value = 0;
            if (valueNode == null)
            {
                return false;
            }

            if (valueNode is JsonValue jsonValue)
            {
                if (jsonValue.TryGetValue<long>(out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<int>(out var intValue))
                {
                    value = intValue;
                    return true;
                }

                if (jsonValue.TryGetValue<short>(out var shortValue))
                {
                    value = shortValue;
                    return true;
                }

                if (jsonValue.TryGetValue<string>(out var textValue) && long.TryParse(textValue, out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<JsonElement>(out var jsonElement))
                {
                    return TryParseLong(jsonElement, out value);
                }
            }

            return long.TryParse(valueNode.ToString(), out value);
        }

        private static bool TryParseLong(JsonElement jsonElement, out long value)
        {
            value = 0;
            if (jsonElement.ValueKind == JsonValueKind.Number)
            {
                return jsonElement.TryGetInt64(out value);
            }

            return jsonElement.ValueKind == JsonValueKind.String && long.TryParse(jsonElement.GetString(), out value);
        }

        private static bool TryParseShort(JsonNode? valueNode, out short value)
        {
            value = 0;
            if (valueNode == null)
            {
                return false;
            }

            if (valueNode is JsonValue jsonValue)
            {
                if (jsonValue.TryGetValue<short>(out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<int>(out var intValue) && intValue >= short.MinValue && intValue <= short.MaxValue)
                {
                    value = (short)intValue;
                    return true;
                }

                if (jsonValue.TryGetValue<long>(out var longValue) && longValue >= short.MinValue && longValue <= short.MaxValue)
                {
                    value = (short)longValue;
                    return true;
                }

                if (jsonValue.TryGetValue<string>(out var textValue) && short.TryParse(textValue, out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<JsonElement>(out var jsonElement))
                {
                    if (jsonElement.ValueKind == JsonValueKind.Number && jsonElement.TryGetInt16(out value))
                    {
                        return true;
                    }

                    if (jsonElement.ValueKind == JsonValueKind.String && short.TryParse(jsonElement.GetString(), out value))
                    {
                        return true;
                    }
                }
            }

            return short.TryParse(valueNode.ToString(), out value);
        }

        private static string? TryParseString(JsonNode? valueNode)
        {
            if (valueNode == null)
            {
                return null;
            }

            if (valueNode is JsonValue jsonValue)
            {
                if (jsonValue.TryGetValue<string>(out var textValue))
                {
                    return textValue;
                }

                if (jsonValue.TryGetValue<JsonElement>(out var jsonElement))
                {
                    return jsonElement.ValueKind == JsonValueKind.String ? jsonElement.GetString() : jsonElement.ToString();
                }
            }

            return valueNode.ToString();
        }

        private static bool TryParseDateTime(JsonNode? valueNode, out DateTime value)
        {
            value = default;
            if (valueNode == null)
            {
                return false;
            }

            if (valueNode is JsonValue jsonValue)
            {
                if (jsonValue.TryGetValue<DateTime>(out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<long>(out var epochValue))
                {
                    value = DateTimeOffset.FromUnixTimeMilliseconds(epochValue).UtcDateTime;
                    return true;
                }

                if (jsonValue.TryGetValue<string>(out var textValue) && DateTime.TryParse(textValue, out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<JsonElement>(out var jsonElement))
                {
                    if (jsonElement.ValueKind == JsonValueKind.String && DateTime.TryParse(jsonElement.GetString(), out value))
                    {
                        return true;
                    }

                    if (jsonElement.ValueKind == JsonValueKind.Number && jsonElement.TryGetInt64(out var epochMs))
                    {
                        value = DateTimeOffset.FromUnixTimeMilliseconds(epochMs).UtcDateTime;
                        return true;
                    }
                }
            }

            return DateTime.TryParse(valueNode.ToString(), out value);
        }

        private static bool TryParseBool(JsonNode? valueNode, out bool value)
        {
            value = false;
            if (valueNode == null)
            {
                return false;
            }

            if (valueNode is JsonValue jsonValue)
            {
                if (jsonValue.TryGetValue<bool>(out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<int>(out var intValue))
                {
                    value = intValue > 0;
                    return true;
                }

                if (jsonValue.TryGetValue<long>(out var longValue))
                {
                    value = longValue > 0;
                    return true;
                }

                if (jsonValue.TryGetValue<string>(out var textValue) && bool.TryParse(textValue, out value))
                {
                    return true;
                }

                if (jsonValue.TryGetValue<JsonElement>(out var jsonElement))
                {
                    if (jsonElement.ValueKind == JsonValueKind.True || jsonElement.ValueKind == JsonValueKind.False)
                    {
                        value = jsonElement.GetBoolean();
                        return true;
                    }

                    if (jsonElement.ValueKind == JsonValueKind.String && bool.TryParse(jsonElement.GetString(), out value))
                    {
                        return true;
                    }

                    if (jsonElement.ValueKind == JsonValueKind.Number && jsonElement.TryGetInt32(out var numericValue))
                    {
                        value = numericValue > 0;
                        return true;
                    }
                }
            }

            return bool.TryParse(valueNode.ToString(), out value);
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
