/**
 * Temporary Image Service
 * 
 * Handles temporary image operations (Photo and Signature) using multipart/form-data.
 * 
 * Endpoint: /api/TempImages
 * - POST: Upload temporary image
 * - GET /{tempImageId}: Get image by temp ID
 * - GET /{tempImageId}/download: Download image
 * - GET /{tempImageId}/thumbnail: Get thumbnail
 * - GET /client/{clientId}: Get images by client ID
 * - DELETE /{tempImageId}: Delete temp image
 * - DELETE /client/{clientId}: Delete all client temp images
 * - PUT /{tempImageId}: Update temp image
 * - PUT /{tempImageId}/replace: Replace image file
 */
(function (global) {
  const Environment = global.Environment || {};
  const CoreApi = global.CoreApi;

  // Base URL for temp images API
  const BASE_URL = (
    Environment.baseUrlClientDocuments ||
    Environment.baseUrlClient ||
    "http://172.16.2.31:5102"
  ).replace(/\/+$/, "");

  const ENDPOINT = `${BASE_URL}/api/TempImages`;

  /**
   * Get envelope fields from CoreApi for multipart requests
   * @param {string} formID - The form identifier
   * @returns {object} Envelope fields {RequestID, FormID, AppName, RequestTime, Checksum}
   */
  function getEnvelopeFields(formID) {
    if (CoreApi && typeof CoreApi.makeRequestEnvelope === "function") {
      const envelope = CoreApi.makeRequestEnvelope(formID, {});
      return {
        RequestID: envelope.RequestID || envelope.RequestId || formID,
        FormID: envelope.FormID || envelope.FormId || formID,
        AppName: envelope.AppName || Environment.appName || "KAIRO FRONT END",
        RequestTime: envelope.RequestTime || new Date().toISOString().replace("T", " ").substring(0, 19),
        Checksum: envelope.Checksum || ""
      };
    }
    // Fallback if CoreApi not loaded
    return {
      RequestID: formID,
      FormID: formID,
      AppName: Environment.appName || "KAIRO FRONT END",
      RequestTime: new Date().toISOString().replace("T", " ").substring(0, 19),
      Checksum: ""
    };
  }

  /**
   * Normalize API response to standard format
   */
  function normalizeResponse(response) {
    const code = response.responseCode || response.ResponseCode || "99";
    const success = code === "00";
    const baseMessage = response.responseMessage || response.ResponseMessage || (success ? "Success" : "Operation failed");
    const detailsValue = response.details || response.Details || null;
    
    // Include details in message for errors (similar to coreApi.js pattern)
    let message = baseMessage;
    if (!success && detailsValue && typeof detailsValue === "string") {
      message = detailsValue;
    }
    
    return {
      success,
      code,
      message,
      data: detailsValue || response.data || response
    };
  }

  /**
   * Upload a temporary image using multipart/form-data
   * @param {object} imageData - Image data with the following properties:
   *   - ImageTypeID: string ('P' = Photo, 'S' = Signature)
   *   - File: File object (the actual image file)
   *   - Description: string (optional)
   *   - ClientID: string (optional)
   *   - AccountID: string (optional)
   *   - TempClientID: string (optional)
   *   - ModuleID: string (optional)
   *   - OurBranchID: string (optional)
   *   - CopyToClientImage: string (optional)
   *   - CreatedBy: string (optional)
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function uploadTempImage(imageData) {
    const formData = new FormData();

    // Get envelope fields from CoreApi for consistency
    const envelope = getEnvelopeFields(imageData.FormID || "p_TempImages");

    // Use the passed RequestID if provided, otherwise use the envelope's default
    const requestId = imageData.RequestID || envelope.RequestID;

    // Required field
    formData.append("RequestData.ImageTypeID", imageData.ImageTypeID || "");

    // Optional RequestData fields
    formData.append("RequestData.ImageID", imageData.ImageID || "");
    formData.append("RequestData.Description", imageData.Description || "");
    formData.append("RequestData.ClientID", imageData.ClientID || "");
    formData.append("RequestData.AccountID", imageData.AccountID || "");
    formData.append("RequestData.TempClientID", imageData.TempClientID || "");
    formData.append("RequestData.ModuleID", imageData.ModuleID || "1000");
    formData.append("RequestData.OurBranchID", imageData.OurBranchID || Environment.OurBranchID || "");
    formData.append("RequestData.CopyToClientImage", imageData.CopyToClientImage || "");
    formData.append("RequestData.CreatedBy", imageData.CreatedBy || "");
    formData.append("RequestData.CreatedOn", imageData.CreatedOn || "");

    // Envelope fields - use the passed RequestID if provided
    formData.append("RequestId", requestId);
    formData.append("FormID", envelope.FormID);
    formData.append("AppName", envelope.AppName);
    formData.append("RequestTime", envelope.RequestTime);
    formData.append("CheckSum", envelope.Checksum);

    // File attachment
    if (imageData.File instanceof File) {
      formData.append("RequestData.File", imageData.File, imageData.File.name);
    }

    try {
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: formData
      });

      // Always try to parse JSON body, even on error status codes
      // Backend may return error details in the response body
      let json = null;
      try {
        json = await response.json();
      } catch (parseError) {
        // Could not parse JSON, will use HTTP status message
      }

      if (!response.ok) {
        // Use the parsed error message from backend if available
        if (json) {
          const normalized = normalizeResponse(json);
          return {
            success: false,
            code: normalized.code || response.status.toString(),
            message: normalized.message || `HTTP error: ${response.status} ${response.statusText}`,
            data: normalized.data
          };
        }
        return {
          success: false,
          code: response.status.toString(),
          message: `HTTP error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      return normalizeResponse(json);
    } catch (error) {
      console.error("[TempImageService] uploadTempImage error:", error);
      return {
        success: false,
        code: "99",
        message: error.message || "Failed to upload temporary image",
        data: null
      };
    }
  }

  /**
   * Get a temporary image by ID
   * @param {string|number} tempImageId - The temp image ID
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function getTempImage(tempImageId) {
    try {
      const response = await fetch(`${ENDPOINT}/${tempImageId}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return {
          success: false,
          code: response.status.toString(),
          message: `HTTP error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      const json = await response.json();
      return normalizeResponse(json);
    } catch (error) {
      console.error("[TempImageService] getTempImage error:", error);
      return {
        success: false,
        code: "99",
        message: error.message || "Failed to get temporary image",
        data: null
      };
    }
  }

  /**
   * Download a temporary image
   * @param {string|number} tempImageId - The temp image ID
   * @returns {Promise<Blob>}
   */
  async function downloadTempImage(tempImageId) {
    try {
      const response = await fetch(`${ENDPOINT}/${tempImageId}/download`, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error("[TempImageService] downloadTempImage error:", error);
      throw error;
    }
  }

  /**
   * Get thumbnail of a temporary image
   * @param {string|number} tempImageId - The temp image ID
   * @returns {Promise<Blob>}
   */
  async function getThumbnail(tempImageId) {
    try {
      const response = await fetch(`${ENDPOINT}/${tempImageId}/thumbnail`, {
        method: "GET"
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error("[TempImageService] getThumbnail error:", error);
      throw error;
    }
  }

  /**
   * Get all temporary images for a client
   * @param {string} clientId - The client ID
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function getClientImages(clientId) {
    try {
      const response = await fetch(`${ENDPOINT}/client/${clientId}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return {
          success: false,
          code: response.status.toString(),
          message: `HTTP error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      const json = await response.json();
      return normalizeResponse(json);
    } catch (error) {
      console.error("[TempImageService] getClientImages error:", error);
      return {
        success: false,
        code: "99",
        message: error.message || "Failed to get client images",
        data: null
      };
    }
  }

  /**
   * Delete a temporary image by ID
   * @param {string|number} tempImageId - The temp image ID
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function deleteTempImage(tempImageId) {
    try {
      const response = await fetch(`${ENDPOINT}/${tempImageId}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return {
          success: false,
          code: response.status.toString(),
          message: `HTTP error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      const json = await response.json();
      return normalizeResponse(json);
    } catch (error) {
      console.error("[TempImageService] deleteTempImage error:", error);
      return {
        success: false,
        code: "99",
        message: error.message || "Failed to delete temporary image",
        data: null
      };
    }
  }

  /**
   * Delete all temporary images for a client
   * @param {string} clientId - The client ID
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function deleteClientImages(clientId) {
    try {
      const response = await fetch(`${ENDPOINT}/client/${clientId}`, {
        method: "DELETE",
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return {
          success: false,
          code: response.status.toString(),
          message: `HTTP error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      const json = await response.json();
      return normalizeResponse(json);
    } catch (error) {
      console.error("[TempImageService] deleteClientImages error:", error);
      return {
        success: false,
        code: "99",
        message: error.message || "Failed to delete client images",
        data: null
      };
    }
  }

  /**
   * Update a temporary image metadata
   * @param {string|number} tempImageId - The temp image ID
   * @param {object} imageData - Updated image data
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function updateTempImage(tempImageId, imageData) {
    const formData = new FormData();

    // Get envelope fields from CoreApi for consistency
    const envelope = getEnvelopeFields(imageData.FormID || "p_TempImages");

    // RequestData fields
    formData.append("RequestData.ImageTypeID", imageData.ImageTypeID || "");
    formData.append("RequestData.Description", imageData.Description || "");
    formData.append("RequestData.ClientID", imageData.ClientID || "");
    formData.append("RequestData.AccountID", imageData.AccountID || "");
    formData.append("RequestData.TempClientID", imageData.TempClientID || "");
    formData.append("RequestData.ModuleID", imageData.ModuleID || "");
    formData.append("RequestData.OurBranchID", imageData.OurBranchID || "");
    formData.append("RequestData.CopyToClientImage", imageData.CopyToClientImage || "");

    // Envelope fields from CoreApi
    formData.append("RequestId", envelope.RequestID);
    formData.append("FormID", envelope.FormID);
    formData.append("AppName", envelope.AppName);
    formData.append("RequestTime", envelope.RequestTime);
    formData.append("CheckSum", envelope.Checksum);

    try {
      const response = await fetch(`${ENDPOINT}/${tempImageId}`, {
        method: "PUT",
        body: formData
      });

      if (!response.ok) {
        return {
          success: false,
          code: response.status.toString(),
          message: `HTTP error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      const json = await response.json();
      return normalizeResponse(json);
    } catch (error) {
      console.error("[TempImageService] updateTempImage error:", error);
      return {
        success: false,
        code: "99",
        message: error.message || "Failed to update temporary image",
        data: null
      };
    }
  }

  /**
   * Replace a temporary image file
   * @param {string|number} tempImageId - The temp image ID
   * @param {object} imageData - Image data including new File
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function replaceTempImage(tempImageId, imageData) {
    const formData = new FormData();

    // Get envelope fields from CoreApi for consistency
    const envelope = getEnvelopeFields(imageData.FormID || "p_TempImages");

    // RequestData fields
    formData.append("RequestData.ImageTypeID", imageData.ImageTypeID || "");
    formData.append("RequestData.Description", imageData.Description || "");

    // Envelope fields from CoreApi
    formData.append("RequestId", envelope.RequestID);
    formData.append("FormID", envelope.FormID);
    formData.append("AppName", envelope.AppName);
    formData.append("RequestTime", envelope.RequestTime);
    formData.append("CheckSum", envelope.Checksum);

    // File attachment
    if (imageData.File instanceof File) {
      formData.append("RequestData.File", imageData.File, imageData.File.name);
    }

    try {
      const response = await fetch(`${ENDPOINT}/${tempImageId}/replace`, {
        method: "PUT",
        body: formData
      });

      if (!response.ok) {
        return {
          success: false,
          code: response.status.toString(),
          message: `HTTP error: ${response.status} ${response.statusText}`,
          data: null
        };
      }

      const json = await response.json();
      return normalizeResponse(json);
    } catch (error) {
      console.error("[TempImageService] replaceTempImage error:", error);
      return {
        success: false,
        code: "99",
        message: error.message || "Failed to replace temporary image",
        data: null
      };
    }
  }

  /**
   * Convert base64 string to data URL for image display
   * @param {string} base64 - Base64 encoded image
   * @param {string} mimeType - MIME type (default: image/png)
   * @returns {string} Data URL
   */
  function base64ToDataUrl(base64, mimeType = "image/png") {
    // Delegate to FileService if available
    const FileService = global.FileService;
    if (FileService?.base64ToDataUrl) {
      return FileService.base64ToDataUrl(base64, mimeType);
    }
    // Fallback implementation
    if (!base64) return "";
    const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
    return `data:${mimeType};base64,${cleanBase64}`;
  }

  /**
   * Convert base64 to Blob (delegates to FileService)
   */
  function base64ToBlob(base64, mimeType = "application/octet-stream") {
    const FileService = global.FileService;
    if (FileService?.base64ToBlob) {
      return FileService.base64ToBlob(base64, mimeType);
    }
    // Fallback implementation
    if (!base64) return new Blob([], { type: mimeType });
    if (base64.startsWith("data:")) {
      const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64 = matches[2];
      }
    }
    try {
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
    } catch (e) {
      return new Blob([], { type: mimeType });
    }
  }

  // Export service
  global.TempImageService = {
    uploadTempImage,
    getTempImage,
    downloadTempImage,
    getThumbnail,
    getClientImages,
    deleteTempImage,
    deleteClientImages,
    updateTempImage,
    replaceTempImage,
    base64ToDataUrl,
    base64ToBlob
  };

  console.log("[TempImageService] Service loaded successfully");
})(window);
