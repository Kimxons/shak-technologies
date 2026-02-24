/**
 * Client Document Service
 * 
 * Handles client document operations using multipart/form-data.
 * 
 * Endpoint: /api/ClientDocuments
 * - POST: Create document with file upload
 * - GET /client/{clientId}: Get documents by client ID
 */
(function (global) {
  const Environment = global.Environment || {};

  // Base URL for client documents API
  const BASE_URL = (
    Environment.baseUrlClientDocuments ||
    Environment.baseUrlClient ||
    "http://172.16.2.31:5102"
  ).replace(/\/+$/, "");

  const ENDPOINT = `${BASE_URL}/api/ClientDocuments`;

  /**
   * Create a client document using multipart/form-data
   * @param {object} documentData - Document data with the following properties:
   *   - ClientID: string (required)
   *   - DocumentID: string (required)
   *   - DocumentTypeID: string
   *   - LocationID: string
   *   - ReceivedBy: string
   *   - ReceivedDate: string (ISO date)
   *   - Remarks: string
   *   - File: File object (the actual file to upload)
   *   - CreatedBy: string
   *   - CreatedOn: string (ISO datetime)
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function createDocument(documentData) {
    const formData = new FormData();

    // Required fields
    formData.append("RequestData.ClientID", documentData.ClientID || "");
    formData.append("RequestData.DocumentID", documentData.DocumentID || "");

    // Optional fields
    formData.append("RequestData.DocumentTypeID", documentData.DocumentTypeID || "");
    formData.append("RequestData.LocationID", documentData.LocationID || "");
    formData.append("RequestData.ReceivedBy", documentData.ReceivedBy || "");
    formData.append("RequestData.ReceivedDate", documentData.ReceivedDate || "");
    formData.append("RequestData.Remarks", documentData.Remarks || "");
    formData.append("RequestData.CreatedBy", documentData.CreatedBy || "ADMIN");
    formData.append("RequestData.CreatedOn", documentData.CreatedOn || "");
    formData.append("RequestData.ModifiedBy", documentData.ModifiedBy || "");
    formData.append("RequestData.ModifiedOn", documentData.ModifiedOn || "");
    formData.append("RequestData.UpdateCount", documentData.UpdateCount || "");
    formData.append("RequestData.ImageID", documentData.ImageID || "");
    formData.append("RequestData.DeletedOn", documentData.DeletedOn || "");
    formData.append("RequestData.DeletedBy", documentData.DeletedBy || "");
    formData.append("RequestData.DocumentReferenceNo", documentData.DocumentReferenceNo || "");
    formData.append("RequestData.DocumentDate", documentData.DocumentDate || "");
    formData.append("RequestData.SendingBank", documentData.SendingBank || "");
    formData.append("RequestData.RequestID", documentData.RequestID || "");

    // Envelope fields
    formData.append("RequestId", documentData.RequestId || documentData.RequestID || generateRequestId());
    formData.append("FormID", documentData.FormID || "ClientDocuments");
    formData.append("AppName", documentData.AppName || Environment.appName || "KAIRO FRONT END");
    formData.append("RequestTime", documentData.RequestTime || new Date().toISOString().replace("T", " ").substring(0, 19));
    formData.append("CheckSum", documentData.CheckSum || "");

    // File attachment
    if (documentData.File instanceof File) {
      formData.append("RequestData.File", documentData.File, documentData.File.name);
    } else if (documentData.sImage && documentData.MimeType && documentData.fileName) {
      // Convert base64 to File if provided
      try {
        const blob = base64ToBlob(documentData.sImage, documentData.MimeType);
        const file = new File([blob], documentData.fileName, { type: documentData.MimeType });
        formData.append("RequestData.File", file, documentData.fileName);
      } catch (e) {
        console.warn("[ClientDocumentService] Failed to convert base64 to file:", e);
      }
    }

    try {
      console.log(`[ClientDocumentService] Creating document for client: ${documentData.ClientID}`);
      
      const response = await fetch(ENDPOINT, {
        method: "POST",
        body: formData
        // Note: Do NOT set Content-Type header - browser will set it with boundary
      });

      const result = await response.json();
      console.log("[ClientDocumentService] Create response:", result);

      return normalizeResponse(result);
    } catch (error) {
      console.error("[ClientDocumentService] Create document failed:", error);
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: error.message || "Failed to create document",
        data: null
      };
    }
  }

  /**
   * Get all documents for a client
   * @param {string} clientId - The client ID
   * @returns {Promise<{success: boolean, code: string, message: string, data: Array}>}
   */
  async function getDocumentsByClientId(clientId) {
    if (!clientId) {
      return {
        success: false,
        code: "INVALID_INPUT",
        message: "Client ID is required",
        data: null
      };
    }

    try {
      console.log(`[ClientDocumentService] Fetching documents for client: ${clientId}`);
      
      const response = await fetch(`${ENDPOINT}/client/${encodeURIComponent(clientId)}`, {
        method: "GET",
        headers: {
          "Accept": "application/json"
        }
      });

      const result = await response.json();
      console.log("[ClientDocumentService] Get documents response:", result);

      return normalizeResponse(result);
    } catch (error) {
      console.error("[ClientDocumentService] Get documents failed:", error);
      return {
        success: false,
        code: "NETWORK_ERROR",
        message: error.message || "Failed to fetch documents",
        data: null
      };
    }
  }

  /**
   * Get document file/image by path
   * @param {string} filePath - The file path from the document record
   * @returns {string} URL to the file
   */
  function getDocumentFileUrl(filePath) {
    if (!filePath) return null;
    // If it's already an absolute URL, return as is
    if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
      return filePath;
    }
    // Otherwise, build the full URL
    return `${BASE_URL}${filePath.startsWith("/") ? "" : "/"}${filePath}`;
  }

  /**
   * Get download URL for an image by ImageID
   * @param {number|string} imageId - The ImageID from the document record
   * @returns {string} URL to download the image
   */
  function getImageDownloadUrl(imageId) {
    if (!imageId) return null;
    return `${BASE_URL}/api/Images/${imageId}/download`;
  }

  /**
   * Normalize API response to standard format
   */
  function normalizeResponse(response) {
    if (!response) {
      return { success: false, code: "NO_RESPONSE", message: "No response received", data: null };
    }

    const code = response.responseCode || response.ResponseCode || response.code || "";
    const isSuccess = code === "00" || code === "0" || code === 0;

    return {
      success: isSuccess,
      code: code,
      message: response.responseMessage || response.ResponseMessage || response.message || "",
      data: response.details || response.Details || response.data || null
    };
  }

  /**
   * Generate a unique request ID
   */
  function generateRequestId() {
    return `DOC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Convert base64 string to Blob
   */
  function base64ToBlob(base64, mimeType) {
    // Remove data URL prefix if present
    const base64Data = base64.includes(",") ? base64.split(",")[1] : base64;
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  // Export the service
  const ClientDocumentService = {
    createDocument,
    getDocumentsByClientId,
    getDocumentFileUrl,
    getImageDownloadUrl: (imageId) => imageId ? `${BASE_URL}/api/Images/${imageId}/download` : null,
    BASE_URL,
    ENDPOINT
  };

  global.ClientDocumentService = ClientDocumentService;

  console.log("[ClientDocumentService] Loaded. Endpoint:", ENDPOINT);

})(window);
