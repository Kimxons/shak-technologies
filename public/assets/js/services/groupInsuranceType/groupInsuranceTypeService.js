/**
 * Group Insurance Type Service
 * Handles all API interactions for Group Insurance Type module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlGroupInsuranceType || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
  
  const GroupInsuranceTypeService = {
    /**
     * Get Group Insurance Type records
     * @param {Object} requestData - { BankID, OurBranchID, InsuranceTypeID, OperatorID, Direction }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getGroupInsuranceType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGroupInsuranceType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save (Create/Update) Group Insurance Type
     * @param {Object} requestData - Form data for insurance type
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveGroupInsuranceType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGroupInsuranceType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Group Insurance Type
     * @param {Object} requestData - { InsuranceTypeID, OperatorID, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteGroupInsuranceType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGroupInsuranceType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Claim Types for an Insurance Type
     * @param {Object} requestData - { InsuranceTypeID, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    getClaimTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetClaimTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save Claim Type
     * @param {Object} requestData - Claim type form data
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    saveClaimType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveClaimType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Claim Type
     * @param {Object} requestData - { ClaimTypeID, ... }
     * @returns {Promise<{success: boolean, code: string, message: string, data: any}>}
     */
    deleteClaimType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteClaimType", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };
  
  global.GroupInsuranceTypeService = GroupInsuranceTypeService;
})(window);
