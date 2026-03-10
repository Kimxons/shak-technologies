using System;

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
        void EnsureDefaults(System.Collections.Generic.Dictionary<string, object> requestData, string? moduleId = null);
    }
}
