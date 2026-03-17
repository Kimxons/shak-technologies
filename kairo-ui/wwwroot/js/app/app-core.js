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

    function buildControllerUrl(endpoint, requestData, useQueryString) {
        const baseUrl = global.location?.origin || window.location.origin;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
        let fullUrl = `${baseUrl}${cleanEndpoint}`;

        if (useQueryString && requestData && typeof requestData === 'object') {
            const queryParams = new URLSearchParams();
            Object.keys(requestData).forEach((key) => {
                const value = requestData[key];
                if (value !== null && value !== undefined && value !== '') {
                    queryParams.append(key, value);
                }
            });
            if (queryParams.toString()) {
                fullUrl += `?${queryParams.toString()}`;
            }
        }

        return fullUrl;
    }

    function buildControllerHeaders({ includeJsonContentType = true, extraHeaders = {} } = {}) {
        const headers = {
            'X-Requested-With': 'XMLHttpRequest',
            ...extraHeaders
        };

        if (includeJsonContentType) {
            headers['Content-Type'] = 'application/json';
        }

        const xsrfToken = getXsrfToken();
        if (xsrfToken) {
            headers[getXsrfHeaderName()] = xsrfToken;
        }

        return headers;
    }

    function createHttpError(response, responseData) {
        const message =
            responseData?.Message ||
            responseData?.message ||
            responseData?.ErrorMessage ||
            responseData?.errorMessage ||
            `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(message);
        error.status = response.status;
        error.response = responseData;
        return error;
    }

    async function readControllerResponse(response, responseType = 'json') {
        if (responseType === 'blob') {
            return await response.blob();
        }

        if (responseType === 'text') {
            return await response.text();
        }

        const bodyText = await response.text();
        if (!bodyText) {
            return { Success: response.ok, Message: response.statusText };
        }

        try {
            return JSON.parse(bodyText);
        } catch (parseError) {
            return {
                Success: response.ok,
                Message: response.statusText,
                RawBody: bodyText
            };
        }
    }

    async function invokeControllerByMethod(endpoint, method, requestData, callback, options = {}) {
        try {
            if (!endpoint || typeof endpoint !== 'string') {
                const error = new Error('Endpoint is required and must be a string');
                if (callback) callback(error, null, 400);
                return;
            }

            if (callback && typeof callback !== 'function') {
                console.error('❌ [CONTROLLER] Invalid callback');
                return;
            }

            const verb = (method || 'POST').toUpperCase();
            const useQueryString = options.useQueryString ?? (verb === 'GET');
            const responseType = options.responseType || 'json';
            const body = options.body !== undefined ? options.body : requestData;
            const isFormData = body instanceof FormData;
            const includeJsonContentType = !isFormData && options.includeJsonContentType !== false;

            const fullUrl = buildControllerUrl(endpoint, useQueryString ? requestData : null, useQueryString);
            const headers = buildControllerHeaders({
                includeJsonContentType,
                extraHeaders: options.headers || {}
            });

            const fetchOptions = {
                method: verb,
                headers,
                credentials: 'include'
            };

            if (verb !== 'GET' && verb !== 'HEAD') {
                if (isFormData) {
                    fetchOptions.body = body;
                    delete fetchOptions.headers['Content-Type'];
                } else if (body !== undefined && body !== null) {
                    fetchOptions.body = includeJsonContentType ? JSON.stringify(body) : body;
                }
            }

            const response = await fetch(fullUrl, fetchOptions);
            const responseData = await readControllerResponse(response, responseType);

            if (response.ok) {
                if (callback) callback(null, responseData, response.status);
                return;
            }

            const error = createHttpError(response, responseData);
            if (callback) callback(error, responseData, response.status);
        } catch (error) {
            if (callback) callback(error, null, 0);
        }
    }

    async function invokeControllerByMethodAsync(endpoint, method, requestData, options = {}) {
        return new Promise((resolve, reject) => {
            invokeControllerByMethod(endpoint, method, requestData, (error, response) => {
                if (error) reject(error);
                else resolve(response);
            }, options);
        });
    }

    async function invokeControllerUpdate(endpoint, requestData, callback) {
        return invokeControllerByMethod(endpoint, 'PUT', requestData, callback);
    }

    async function invokeControllerUpdateAsync(endpoint, requestData) {
        return invokeControllerByMethodAsync(endpoint, 'PUT', requestData);
    }

    async function invokeControllerDelete(endpoint, requestData, callback) {
        return invokeControllerByMethod(endpoint, 'DELETE', requestData, callback, { useQueryString: false });
    }

    async function invokeControllerDeleteAsync(endpoint, requestData) {
        return invokeControllerByMethodAsync(endpoint, 'DELETE', requestData, { useQueryString: false });
    }

    async function invokeControllerMultipart(endpoint, formData, callback, method = 'POST') {
        return invokeControllerByMethod(endpoint, method, null, callback, {
            body: formData,
            includeJsonContentType: false
        });
    }

    async function invokeControllerMultipartAsync(endpoint, formData, method = 'POST') {
        return invokeControllerByMethodAsync(endpoint, method, null, {
            body: formData,
            includeJsonContentType: false
        });
    }

    async function invokeControllerDownload(endpoint, requestData, callback) {
        return invokeControllerByMethod(endpoint, 'GET', requestData, callback, {
            responseType: 'blob',
            useQueryString: true
        });
    }

    async function invokeControllerDownloadAsync(endpoint, requestData) {
        return invokeControllerByMethodAsync(endpoint, 'GET', requestData, {
            responseType: 'blob',
            useQueryString: true
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

    async function invokeControllerGetViewAsync(endpoint, requestData, callback) {
        return new Promise((resolve, reject) => {
            invokeControllerGetView(endpoint, requestData, (error, response, status) => {
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
                console.log('✅ [CONTROLLER] Request successful:', fullUrl);
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
            const messagePanelIcon = messagePanel ? messagePanel.querySelector('i') : null;

            if (messagePanel && messagePanelText) {
                // Update class for colors
                messagePanel.className = `am-message-panel show ${type}`;

                // Update text
                messagePanelText.textContent = message;

                // Update icon if present
                if (messagePanelIcon) {
                    const iconMap = {
                        'success': 'bi-check-circle',
                        'error': 'bi-exclamation-octagon',
                        'warning': 'bi-exclamation-triangle',
                        'info': 'bi-info-circle'
                    };
                    messagePanelIcon.className = `bi ${iconMap[type] || 'bi-info-circle'}`;
                }

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


    function showInlineAlert(message, variant) {
        // Target the persistent container at the top of form-content
        const container = document.getElementsByClassName('alert-container');

        if (!container) {
            // Fallback for submodules or cases where the main container is missing
            if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
                window.AppCore.showNotification(message, variant);
            } else {
                console.log(`[${variant.toUpperCase()}] ${message}`);
            }
            return;
        }

        // Remove existing alerts to prevent stacking multiple banners
        container.innerHTML = '';

        const alertDiv = document.createElement('div');
        const alertClass = variant === 'success' ? 'alert-success' :
            variant === 'error' ? 'alert-danger' :
                variant === 'warning' ? 'alert-warning' : 'alert-info';

        const iconClass = variant === 'success' ? 'bi-check-circle' :
            variant === 'error' ? 'bi-exclamation-octagon' :
                variant === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle';

        alertDiv.className = `alert ${alertClass} fade show kairo-inline-alert`;
        alertDiv.role = 'alert';
        alertDiv.style.marginTop = '8px';
        alertDiv.style.marginBottom = '8px';
        alertDiv.style.padding = '0.35rem 0.75rem'; // Narrow strip style
        alertDiv.style.display = 'flex';
        alertDiv.style.alignItems = 'center';
        alertDiv.style.borderWidth = '1px';
        alertDiv.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
        alertDiv.style.minHeight = 'auto';

        alertDiv.innerHTML = `
            <i class="bi ${iconClass} me-2" style="font-size: 1.1rem;"></i>
            <div style="font-weight: 600; font-size: 13px; line-height: 1.2; flex: 1;">${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close" style="padding: 0.5rem; font-size: 0.65rem; margin: 0;"></button>
        `;

        // Insert into container
        container.appendChild(alertDiv);

        // AUTO-DISMISS REMOVED: Banner stays until user clicks 'X'.
    }

    // Helper notification functions to resolve ReferenceErrors
    function showSystemToast(message, options = {}) {
        const variant = options && options.variant ? options.variant : 'info';

        if (options.useInlineAlert) {
            // Check if we already have this same message displayed to avoid duplicate banners
            const container = document.getElementsByClassName('alert-container');
            if (container && container.innerText.includes(message)) {
                console.log(`[Notification] Skipping duplicate alert: ${message}`);
                return;
            }
            showInlineAlert(message, variant);
            return; // Explicitly return to prevent the bubble from also appearing
        }

        if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
            window.AppCore.showNotification(message, variant);
            return;
        }

        // 3. Fallback: Try global toastr if available
        if (window.toastr && typeof window.toastr[variant] === 'function') {
            window.toastr[variant](message);
            return;
        }

        // 4. Last resort - Centralized NotificationService (Client 360 style)
        if (window.NotificationService && typeof window.NotificationService.showToast === 'function') {
            window.NotificationService.showToast(message, variant);
            return;
        }

        // 4. Final Fallback to console
        console.log(`[${variant.toUpperCase()}] ${message}`);

        // rudimentary fallback
        if (variant === 'error') {
            alert(`Error: ${message}`);
        }
    }

    function showErrorMessage(message, options = {}) {
        showSystemToast(message, { ...options, variant: 'error' });
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
     * Generic Dialog System
     * Supports multiple dialog types with customizable handlers and content
     */

    // Track active dialogs to prevent duplicates
    let activeDialogs = new Map();

    /**
     * Show a generic dialog with customizable type, content, and handlers
     * 
     * @param {Object} options - Dialog configuration
     * @param {string} options.type - Dialog type: 'confirmation', 'alert', 'prompt', 'remarks', 'custom'
     * @param {string} options.title - Dialog title
     * @param {string} options.message - Dialog message/content
     * @param {string} [options.dialogId] - Unique dialog ID (auto-generated if not provided)
     * @param {Object} [options.buttons] - Custom button configuration
     * @param {Array<Object>} [options.buttons.list] - Array of button configs {label, variant, handler}
     * @param {Object} [options.input] - Input field configuration for prompt/remarks type
     * @param {string} [options.input.placeholder] - Input placeholder
     * @param {string} [options.input.value] - Initial input value
     * @param {boolean} [options.input.required] - Whether input is required
     * @param {number} [options.input.maxLength] - Maximum input length
    * @param {string} [options.contentHtml] - Optional trusted HTML content for the dialog body
    * @param {Object} [options.config] - Additional configuration
     * @param {boolean} [options.config.backdrop] - Show backdrop (default: true)
     * @param {boolean} [options.config.keyboard] - Allow keyboard dismiss (default: false)
     * @param {boolean} [options.config.focus] - Auto-focus input (default: true)
     * @param {string} [options.config.size] - Modal size: 'sm', 'md', 'lg', 'xl' (default: 'md')
     * 
     * @returns {Promise} Promise that resolves with user action/input
     * 
     * @example
     * // Confirmation dialog
     * const confirmed = await AppCore.showDialog({
     *   type: 'confirmation',
     *   title: 'Delete Item',
     *   message: 'Are you sure you want to delete this item?'
     * });
     * 
     * @example
     * // Remarks dialog
     * const remarks = await AppCore.showDialog({
     *   type: 'remarks',
     *   title: 'Enter Remarks',
     *   message: 'Please provide your remarks:',
     *   input: { placeholder: 'Type your remarks here...', required: true }
     * });
     * 
     * @example
     * // Custom dialog
     * const result = await AppCore.showDialog({
     *   type: 'custom',
     *   title: 'Custom Action',
     *   message: 'Choose an option:',
     *   buttons: {
     *     list: [
     *       { label: 'Option 1', variant: 'primary', value: 'opt1' },
     *       { label: 'Option 2', variant: 'secondary', value: 'opt2' },
     *       { label: 'Cancel', variant: 'outline-secondary', value: null }
     *     ]
     *   }
     * });
     */
    function showDialog(options) {
        return new Promise((resolve) => {
            const {
                type = 'confirmation',
                title = 'Confirmation',
                message = '',
                dialogId = `appcore-dialog-${Date.now()}`,
                buttons = null,
                input = null,
                contentHtml = '',
                config = {}
            } = options;

            // Check if dialog with same ID is already open
            if (activeDialogs.has(dialogId)) {
                console.warn(`Dialog ${dialogId} is already open`);
                return resolve(null);
            }

            // Build dialog HTML based on type
            const modalSize = config.size || 'md';
            const modalSizeClass = modalSize !== 'md' ? `modal-${modalSize}` : '';

            let dialogContent = buildDialogContent(type, message, input, contentHtml);
            let dialogButtons = buildDialogButtons(type, buttons);

            // Create modal HTML
            const modalHTML = `
                <div class="modal fade" id="${dialogId}" tabindex="-1" data-bs-backdrop="${config.backdrop !== false ? 'static' : 'false'}" data-bs-keyboard="${config.keyboard === true}">
                    <div class="modal-dialog modal-dialog-centered ${modalSizeClass}">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">${escapeHtml(title)}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                ${dialogContent}
                            </div>
                            <div class="modal-footer">
                                ${dialogButtons}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Append to body
            const modalElement = document.createElement('div');
            modalElement.innerHTML = modalHTML;
            document.body.appendChild(modalElement.firstElementChild);

            const modalEl = document.getElementById(dialogId);
            const bsModal = new bootstrap.Modal(modalEl);

            // Track active dialog
            activeDialogs.set(dialogId, { modal: bsModal, element: modalEl });

            // Auto-focus input if applicable
            modalEl.addEventListener('shown.bs.modal', () => {
                if (config.focus !== false) {
                    const inputField = modalEl.querySelector('input, textarea');
                    if (inputField) {
                        inputField.focus();
                    }
                }
            });

            // Cleanup on hide
            modalEl.addEventListener('hidden.bs.modal', () => {
                activeDialogs.delete(dialogId);
                modalEl.remove();
            });

            // Wire up button handlers
            wireDialogButtons(modalEl, type, buttons, bsModal, resolve);

            // Show modal
            bsModal.show();
        });
    }

    /**
     * Build dialog content based on type
     */
    function buildDialogContent(type, message, input, contentHtml) {
        let content = contentHtml || `<p>${escapeHtml(message)}</p>`;

        if (contentHtml) {
            return content;
        }

        if (type === 'prompt' && input) {
            const placeholder = input.placeholder || '';
            const value = input.value || '';
            const maxLength = input.maxLength ? `maxlength="${input.maxLength}"` : '';
            const required = input.required ? 'required' : '';

            content += `
                <div class="mt-3">
                    <input type="text" class="form-control" id="dialog-input" 
                           placeholder="${escapeHtml(placeholder)}" 
                           value="${escapeHtml(value)}" 
                           ${maxLength} ${required} />
                </div>
            `;
        } else if (type === 'remarks' && input) {
            const placeholder = input.placeholder || '';
            const value = input.value || '';
            const maxLength = input.maxLength ? `maxlength="${input.maxLength}"` : '';
            const required = input.required ? 'required' : '';

            content += `
                <div class="mt-3">
                    <textarea class="form-control" id="dialog-input" rows="4" 
                              placeholder="${escapeHtml(placeholder)}" 
                              ${maxLength} ${required}>${escapeHtml(value)}</textarea>
                    ${input.maxLength ? `<div class="form-text text-end"><span id="char-count">0</span>/${input.maxLength}</div>` : ''}
                </div>
            `;
        }

        return content;
    }

    /**
     * Build dialog buttons based on type
     */
    function buildDialogButtons(type, customButtons) {
        if (customButtons && customButtons.list) {
            // Custom buttons
            return customButtons.list.map((btn, idx) => {
                const variant = btn.variant || 'primary';
                const label = btn.label || 'Button';
                return `<button type="button" class="btn btn-${variant}" data-dialog-action="${idx}">${escapeHtml(label)}</button>`;
            }).join('');
        }

        // Default buttons based on type
        switch (type) {
            case 'alert':
                return '<button type="button" class="btn btn-primary" data-dialog-action="ok">OK</button>';

            case 'confirmation':
                return `
                    <button type="button" class="btn btn-outline-secondary" data-dialog-action="cancel">Cancel</button>
                    <button type="button" class="btn btn-primary" data-dialog-action="confirm">Confirm</button>
                `;

            case 'prompt':
            case 'remarks':
                return `
                    <button type="button" class="btn btn-outline-secondary" data-dialog-action="cancel">Cancel</button>
                    <button type="button" class="btn btn-primary" data-dialog-action="submit">Submit</button>
                `;

            default:
                return '<button type="button" class="btn btn-primary" data-dialog-action="ok">OK</button>';
        }
    }

    /**
     * Wire up button event handlers
     */
    function wireDialogButtons(modalEl, type, customButtons, bsModal, resolve) {
        const buttons = modalEl.querySelectorAll('[data-dialog-action]');
        const inputField = modalEl.querySelector('#dialog-input');

        // Character counter for remarks
        if (type === 'remarks' && inputField) {
            const charCount = modalEl.querySelector('#char-count');
            if (charCount) {
                inputField.addEventListener('input', () => {
                    charCount.textContent = inputField.value.length;
                });
                charCount.textContent = inputField.value.length;
            }
        }

        buttons.forEach((button) => {
            button.addEventListener('click', async () => {
                const action = button.getAttribute('data-dialog-action');

                if (customButtons && customButtons.list) {
                    // Custom button handler
                    const btnIndex = parseInt(action);
                    const btnConfig = customButtons.list[btnIndex];

                    let result = btnConfig.value !== undefined ? btnConfig.value : null;

                    // If button has a custom handler, call it
                    if (typeof btnConfig.handler === 'function') {
                        const handlerResult = await btnConfig.handler(inputField?.value);
                        if (handlerResult === false) return; // Don't close if handler returns false
                        result = handlerResult !== undefined ? handlerResult : result;
                    }

                    bsModal.hide();
                    resolve(result);
                } else {
                    // Standard action handlers
                    switch (action) {
                        case 'ok':
                        case 'confirm':
                            bsModal.hide();
                            resolve(true);
                            break;

                        case 'submit':
                            if (inputField) {
                                if (inputField.hasAttribute('required') && !inputField.value.trim()) {
                                    inputField.classList.add('is-invalid');
                                    return;
                                }
                                bsModal.hide();
                                resolve(inputField.value);
                            } else {
                                bsModal.hide();
                                resolve(true);
                            }
                            break;

                        case 'cancel':
                        default:
                            bsModal.hide();
                            resolve(null);
                            break;
                    }
                }
            });
        });

        // Handle close button
        const closeBtn = modalEl.querySelector('.btn-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                bsModal.hide();
                resolve(null);
            });
        }

        // Enter key handler for input fields
        if (inputField) {
            inputField.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && type !== 'remarks') {
                    e.preventDefault();
                    const submitBtn = modalEl.querySelector('[data-dialog-action="submit"]');
                    if (submitBtn) submitBtn.click();
                }
            });
        }
    }

    /**
     * Escape HTML to prevent XSS
     */
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show confirmation dialog (convenience method)
     */
    function showConfirmation(title, message) {
        return showDialog({
            type: 'confirmation',
            title: title,
            message: message
        });
    }

    /**
     * Show alert dialog (convenience method)
     */
    function showAlert(title, message) {
        return showDialog({
            type: 'alert',
            title: title,
            message: message
        });
    }

    /**
     * Show prompt dialog (convenience method)
     */
    function showPrompt(title, message, placeholder = '') {
        return showDialog({
            type: 'prompt',
            title: title,
            message: message,
            input: { placeholder: placeholder, required: true }
        });
    }

    /**
     * Show remarks dialog (convenience method)
     */
    function showRemarks(title, message, options = {}) {
        return showDialog({
            type: 'remarks',
            title: title,
            message: message,
            input: {
                placeholder: options.placeholder || 'Enter your remarks here...',
                maxLength: options.maxLength || 500,
                required: options.required !== false
            }
        });
    }

    /**
     * AppCore public API
     */
    const AppCore = {
        invokeController,
        invokeControllerAsync,
        invokeControllerByMethod,
        invokeControllerByMethodAsync,
        invokeControllerGet,
        invokeControllerGetAsync,
        invokeControllerGetView,
        invokeControllerGetViewAsync,
        invokeControllerUpdate,
        invokeControllerUpdateAsync,
        invokeControllerDelete,
        invokeControllerDeleteAsync,
        invokeControllerMultipart,
        invokeControllerMultipartAsync,
        invokeControllerDownload,
        invokeControllerDownloadAsync,
        getXsrfToken,
        getXsrfHeaderName,
        log,
        getConfig,
        showNotification,
        isAuthenticated,
        getCurrentUserId,
        // Dialog methods
        showDialog,
        showConfirmation,
        showAlert,
        showPrompt,
        showRemarks
    };

    // Export to global scope
    global.AppCore = AppCore;
    console.log('✅ [APP-CORE] AppCore module loaded successfully');
})(typeof window !== 'undefined' ? window : global);
