/**
 * Recent Activity Service
 * Tracks and retrieves recent activities across all modules
 * @module services/shared/recentActivityService
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("[RecentActivityService] CoreApi is not loaded. Ensure coreApi.js is loaded first.");
    return;
  }

  // Get base URL from environment
  const BASE_URL = (Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");

  // All requests go to the same endpoint; routing is determined by FormId in the envelope
  const API_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const RecentActivityService = {
    /**
     * Add a recent activity entry
     * @param {object} params - Activity parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.LoggedInOperator - Operator ID
     * @param {string|number} params.ModuleID - Module ID (e.g., 1000 for client management)
     * @param {string} params.AccessedFields - Record identifier (ClientID, ApplicationID, etc.)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    async addRecentActivity(params) {
      try {
        const { OurBranchID, LoggedInOperator, ModuleID, AccessedFields } = params;

        if (!OurBranchID || !LoggedInOperator || !ModuleID || !AccessedFields) {
          console.warn("[RecentActivityService] Missing required parameters for addRecentActivity");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "Missing required parameters",
            data: null
          };
        }

        const requestData = {
          OurBranchID,
          LoggedInOperator,
          ModuleID: String(ModuleID),
          AccessedFields
        };

        const envelope = CoreApi.makeRequestEnvelope("p_AddRecentActivity", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        console.log(`[RecentActivityService] Added activity: Module=${ModuleID}, Record=${AccessedFields}`);
        return result;
      } catch (error) {
        console.error("[RecentActivityService] Error adding recent activity:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to add recent activity",
          data: null
        };
      }
    },

    /**
     * Get recent activities for an operator
     * @param {object} params - Filter parameters
     * @param {string} params.OurBranchID - Branch ID
     * @param {string} params.OperatorID - Operator ID
     * @param {string|number} [params.ModuleID] - Optional: Filter by module ID
     * @returns {Promise<{success: boolean, code: string, message: string, data: Array}>}
     */
    async getRecentActivities(params) {
      try {
        const { OurBranchID, OperatorID, ModuleID } = params;

        if (!OurBranchID || !OperatorID) {
          console.warn("[RecentActivityService] Missing required parameters for getRecentActivities");
          return {
            success: false,
            code: "INVALID_PARAMS",
            message: "Missing required parameters",
            data: []
          };
        }

        const requestData = {
          OurBranchID,
          OperatorID,
          ModuleID: ModuleID ? String(ModuleID) : ""
        };

        const envelope = CoreApi.makeRequestEnvelope("p_GetRecentActivities", requestData);
        const result = await CoreApi.post(API_ENDPOINT, envelope);

        if (result.success && result.data) {
          console.log(`[RecentActivityService] Retrieved ${Array.isArray(result.data) ? result.data.length : 0} recent activities`);
        }

        return result;
      } catch (error) {
        console.error("[RecentActivityService] Error getting recent activities:", error);
        return {
          success: false,
          code: "ERROR",
          message: error.message || "Failed to get recent activities",
          data: []
        };
      }
    }
  };

  // Export to global scope
  global.RecentActivityService = RecentActivityService;

  console.log("[RecentActivityService] Service initialized");
})(window);
