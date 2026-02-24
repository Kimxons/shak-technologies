// Manual Schedule Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const ManualScheduleService = {
    /**
     * Get manual loan installment temporary data
     * @param {Object} requestData - { OurBranchID, ApplicationID }
     * @returns {Promise<Object>} Normalized response with manual schedule data
     */
    getManualLoanInstallmentTemp(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetManualLoanInstallmentTemp", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new manual installment record
     * @param {Object} requestData - Manual installment details
     * @returns {Promise<Object>} Normalized response
     */
    createManualInstallment(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateManualInstallment", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update an existing manual installment record
     * @param {Object} requestData - Updated manual installment details
     * @returns {Promise<Object>} Normalized response
     */
    updateManualInstallment(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateManualInstallment", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete a manual installment record
     * @param {Object} requestData - { OurBranchID, ApplicationID, InstallmentNo }
     * @returns {Promise<Object>} Normalized response
     */
    deleteManualInstallment(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteManualInstallment", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.ManualScheduleService = ManualScheduleService;
})(window);
