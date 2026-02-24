/**
 * SPM Risk Acceptance Level Service
 * Handles all API interactions for SPM Risk Acceptance Level module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const env = global.Environment || {};
  const BASE_URL = (env.baseUrlOtherModules || env.baseUrlCommon || "http://localhost:8080").replace(/\/+$/, "");

  const getAuthToken = () => {
    try {
      const storageKey = global.CoreBankingConfig?.auth?.storageKey || 'nimble_auth_session';
      const raw = global.localStorage?.getItem?.(storageKey);
      const session = raw ? JSON.parse(raw) : null;
      const token = session?.token || session?.accessToken || session?.AccessToken;
      return token ? String(token) : '';
    } catch (_) {
      return '';
    }
  };

  const postOldApi = (envelope) => {
    const token = getAuthToken();
    // If we have a token, send it and disable skipToken.
    // Some OldAPI procedures depend on server-side session/user context.
    if (token) {
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope, {
        skipToken: 'false',
        Authorization: `Bearer ${token}`
      });
    }
    return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
  };
  
  const SPMRiskAcceptanceLevelService = {
    /**
     * Get Risk Acceptance Level record
     * @param {Object} requestData - { RAID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getRiskAcceptanceLevel(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetRiskAcceptanceLevel", requestData);
      return postOldApi(envelope);
    },

    /**
     * Save (Create/Update) Risk Acceptance Level
     * @param {Object} requestData - { RAID, RADescription, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveRiskAcceptanceLevel(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditRiskAcceptanceLevel", requestData);
      return postOldApi(envelope);
    },

    /**
     * Delete Risk Acceptance Level
     * @param {Object} requestData - { RAID, OperatorID }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteRiskAcceptanceLevel(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteRiskAcceptanceLevel", requestData);
      return postOldApi(envelope);
    },

    // =============================================
    // SCORE CLASSIFICATION METHODS
    // =============================================

    /**
     * Get Score Classifications for a Risk Acceptance Level
     * @param {Object} requestData - { RAID } (+ optional aliases like RiskAcceptanceID, OurBranchID, OperatorID)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getScoreClassification(requestData) {
      // IMPORTANT: This SP is strict about parameter count.
      // Only pass the fields explicitly provided by the caller.
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetScoreClassification", requestData);
      return postOldApi(envelope);
    },

    /**
     * Save (Create/Update) Score Classifications
     * @param {Object} requestData - { RAID, OperatorID, DetailRecords (xml) } (+ optional OurBranchID/ModuleID)
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveScoreClassification(requestData) {
      // IMPORTANT: This SP may be strict about parameter count.
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditScoreClassification", requestData);
      return postOldApi(envelope);
    }
  };
  
  global.SPMRiskAcceptanceLevelService = SPMRiskAcceptanceLevelService;
})(window);
