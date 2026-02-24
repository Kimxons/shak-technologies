/**
 * File Service
 * 
 * Centralized service for file handling operations including:
 * - Base64 encoding/decoding
 * - File to Blob conversions
 * - MIME type detection
 * - File validation
 * - Data URL handling
 * 
 * This service promotes reusability across all modules that handle file uploads.
 */
(function (global) {
  "use strict";

  /**
   * Common MIME types mapping by file extension
   */
  const MIME_TYPES = {
    // Images
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    
    // Documents
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".rtf": "application/rtf",
    
    // Archives
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    
    // Others
    ".json": "application/json",
    ".xml": "application/xml",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "application/javascript"
  };

  /**
   * Get MIME type from file extension
   * @param {string} filename - The filename or path
   * @returns {string} MIME type or 'application/octet-stream' if unknown
   */
  function getMimeType(filename) {
    if (!filename) return "application/octet-stream";
    const ext = filename.toLowerCase().match(/\.[^.]+$/)?.[0] || "";
    return MIME_TYPES[ext] || "application/octet-stream";
  }

  /**
   * Get file extension from MIME type
   * @param {string} mimeType - The MIME type
   * @returns {string} File extension (with dot) or empty string
   */
  function getExtensionFromMimeType(mimeType) {
    if (!mimeType) return "";
    for (const [ext, mime] of Object.entries(MIME_TYPES)) {
      if (mime === mimeType) return ext;
    }
    return "";
  }

  /**
   * Check if a file is an image based on MIME type or extension
   * @param {string|File} fileOrName - File object or filename
   * @returns {boolean}
   */
  function isImage(fileOrName) {
    const mimeType = fileOrName instanceof File 
      ? fileOrName.type 
      : getMimeType(fileOrName);
    return mimeType.startsWith("image/");
  }

  /**
   * Check if a file is a PDF
   * @param {string|File} fileOrName - File object or filename
   * @returns {boolean}
   */
  function isPdf(fileOrName) {
    const mimeType = fileOrName instanceof File 
      ? fileOrName.type 
      : getMimeType(fileOrName);
    return mimeType === "application/pdf";
  }

  /**
   * Convert a File or Blob to Base64 string
   * @param {File|Blob} file - The file or blob to convert
   * @returns {Promise<string>} Base64 encoded string (without data URL prefix)
   */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof Blob)) {
        reject(new Error("Input must be a File or Blob"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        const base64 = reader.result.split(",")[1] || reader.result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert a File or Blob to Data URL (includes MIME prefix)
   * @param {File|Blob} file - The file or blob to convert
   * @returns {Promise<string>} Data URL string
   */
  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!(file instanceof Blob)) {
        reject(new Error("Input must be a File or Blob"));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert Base64 string to Blob
   * @param {string} base64 - Base64 encoded string (with or without data URL prefix)
   * @param {string} mimeType - MIME type (optional if base64 includes data URL prefix)
   * @returns {Blob}
   */
  function base64ToBlob(base64, mimeType = "application/octet-stream") {
    if (!base64) return new Blob([], { type: mimeType });

    // Handle data URL format
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
      const byteArray = new Uint8Array(byteNumbers);
      return new Blob([byteArray], { type: mimeType });
    } catch (error) {
      console.error("[FileService] base64ToBlob error:", error);
      return new Blob([], { type: mimeType });
    }
  }

  /**
   * Convert Base64 string to File object
   * @param {string} base64 - Base64 encoded string
   * @param {string} filename - Desired filename
   * @param {string} mimeType - MIME type (optional if base64 includes data URL prefix)
   * @returns {File}
   */
  function base64ToFile(base64, filename, mimeType) {
    const detectedMime = mimeType || getMimeType(filename);
    const blob = base64ToBlob(base64, detectedMime);
    return new File([blob], filename, { type: detectedMime });
  }

  /**
   * Convert Base64 to Data URL for display
   * @param {string} base64 - Base64 encoded string (without data URL prefix)
   * @param {string} mimeType - MIME type (default: image/png)
   * @returns {string} Data URL
   */
  function base64ToDataUrl(base64, mimeType = "image/png") {
    if (!base64) return "";
    
    // Already a data URL
    if (base64.startsWith("data:")) {
      return base64;
    }
    
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * Extract Base64 from Data URL
   * @param {string} dataUrl - Data URL string
   * @returns {string} Base64 string without prefix
   */
  function dataUrlToBase64(dataUrl) {
    if (!dataUrl) return "";
    if (!dataUrl.startsWith("data:")) return dataUrl;
    return dataUrl.split(",")[1] || "";
  }

  /**
   * Extract MIME type from Data URL
   * @param {string} dataUrl - Data URL string
   * @returns {string} MIME type
   */
  function getMimeTypeFromDataUrl(dataUrl) {
    if (!dataUrl || !dataUrl.startsWith("data:")) return "";
    const match = dataUrl.match(/^data:([^;,]+)/);
    return match ? match[1] : "";
  }

  /**
   * Create a download from Base64 data
   * @param {string} base64 - Base64 encoded string
   * @param {string} filename - Desired filename
   * @param {string} mimeType - MIME type (optional)
   */
  function downloadBase64(base64, filename, mimeType) {
    const detectedMime = mimeType || getMimeType(filename);
    const blob = base64ToBlob(base64, detectedMime);
    downloadBlob(blob, filename);
  }

  /**
   * Create a download from Blob
   * @param {Blob} blob - Blob to download
   * @param {string} filename - Desired filename
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Create a download from Data URL
   * @param {string} dataUrl - Data URL string
   * @param {string} filename - Desired filename
   */
  function downloadDataUrl(dataUrl, filename) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Open Base64 data in a new window/tab for preview
   * @param {string} base64 - Base64 encoded string
   * @param {string} mimeType - MIME type
   */
  function previewBase64(base64, mimeType = "image/png") {
    const dataUrl = base64ToDataUrl(base64, mimeType);
    previewDataUrl(dataUrl);
  }

  /**
   * Open Data URL in a new window/tab for preview
   * @param {string} dataUrl - Data URL string
   */
  function previewDataUrl(dataUrl) {
    if (!dataUrl) return;
    window.open(dataUrl, "_blank");
  }

  /**
   * Validate file size
   * @param {File} file - File to validate
   * @param {number} maxSizeBytes - Maximum allowed size in bytes
   * @returns {{ valid: boolean, message: string }}
   */
  function validateFileSize(file, maxSizeBytes) {
    if (!(file instanceof File)) {
      return { valid: false, message: "Invalid file" };
    }
    
    if (file.size > maxSizeBytes) {
      const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(2);
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
      return { 
        valid: false, 
        message: `File size (${fileSizeMB} MB) exceeds maximum allowed size (${maxSizeMB} MB)` 
      };
    }
    
    return { valid: true, message: "OK" };
  }

  /**
   * Validate file type
   * @param {File} file - File to validate
   * @param {string[]} allowedTypes - Array of allowed MIME types or extensions
   * @returns {{ valid: boolean, message: string }}
   */
  function validateFileType(file, allowedTypes) {
    if (!(file instanceof File)) {
      return { valid: false, message: "Invalid file" };
    }
    
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    const isAllowed = allowedTypes.some(type => {
      type = type.toLowerCase();
      // Check MIME type
      if (fileType === type) return true;
      // Check extension
      if (type.startsWith(".") && fileName.endsWith(type)) return true;
      // Check wildcard MIME (e.g., "image/*")
      if (type.endsWith("/*")) {
        const category = type.slice(0, -2);
        if (fileType.startsWith(category + "/")) return true;
      }
      return false;
    });
    
    if (!isAllowed) {
      return { 
        valid: false, 
        message: `File type "${fileType || 'unknown'}" is not allowed. Allowed types: ${allowedTypes.join(", ")}` 
      };
    }
    
    return { valid: true, message: "OK" };
  }

  /**
   * Resize an image file
   * @param {File} file - Image file to resize
   * @param {number} maxWidth - Maximum width
   * @param {number} maxHeight - Maximum height
   * @param {string} outputType - Output MIME type (default: image/jpeg)
   * @param {number} quality - Quality (0-1, for JPEG/WEBP)
   * @returns {Promise<Blob>}
   */
  function resizeImage(file, maxWidth, maxHeight, outputType = "image/jpeg", quality = 0.85) {
    return new Promise((resolve, reject) => {
      if (!isImage(file)) {
        reject(new Error("File is not an image"));
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(url);

        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to resize image"));
            }
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image"));
      };

      img.src = url;
    });
  }

  /**
   * Create a thumbnail from an image file
   * @param {File} file - Image file
   * @param {number} size - Thumbnail size (width and height)
   * @returns {Promise<string>} Base64 encoded thumbnail
   */
  async function createThumbnail(file, size = 100) {
    const blob = await resizeImage(file, size, size, "image/jpeg", 0.7);
    return fileToBase64(blob);
  }

  /**
   * Read file as ArrayBuffer
   * @param {File|Blob} file - File to read
   * @returns {Promise<ArrayBuffer>}
   */
  function fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Read file as text
   * @param {File|Blob} file - File to read
   * @param {string} encoding - Text encoding (default: UTF-8)
   * @returns {Promise<string>}
   */
  function fileToText(file, encoding = "UTF-8") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsText(file, encoding);
    });
  }

  /**
   * Format file size for display
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Export service
  global.FileService = {
    // MIME type utilities
    getMimeType,
    getExtensionFromMimeType,
    isImage,
    isPdf,
    MIME_TYPES,

    // Base64 conversions
    fileToBase64,
    fileToDataUrl,
    base64ToBlob,
    base64ToFile,
    base64ToDataUrl,
    dataUrlToBase64,
    getMimeTypeFromDataUrl,

    // Download utilities
    downloadBase64,
    downloadBlob,
    downloadDataUrl,

    // Preview utilities
    previewBase64,
    previewDataUrl,

    // Validation
    validateFileSize,
    validateFileType,

    // Image processing
    resizeImage,
    createThumbnail,

    // File reading
    fileToArrayBuffer,
    fileToText,

    // Utilities
    formatFileSize
  };

  console.log("[FileService] Service loaded successfully");
})(window);
