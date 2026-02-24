/**
 * Image Detection Service
 * 
 * Service for detecting faces in photos and signatures in images.
 * Uses Python API endpoints for AI-based validation.
 * 
 * Endpoints:
 * - /detect: Detects faces in photos
 * - /detectsign: Detects signatures in images
 */
(function (global) {
  "use strict";

  const Environment = global.Environment || {};
  
  // Get base URL from environment, fallback to localhost
  const DETECTION_BASE_URL = (Environment.baseUrlImageDetection || "http://127.0.0.1:5000").replace(/\/+$/, "");

  /**
   * Detect faces in an image (for photo validation)
   * @param {File|Blob} file - The image file to analyze
   * @returns {Promise<{success: boolean, code: string, message: string, data: {has_face: boolean, count: number}}>}
   */
  async function detectFace(file) {
    if (!file || !(file instanceof Blob)) {
      return {
        success: false,
        code: "INVALID_INPUT",
        message: "Invalid file provided",
        data: null
      };
    }

    try {
      const formData = new FormData();
      
      // Ensure file has a proper name
      if (file instanceof File) {
        formData.append("file", file, file.name);
      } else {
        // If it's a Blob, create a File with a name
        const filename = "capture.jpg";
        const imageFile = new File([file], filename, { type: file.type || "image/jpeg" });
        formData.append("file", imageFile, filename);
      }

      console.log("[ImageDetection] Sending face detection request:", {
        fileName: file instanceof File ? file.name : "capture.jpg",
        fileSize: file.size,
        fileType: file.type
      });

      const response = await fetch(`${DETECTION_BASE_URL}/detect`, {
        method: "POST",
        body: formData
        // Don't set Content-Type header - browser will set it with boundary
      });

      console.log("[ImageDetection] Face detection response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ImageDetection] Face detection error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("[ImageDetection] Face detection result:", result);
      
      // Check for error in response
      if (result.error) {
        return {
          success: false,
          code: "DETECTION_ERROR",
          message: result.error,
          data: null
        };
      }
      
      // Normalize response
      return {
        success: true,
        code: "00",
        message: result.has_face 
          ? `${result.count} face(s) detected` 
          : "No face detected in image",
        data: {
          has_face: result.has_face || false,
          count: result.count || 0
        }
      };
    } catch (error) {
      console.error("[ImageDetection] Face detection error:", error);
      return {
        success: false,
        code: "DETECTION_ERROR",
        message: `Face detection failed: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Detect signature in an image (for signature validation)
   * @param {File|Blob} file - The image file to analyze
   * @returns {Promise<{success: boolean, code: string, message: string, data: {has_signature: boolean}}>}
   */
  async function detectSignature(file) {
    if (!file || !(file instanceof Blob)) {
      return {
        success: false,
        code: "INVALID_INPUT",
        message: "Invalid file provided",
        data: null
      };
    }

    try {
      const formData = new FormData();
      
      // Ensure file has a proper name
      if (file instanceof File) {
        formData.append("file", file, file.name);
      } else {
        // If it's a Blob, create a File with a name
        const filename = "signature.jpg";
        const imageFile = new File([file], filename, { type: file.type || "image/jpeg" });
        formData.append("file", imageFile, filename);
      }

      console.log("[ImageDetection] Sending signature detection request:", {
        fileName: file instanceof File ? file.name : "signature.jpg",
        fileSize: file.size,
        fileType: file.type
      });

      const response = await fetch(`${DETECTION_BASE_URL}/detectsign`, {
        method: "POST",
        body: formData
        // Don't set Content-Type header - browser will set it with boundary
      });

      console.log("[ImageDetection] Signature detection response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[ImageDetection] Signature detection error response:", errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log("[ImageDetection] Signature detection result:", result);
      
      // Check for error in response
      if (result.error) {
        return {
          success: false,
          code: "DETECTION_ERROR",
          message: result.error,
          data: null
        };
      }
      
      // Normalize response
      return {
        success: true,
        code: "00",
        message: result.has_signature 
          ? "Signature detected" 
          : "No signature detected in image",
        data: {
          has_signature: result.has_signature || false
        }
      };
    } catch (error) {
      console.error("[ImageDetection] Signature detection error:", error);
      return {
        success: false,
        code: "DETECTION_ERROR",
        message: `Signature detection failed: ${error.message}`,
        data: null
      };
    }
  }

  /**
   * Validate image based on type (photo or signature)
   * @param {File|Blob} file - The image file to validate
   * @param {string} imageType - "P" for photo or "S" for signature
   * @returns {Promise<{success: boolean, code: string, message: string, data: object}>}
   */
  async function validateImage(file, imageType) {
    const type = (imageType || "").toUpperCase();
    
    if (type === "P") {
      return await detectFace(file);
    } else if (type === "S") {
      return await detectSignature(file);
    } else {
      return {
        success: false,
        code: "INVALID_TYPE",
        message: `Invalid image type: ${imageType}. Use 'P' for photo or 'S' for signature.`,
        data: null
      };
    }
  }

  /**
   * Check if detection service is available
   * @returns {Promise<boolean>}
   */
  async function isServiceAvailable() {
    try {
      const response = await fetch(`${DETECTION_BASE_URL}/detect`, {
        method: "OPTIONS"
      });
      return response.ok;
    } catch (error) {
      console.warn("[ImageDetection] Service not available:", error.message);
      return false;
    }
  }

  // Export service
  global.ImageDetectionService = {
    detectFace,
    detectSignature,
    validateImage,
    isServiceAvailable
  };

  console.log("[ImageDetectionService] Service loaded. Base URL:", DETECTION_BASE_URL);

})(window);
