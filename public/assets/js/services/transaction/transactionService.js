/**
 * Transaction Service
 * Handles all transaction-related API operations including:
 * - Group Collection Allocation
 * - Other transaction operations
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlTransaction || "http://localhost:8080").replace(/\/+$/, "");

  const TransactionService = {
    /**
     * Get Group Collection Loan Collection
     * @param {Object} requestData - { OurBranchID, TrxSerialID, AllocationTypeID, OperatorID }
     * @returns {Promise<Object>} Normalized response with allocation data
     */
    getGCLoanCollection(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGCLoanCollection", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save Group Collection Allocation
     * @param {Object} requestData - Allocation data to save
     * @returns {Promise<Object>} Normalized response
     */
    saveGCAllocation(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGCAllocation", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update Group Collection Allocation
     * @param {Object} requestData - Allocation data to update
     * @returns {Promise<Object>} Normalized response
     */
    updateGCAllocation(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateGCAllocation", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Group Collection Allocation
     * @param {Object} requestData - { AllocationID, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteGCAllocation(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGCAllocation", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get allocation details by ID
     * @param {Object} requestData - { AllocationID, OperatorID }
     * @returns {Promise<Object>} Normalized response with allocation details
     */
    getGCAllocationDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGCAllocationDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Group Collection Reversal Details
     * Calls p_GetGCReversalDetail stored procedure
     * @param {Object} requestData - Request parameters
     * @returns {Promise<Object>} Normalized response
     */
    getGCReversalDetail(requestData) {
      const formId = "dbo.p_GetGCReversalDetail";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Group Default Scheme
     * Calls p_GetGroupDefaultScheme stored procedure
     * @param {Object} requestData - Request parameters
     * @returns {Promise<Object>} Normalized response
     */
    getGroupDefaultScheme(requestData = {}) {
      const formId = "dbo.p_GetGroupDefaultScheme";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save/Process Group Collection Reversal
     * @param {Object} requestData - Reversal data
     * @returns {Promise<Object>} Normalized response
     */
    saveGCReversal(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveGCReversal", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Group Collection Reversal
     * @param {Object} requestData - { ReversalID, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteGCReversal(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGCReversal", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.TransactionService = TransactionService;

  console.log('✅ TransactionService loaded');
})(window);
