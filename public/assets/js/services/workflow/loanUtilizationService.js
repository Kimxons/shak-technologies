// Loan Utilization Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const LoanUtilizationService = {
    /**
     * Get workflow loan utilization data
     * @param {Object} requestData - { OurBranchID, ApplicationID, OperatorID, ModuleID }
     * @returns {Promise<Object>} Normalized response with loan utilization data
     */
    getWFLoanUtilization(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanUtilization", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new loan utilization record
     * @param {Object} requestData - Loan utilization details
     * @returns {Promise<Object>} Normalized response
     */
    createLoanUtilization(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateLoanUtilization", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update an existing loan utilization record
     * @param {Object} requestData - Updated loan utilization details
     * @returns {Promise<Object>} Normalized response
     */
    updateLoanUtilization(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateLoanUtilization", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete a loan utilization record
     * @param {Object} requestData - { OurBranchID, ApplicationID, SLNO, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteLoanUtilization(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteLoanUtilization", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.LoanUtilizationService = LoanUtilizationService;
})(window);
