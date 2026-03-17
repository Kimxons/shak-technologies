using System;
using System.Text.Json.Nodes;

namespace kairo_ui.Services
{
    /// <summary>
    /// Common utilities service for shared utility methods across the application
    /// </summary>
    public interface ICommonUtilitiesService
    {
        ///// <summary>
        ///// Ensures default values are set on the request data object
        ///// </summary>
        ///// <typeparam name="T">The type of the request data (must be a reference type)</typeparam>
        ///// <param name="requestData">The request data object to apply defaults to</param>
        ///// <param name="moduleId">Optional module ID to set as default if available</param>
        ///// <returns>The request data object with defaults applied</returns>
        //T EnsureDefaults<T>(T requestData, string? moduleId = null) where T : class;
        /// <summary>
        /// Ensures default values are set on the request data object
        /// </summary>
        /// <typeparam name="T">The type of the request data (must be a reference type)</typeparam>
        /// <param name="requestData">The request data object to apply defaults to</param>
        /// <param name="moduleId">Optional module ID to set as default if available</param>
        /// <returns>The request data object with defaults applied</returns>
        void EnsureDefaults<T>(T requestData, string? moduleId = null) where T : class;
        void EnsureDefaults(Dictionary<string, object> requestData, string? moduleId = null);
        void EnsureDefaults(MultipartFormDataContent requestData, string? moduleId = null);
        string? ResolveSessionValue(params string[] keys);
        Dictionary<string, object> EnrichDefaults(Dictionary<string, object> requestData, params KeyValuePair<string, object>[] defaultValues);
        long? ResolveRequestDataLong(JsonNode? requestData, params string[] keys);
        short? ResolveRequestDataShort(JsonNode? requestData, params string[] keys);
        string? ResolveRequestDataString(JsonNode? requestData, params string[] keys);
        DateTime? ResolveRequestDataDateTime(JsonNode? requestData, params string[] keys);
        bool? ResolveRequestDataBool(JsonNode? requestData, params string[] keys);
    }
}
