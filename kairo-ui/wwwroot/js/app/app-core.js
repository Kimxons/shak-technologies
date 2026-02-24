/**
 * Core Application Utilities
 * Provides generic methods for invoking MVC controllers, handling XSRF tokens, and common app functionality
 */
(function (global) {
    'use strict';

    /**
     * Retrieve XSRF/Antiforgery token from the page
     * Supports multiple token placement patterns used in ASP.NET Core
     * @returns {string|null} The XSRF token value or null if not found
     */
    function getXsrfToken() {
        try {
            // Pattern 1: Meta tag (most common in ASP.NET Core)
            let token = document.querySelector('meta[name="XSRF-TOKEN"]')?.getAttribute('content');
            if (token) {
                console.log('✅ [XSRF] Token found in meta[name="XSRF-TOKEN"]');
                return token;
            }

            // Pattern 2: Alternative meta tag name
            token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (token) {
                console.log('✅ [XSRF] Token found in meta[name="csrf-token"]');
                return token;
            }

            // Pattern 3: Hidden input in form (traditional ASP.NET Core Forms)
            token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            if (token) {
                console.log('✅ [XSRF] Token found in input[name="__RequestVerificationToken"]');
                return token;
            }

            // Pattern 4: Data attribute
            token = document.querySelector('[data-xsrf-token]')?.getAttribute('data-xsrf-token');
            if (token) {
                console.log('✅ [XSRF] Token found in [data-xsrf-token]');
                return token;
            }

            // Pattern 5: Global variable (sometimes set by layout)
            if (global.__RequestVerificationToken) {
                console.log('✅ [XSRF] Token found in global.__RequestVerificationToken');
                return global.__RequestVerificationToken;
            }

            console.warn('⚠️ [XSRF] No XSRF token found on the page');
            return null;
        } catch (error) {
            console.error('❌ [XSRF] Error retrieving XSRF token:', error);
            return null;
        }
    }

    /**
     * Get the XSRF header name used by the application
     * ASP.NET Core uses X-CSRF-TOKEN by default
     * @returns {string} The XSRF header name
     */
    function getXsrfHeaderName() {
        return 'X-CSRF-TOKEN';
    }

    /**
     * Generic method to invoke MVC controller endpoints
     * Automatically handles XSRF token addition and error management
     * 
     * @param {string} endpoint - The controller endpoint/action method (e.g., 'ThemeConfiguration/api/save-theme' or '/api/Settings/Update')
     * @param {Object} requestData - The request payload to send to the controller
     * @param {Function} callback - Callback function to handle the response
     *                             Signature: callback(error, response, status)
     *                             - error: Error object or null
     *                             - response: JSON response from server
     *                             - status: HTTP status code
     * 
     * @example
     * // Basic usage
     * AppCore.invokeController(
     *   'ThemeConfiguration/api/save-theme',
     *   { ScopeType: 'USER', ThemeName: 'Dark' },
     *   function(error, response, status) {
     *     if (error) {
     *       console.error('Failed:', error);
     *       return;
     *     }
     *     console.log('Success:', response);
     *   }
     * );
     * 
     * @example
     * // With async/await wrapper
     * const response = await new Promise((resolve, reject) => {
     *   AppCore.invokeController('ThemeConfiguration/api/get-theme', {}, (err, res) => {
     *     if (err) reject(err);
     *     else resolve(res);
     *   });
     * });
     */
    async function invokeController(endpoint, requestData, callback) {
        try {
            // Validate required parameters
            if (!endpoint || typeof endpoint !== 'string') {
                const error = new Error('Endpoint is required and must be a string');
                console.error('❌ [CONTROLLER] Invalid endpoint:', error);
                if (callback) callback(error, null, 400);
                return;
            }

            if (!requestData || typeof requestData !== 'object') {
                const error = new Error('Request data must be an object');
                console.error('❌ [CONTROLLER] Invalid request data:', error);
                if (callback) callback(error, null, 400);
                return;
            }

            if (callback && typeof callback !== 'function') {
                const error = new Error('Callback must be a function');
                console.error('❌ [CONTROLLER] Invalid callback:', error);
                return;
            }

            // Build full URL
            const baseUrl = global.location?.origin || window.location.origin;
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            const fullUrl = `${baseUrl}${cleanEndpoint}`;

            // Get XSRF token
            const xsrfToken = getXsrfToken();
            if (!xsrfToken) {
                console.warn('⚠️ [CONTROLLER] No XSRF token found - request may be rejected by server');
            }

            // Build headers
            const headers = {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            };

            // Add XSRF token header if available
            if (xsrfToken) {
                headers[getXsrfHeaderName()] = xsrfToken;
            }

            console.log('📡 [CONTROLLER] Invoking endpoint:', {
                url: fullUrl,
                method: 'POST',
                hasXsrfToken: !!xsrfToken,
                dataKeys: Object.keys(requestData)
            });

            // Make the API call
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData),
                credentials: 'include' // Include cookies for session
            });

            console.log('📥 [CONTROLLER] Response received:', {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type')
            });

            // Parse response - read body once to avoid "body stream already read" error
            let responseData = null;
            const bodyText = await response.text();

            try {
                responseData = bodyText ? JSON.parse(bodyText) : { Success: response.ok, Message: response.statusText };
            } catch (parseError) {
                console.warn('⚠️ [CONTROLLER] Response is not valid JSON:', parseError);
                responseData = {
                    Success: response.ok,
                    Message: response.statusText,
                    RawBody: bodyText
                };
            }

            // Handle response based on status
            if (response.ok) {
                console.log('✅ [CONTROLLER] Request successful:', responseData);
                if (callback) callback(null, responseData, response.status);
            } else {
                // Server returned an error status
                const error = new Error(
                    responseData?.Message ||
                    responseData?.ErrorMessage ||
                    `HTTP ${response.status}: ${response.statusText}`
                );
                error.status = response.status;
                error.response = responseData;

                console.error('❌ [CONTROLLER] Server returned error:', error);
                if (callback) callback(error, responseData, response.status);
            }
        } catch (error) {
            console.error('❌ [CONTROLLER] Network or parsing error:', error);
            if (callback) callback(error, null, 0);
        }
    }

    /**
     * Promisified wrapper for invokeController to support async/await
     * @param {string} endpoint - Controller endpoint
     * @param {Object} requestData - Request payload
     * @returns {Promise<Object>} Resolves with response data or rejects with error
     */
    async function invokeControllerAsync(endpoint, requestData) {
        return new Promise((resolve, reject) => {
            invokeController(endpoint, requestData, (error, response, status) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Generic method to invoke MVC controller endpoints with GET request
     * Converts requestData to query string parameters
     * Automatically handles XSRF token addition and error management
     * 
     * @param {string} endpoint - The controller endpoint/action method (e.g., 'ThemeConfiguration/api/get-theme' or '/api/Settings/Get')
     * @param {Object} requestData - The request parameters to send as query string (can be empty object {})
     * @param {Function} callback - Callback function to handle the response
     *                             Signature: callback(error, response, status)
     *                             - error: Error object or null
     *                             - response: JSON response from server
     *                             - status: HTTP status code
     * 
     * @example
     * // Basic usage
     * AppCore.invokeControllerGet(
     *   'ThemeConfiguration/api/get-theme',
     *   { UserID: 123, ScopeType: 'USER' },
     *   function(error, response, status) {
     *     if (error) {
     *       console.error('Failed:', error);
     *       return;
     *     }
     *     console.log('Success:', response);
     *   }
     * );
     * 
     * @example
     * // No parameters
     * AppCore.invokeControllerGet(
     *   'Dashboard/api/get-stats',
     *   {},
     *   function(error, response, status) {
     *     if (error) return;
     *     console.log('Stats:', response);
     *   }
     * );
     */
    async function invokeControllerGet(endpoint, requestData, callback) {
        try {
            // Validate required parameters
            if (!endpoint || typeof endpoint !== 'string') {
                const error = new Error('Endpoint is required and must be a string');
                console.error('❌ [CONTROLLER] Invalid endpoint:', error);
                if (callback) callback(error, null, 400);
                return;
            }

            if (!requestData || typeof requestData !== 'object') {
                const error = new Error('Request data must be an object');
                console.error('❌ [CONTROLLER] Invalid request data:', error);
                if (callback) callback(error, null, 400);
                return;
            }

            if (callback && typeof callback !== 'function') {
                const error = new Error('Callback must be a function');
                console.error('❌ [CONTROLLER] Invalid callback:', error);
                return;
            }

            // Build full URL
            const baseUrl = global.location?.origin || window.location.origin;
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            let fullUrl = `${baseUrl}${cleanEndpoint}`;

            // Build query string from requestData
            const queryParams = new URLSearchParams();
            Object.keys(requestData).forEach(key => {
                const value = requestData[key];
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });

            // Append query string to URL if there are parameters
            if (queryParams.toString()) {
                fullUrl += `?${queryParams.toString()}`;
            }

            // Get XSRF token
            const xsrfToken = getXsrfToken();
            if (!xsrfToken) {
                console.warn('⚠️ [CONTROLLER] No XSRF token found - request may be rejected by server');
            }

            // Build headers
            const headers = {
                'X-Requested-With': 'XMLHttpRequest'
            };

            // Add XSRF token header if available
            if (xsrfToken) {
                headers[getXsrfHeaderName()] = xsrfToken;
            }

            console.log('📡 [CONTROLLER] Invoking endpoint:', {
                url: fullUrl,
                method: 'GET',
                hasXsrfToken: !!xsrfToken,
                queryParams: Object.keys(requestData)
            });

            // Make the API call
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: headers,
                credentials: 'include' // Include cookies for session
            });

            console.log('📥 [CONTROLLER] Response received:', {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type')
            });

            // Parse response - read body once to avoid "body stream already read" error
            let responseData = null;
            const bodyText = await response.text();

            try {
                responseData = bodyText ? JSON.parse(bodyText) : { Success: response.ok, Message: response.statusText };
            } catch (parseError) {
                console.warn('⚠️ [CONTROLLER] Response is not valid JSON:', parseError);
                responseData = {
                    Success: response.ok,
                    Message: response.statusText,
                    RawBody: bodyText
                };
            }

            // Handle response based on status
            if (response.ok) {
                console.log('✅ [CONTROLLER] Request successful:', responseData);
                if (callback) callback(null, responseData, response.status);
            } else {
                // Server returned an error status
                const error = new Error(
                    responseData?.Message ||
                    responseData?.ErrorMessage ||
                    `HTTP ${response.status}: ${response.statusText}`
                );
                error.status = response.status;
                error.response = responseData;

                console.error('❌ [CONTROLLER] Server returned error:', error);
                if (callback) callback(error, responseData, response.status);
            }
        } catch (error) {
            console.error('❌ [CONTROLLER] Network or parsing error:', error);
            if (callback) callback(error, null, 0);
        }
    }

    /**
     * Promisified wrapper for invokeControllerGet to support async/await
     * @param {string} endpoint - Controller endpoint
     * @param {Object} requestData - Request parameters
     * @returns {Promise<Object>} Resolves with response data or rejects with error
     */
    async function invokeControllerGetAsync(endpoint, requestData) {
        return new Promise((resolve, reject) => {
            invokeControllerGet(endpoint, requestData, (error, response, status) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });
    }

    /**
     * Promisified wrapper for invokeControllerGetView to support async/await
     * @param {string} endpoint - Controller endpoint
     * @param {Object} requestData - Request parameters
     * @returns {Promise<Object>} Resolves with response data or rejects with error
     */

    async function invokeControllerGetView(endpoint, requestData, callback) {
        try {
            // Validate required parameters
            if (!endpoint || typeof endpoint !== 'string') {
                const error = new Error('Endpoint is required and must be a string');
                console.error('❌ [CONTROLLER] Invalid endpoint:', error);
                if (callback) callback(error, null, 400);
                return;
            }

            if (!requestData || typeof requestData !== 'object') {
                const error = new Error('Request data must be an object');
                console.error('❌ [CONTROLLER] Invalid request data:', error);
                if (callback) callback(error, null, 400);
                return;
            }

            if (callback && typeof callback !== 'function') {
                const error = new Error('Callback must be a function');
                console.error('❌ [CONTROLLER] Invalid callback:', error);
                return;
            }

            // Build full URL
            const baseUrl = global.location?.origin || window.location.origin;
            const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
            let fullUrl = `${baseUrl}${cleanEndpoint}`;

            // Build query string from requestData
            const queryParams = new URLSearchParams();
            Object.keys(requestData).forEach(key => {
                const value = requestData[key];
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });

            // Append query string to URL if there are parameters
            if (queryParams.toString()) {
                fullUrl += `?${queryParams.toString()}`;
            }

            // Get XSRF token
            const xsrfToken = getXsrfToken();
            if (!xsrfToken) {
                console.warn('⚠️ [CONTROLLER] No XSRF token found - request may be rejected by server');
            }

            // Build headers
            const headers = {
                'X-Requested-With': 'XMLHttpRequest'
            };

            // Add XSRF token header if available
            if (xsrfToken) {
                headers[getXsrfHeaderName()] = xsrfToken;
            }

            console.log('📡 [CONTROLLER] Invoking endpoint:', {
                url: fullUrl,
                method: 'GET',
                hasXsrfToken: !!xsrfToken,
                queryParams: Object.keys(requestData)
            });

            // Make the API call
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: headers,
                credentials: 'include' // Include cookies for session
            });

            console.log('📥 [CONTROLLER] Response received:', {
                status: response.status,
                statusText: response.statusText,
                contentType: response.headers.get('content-type')
            });

            // Parse response - read body once to avoid "body stream already read" error
            let responseData = null;
            const bodyText = await response.text();

            try {
                responseData = isHTML(bodyText) ? bodyText : { Success: response.ok, Message: response.statusText };
            } catch (parseError) {
                console.warn('⚠️ [CONTROLLER] Response is not valid JSON:', parseError);
                responseData = {
                    Success: response.ok,
                    Message: response.statusText,
                    RawBody: bodyText
                };
            }

            // Handle response based on status
            if (response.ok) {
                console.log('✅ [CONTROLLER] Request successful:', responseData);
                if (callback) callback(null, responseData, response.status);
            } else {
                // Server returned an error status
                const error = new Error(
                    responseData?.Message ||
                    responseData?.ErrorMessage ||
                    `HTTP ${response.status}: ${response.statusText}`
                );
                error.status = response.status;
                error.response = responseData;

                console.error('❌ [CONTROLLER] Server returned error:', error);
                if (callback) callback(error, responseData, response.status);
            }
        } catch (error) {
            console.error('❌ [CONTROLLER] Network or parsing error:', error);
            if (callback) callback(error, null, 0);
        }
    }
    function isHTML(str) {
        const parser = new DOMParser();
        // Parse the string as an HTML document
        const doc = parser.parseFromString(str, 'text/html');
        // Check if the body contains any element nodes (nodeType === 1)
        return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
    }
    /**
     * Log application event
     * @param {string} level - Log level ('info', 'warn', 'error', 'debug')
     * @param {string} message - Log message
     * @param {Object} data - Additional data to log
     */
    function log(level, message, data = {}) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

        switch (level.toLowerCase()) {
            case 'error':
                console.error(logMessage, data);
                break;
            case 'warn':
                console.warn(logMessage, data);
                break;
            case 'debug':
                console.debug(logMessage, data);
                break;
            case 'info':
            default:
                console.log(logMessage, data);
        }
    }

    /**
     * Get application configuration from window or environment
     * @returns {Object} Application configuration object
     */
    function getConfig() {
        return {
            environment: global.Environment || {},
            baseUrl: global.location?.origin || window.location.origin,
            isDevelopment: global.location?.hostname?.includes('localhost'),
            appName: 'KAIRO'
        };
    }

    /**
     * Show user notification/toast message
     * @param {string} message - Message to display
     * @param {string} type - Message type ('info', 'success', 'warning', 'error')
     * @param {number} duration - Display duration in milliseconds (0 = indefinite)
     */
    function showNotification(message, type = 'info', duration = 3000) {
        try {
            // Try to use existing message panel if available
            const messagePanel = document.querySelector('.am-message-panel');
            const messagePanelText = document.getElementById('messagePanelText');

            if (messagePanel && messagePanelText) {
                messagePanel.className = `am-message-panel show ${type}`;
                messagePanelText.textContent = message;

                if (duration > 0) {
                    setTimeout(() => {
                        messagePanel.classList.remove('show');
                    }, duration);
                }
            } else {
                // Fallback: log to console
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        } catch (error) {
            console.error('Error showing notification:', error);
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean} True if user appears to be authenticated
     */
    function isAuthenticated() {
        try {
            // Check sessionStorage for user session
            const userId = sessionStorage.getItem('UserId') ||
                sessionStorage.getItem('UserID') ||
                sessionStorage.getItem('OperatorID');
            return !!userId;
        } catch (error) {
            console.error('Error checking authentication:', error);
            return false;
        }
    }

    /**
     * Get current user ID from session
     * @returns {string|null} User ID or null if not found
     */
    function getCurrentUserId() {
        try {
            return sessionStorage.getItem('UserId') ||
                sessionStorage.getItem('UserID') ||
                sessionStorage.getItem('OperatorID') ||
                null;
        } catch (error) {
            console.error('Error getting user ID:', error);
            return null;
        }
    }

    /**
     * AppCore public API
     */
    const AppCore = {
        invokeController,
        invokeControllerAsync,
        invokeControllerGet,
        invokeControllerGetView,
        invokeControllerGetAsync,
        getXsrfToken,
        getXsrfHeaderName,
        log,
        getConfig,
        showNotification,
        isAuthenticated,
        getCurrentUserId
    };

    // Export to global scope
    global.AppCore = AppCore;
    console.log('✅ [APP-CORE] AppCore module loaded successfully');
})(typeof window !== 'undefined' ? window : global);
