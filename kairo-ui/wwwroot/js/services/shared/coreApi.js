(function (global) {
  const CONFIG = global.CoreBankingConfig || {};
  const Environment = global.Environment || {};

  const DEFAULT_HEADERS = {
    "Content-Type": "application/json",
    "skipToken": "true"
  };

  const fallbackUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  /**
   * Generate RequestID using FormID and timestamp
   * @param {string} formID - The form identifier
   * @returns {string} Generated RequestID
   */
  const generateRequestID = (formID) => {
    const timestamp = Date.now();
    return `${formID}_${timestamp}`;
  };

  /**
   * Format RequestTime in ISO format without milliseconds
   * @returns {string} Formatted timestamp (e.g., 2024-01-16T10:00:00)
   */
  const getRequestTime = () => {
    return new Date().toISOString().split('.')[0];
  };

  /**
   * Create standardized request envelope (NEW FORMAT)
   * @param {string} formID - The form identifier
   * @param {object} requestData - The actual request payload
   * @param {string} appName - Application name (optional, defaults from Environment)
   * @returns {object} Standardized request envelope
   */
  const makeRequestEnvelope = (formID, requestData = {}, appName = null) => {
    // Support legacy single-parameter calls
    if (typeof formID === 'object' && !requestData) {
      const legacyData = formID;
      return {
        RequestID: legacyData.RequestID || (global.crypto?.randomUUID?.() ?? fallbackUUID()),
        RequestData: legacyData.RequestData ?? legacyData,
        RequestTime: new Date().toISOString(),
        AppName: CONFIG.appName
      };
    }

    // New format - strip "dbo." prefix if present for FormID
    const cleanFormID = formID.startsWith('dbo.') ? formID.substring(4) : formID;

    return {
      // Backend expects RequestID and FormID to match the procedure/form name.
      RequestID: formID, // Keep original formID with dbo. for RequestID
      FormID: cleanFormID, // Only FormID, without dbo. prefix
      RequestData: requestData,
      RequestTime: getRequestTime(),
      AppName: appName || Environment.appName || CONFIG.appName || "CORE_BANKING",
      Checksum: "" // TODO: Implement checksum logic if needed
    };
  };

  /**
   * Parse and normalize API response
   * @param {object} data - Parsed JSON response
   * @returns {object} Normalized response with success flag and data
   */
  // Parse and normalize API response
  const normalizeResponse = (data) => {
    // Some endpoints/proxies return an empty 200 body.
    if (data === null || data === undefined || data === "") {
      return {
        success: true,
        code: "00",
        message: "Success",
        data: null,
        Details: null
      };
    }

    // Some endpoints return arrays directly.
    if (Array.isArray(data)) {
      // If a single object is wrapped in an array, unwrap it.
      if (data.length === 1 && data[0] && typeof data[0] === "object" && !Array.isArray(data[0])) {
        return normalizeResponse(data[0]);
      }

      // Empty array is a valid success (e.g., no rows found).
      return {
        success: true,
        code: "00",
        message: "Success",
        data,
        Details: data
      };
    }

    // Some endpoints return primitive success strings ("00", "OK", "Success").
    if (typeof data === "string") {
      const s = data.trim().toLowerCase();
      const ok = s === "00" || s === "0" || s === "ok" || s === "success" || s === "succeeded" || s === "true";
      return {
        success: ok,
        code: ok ? "00" : "XX",
        message: data,
        data,
        Details: data
      };
    }

    // Some endpoints return primitive success numbers (0/1).
    if (typeof data === "number") {
      const ok = data === 0 || data === 1;
      return {
        success: ok,
        code: ok ? "00" : "XX",
        message: ok ? "Success" : "Failed",
        data,
        Details: data
      };
    }

    // If a service already returns the normalized contract, preserve it.
    if (typeof data === "object" && data !== null && typeof data.success === "boolean") {
      return {
        ...data, // Preserve extra fields like 'action'
        success: data.success,
        code: data.code ?? (data.success ? "00" : "XX"),
        message: data.message || "",
        data: data.data ?? data.Details ?? null,
        Details: data.Details ?? data.data ?? null
      };
    }

    // Handle nested envelopes (common: { response: {...} } / { Response: {...} }).
    if (typeof data === "object" && data !== null) {
      const nested = data.Response || data.response || data.Result || data.result;
      if (nested && typeof nested === "object") {
        return normalizeResponse(nested);
      }
    }

    // Handle response with ResponseCode (standard format)
    const responseCode = data?.ResponseCode ?? data?.responseCode ?? data?.responsecode;
    const responseMessage = data?.ResponseMessage ?? data?.responseMessage ?? data?.responsemessage;
    const detailsValue = data?.Details ?? data?.details;

    if (responseCode !== undefined) {
      return {
        success: String(responseCode) === "00",
        code: String(responseCode),
        message: responseMessage || "",
        data: detailsValue || null,
        Details: detailsValue // Keep original Details for backward compatibility
      };
    }

    // Handle response with Status/Message format
    if (data.Status !== undefined) {
      return {
        success: data.Status === "00" || data.Status === "0" || data.Status === 0,
        code: data.Status,
        message: data.Message || "",
        data: data,
        Details: data.Details
      };
    }

    // Handle response that includes Details (and possibly Details01/Details02/...)
    if (detailsValue !== undefined) {
      const detailsKeys = Object.keys(data).filter((key) => /^Details(\d+)?$/i.test(key));
      const hasAdditionalDetailsSections = detailsKeys.some((key) => /^Details\d+$/i.test(key));

      // OldAPI responses often look like:
      // { Details: [ { ResponseCode, ResponseMessage, Details } ] }
      // But some procedures nest the status row inside wrapper.Details, e.g.:
      // { Details: [ { Details: [ { ResponseCode, ResponseMessage } ] } ] }
      // Some procedures also put the status row in Details01/Details02/etc.
      const findStatusRow = () => {
        const seen = new Set();

        const tryGetStatus = (value) => {
          if (!value) return null;
          if (typeof value !== "object") return null;
          if (seen.has(value)) return null;
          seen.add(value);

          if (value.ResponseCode !== undefined) return value;

          if (Array.isArray(value)) {
            for (const item of value) {
              const found = tryGetStatus(item);
              if (found) return found;
            }
            return null;
          }

          // Common nested slot for OldAPI wrappers
          if (value.Details !== undefined) {
            const found = tryGetStatus(value.Details);
            if (found) return found;
          }

          // Shallow scan of object properties (avoid deep recursion into huge payloads)
          for (const prop of Object.keys(value)) {
            if (prop === "Details") continue;
            const found = tryGetStatus(value[prop]);
            if (found) return found;
          }

          return null;
        };

        for (const key of detailsKeys) {
          const found = tryGetStatus(data[key]);
          if (found) return found;
        }
        return null;
      };

      const statusRow = findStatusRow();
      const code = statusRow?.ResponseCode;
      const message = statusRow?.ResponseMessage || responseMessage || "";
      return {
        success: code !== undefined ? String(code) === "00" : true,
        code: code !== undefined ? String(code) : "00",
        message: code !== undefined ? message : "Success",
        // If this response includes Details01/02/etc, keep the full payload as `data`
        // so callers can bind from multiple datasets while still exposing `Details`.
        data: hasAdditionalDetailsSections ? data : detailsValue,
        Details: detailsValue
      };
    }

    // Common alternative success shapes
    const isSuccessful =
      data?.IsSuccessful ??
      data?.isSuccessful ??
      data?.IsSuccess ??
      data?.isSuccess ??
      data?.Success ??
      data?.success;

    if (typeof isSuccessful === "boolean") {
      return {
        success: isSuccessful,
        code: isSuccessful ? "00" : "XX",
        message: data?.Message || data?.message || (isSuccessful ? "Success" : "Failed"),
        data: data?.Data ?? data?.data ?? data,
        Details: data?.Details ?? data?.details ?? null
      };
    }

    const status = data?.Status ?? data?.status;
    if (typeof status === "string") {
      const s = status.trim().toLowerCase();
      const ok = ["ok", "success", "succeeded", "00", "0", "true"].includes(s);
      return {
        success: ok,
        code: ok ? "00" : "XX",
        message: data?.Message || data?.message || (ok ? "Success" : "Failed"),
        data: data?.Data ?? data?.data ?? data,
        Details: data?.Details ?? data?.details ?? null
      };
    }

    // ENJUKI fallback: detect error indicators in plain objects
    if (typeof data === "object" && data !== null) {
      const hasError =
        data.error ||
        data.Error ||
        data.ErrorMessage ||
        data.success === false ||
        data.Success === false;

      if (hasError) {
        return {
          success: false,
          code: data.code || data.Code || data.ErrorCode || "ERROR",
          message:
            data.message ||
            data.Message ||
            data.ErrorMessage ||
            data.error ||
            "An error occurred",
          data,
          Details: data.Details || data
        };
      }

      return {
        success: true,
        code: "00",
        message: data.message || data.Message || "Success",
        data,
        Details: data.Details || data
      };
    }

    return {
      success: true, // Assume success if we got data back in a non-standard format
      code: "00",
      message: "Success",
      data: data,
      Details: data
    };
  };

  const parseResponse = async (response) => {
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch (error) {
        payload = { ResponseCode: "XX", ResponseMessage: text };
      }
    }
    if (!response.ok) {
      const error = new Error(payload?.ResponseMessage || response.statusText);
      error.payload = payload;
      error.status = response.status;
      throw error;
    }

    if (CONFIG.enableLogging) {
      console.log("[CoreApi] Raw response:", payload);
    }
    // Normalize the response before returning
    const normalized = normalizeResponse(payload);

    if (CONFIG.enableLogging) {
      console.log("[CoreApi] Normalized response:", normalized);
    }

    return normalized;
  };

  const request = async (url, options = {}) => {
    if (!url) {
      throw new Error("CoreApi endpoint missing. Check config.js");
    }
    const method = options.method || "POST";
    const fetchOptions = {
      method,
      headers: { ...DEFAULT_HEADERS, ...(options.headers || {}) }
    };
    if (method === "GET") {
      fetchOptions.body = undefined;
    } else {
      fetchOptions.body = JSON.stringify(options.body || {});
    }

    if (CONFIG.enableLogging) {
      console.groupCollapsed(`[CoreApi] ${method} ${url}`);
      console.info("Payload", options.body);
      console.groupEnd();
    }

    try {
      const response = await fetch(url, fetchOptions);
      return await parseResponse(response);
    } catch (error) {
      console.error("CoreApi request failed:", error);
      // Return normalized error response
      return {
        success: false,
        code: error.payload?.ResponseCode || "NETWORK_ERROR",
        message: error.message || "Network request failed",
        data: error.payload?.Details || null,
        Details: error.payload?.Details || null
      };
    }
  };

  const CoreApi = {
    DEFAULT_HEADERS,
    fallbackUUID,
    generateRequestID,
    getRequestTime,
    makeRequestEnvelope,
    normalizeResponse,
    parseResponse,
    request,

    // Convenience methods
    get(url, headers = {}) {
      return request(url, { method: "GET", headers });
    },

    post(url, body, headers = {}) {
      return request(url, { method: "POST", body, headers });
    },

    put(url, body, headers = {}) {
      return request(url, { method: "PUT", body, headers });
    },

    delete(url, headers = {}) {
      return request(url, { method: "DELETE", headers });
    }
  };

  global.CoreApi = CoreApi;

  console.log('✅ CoreApi loaded');
})(window);
