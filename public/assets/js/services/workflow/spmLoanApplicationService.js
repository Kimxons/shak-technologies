// SPM Workflow Loan Application Service
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlClientSpm || "http://localhost:5000").replace(/\/+$/, "");

  const SPMLoanApplicationService = {
    /**
     * Get SPM workflow loan applications
     * @param {Object} requestData - { OurBranchID, ApplicationID }
     * @returns {Promise<Object>} Normalized response with application data
     */
    async getSPMWFLoanApplications(requestData) {
      console.group('🔵 SPMLoanApplicationService.getSPMWFLoanApplications');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSPMWFLoanApplications", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Create/Save SPM workflow loan application
     * @param {Object} requestData - Application details
     * @returns {Promise<Object>} Normalized response
     */
    saveSPMWFLoanApplication(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveSPMWFLoanApplication", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update SPM workflow loan application
     * @param {Object} requestData - Application details
     * @returns {Promise<Object>} Normalized response
     */
    updateSPMWFLoanApplication(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateSPMWFLoanApplication", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete SPM workflow loan application
     * @param {Object} requestData - { OurBranchID, ApplicationID, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteSPMWFLoanApplication(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteSPMWFLoanApplication", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.SPMLoanApplicationService = SPMLoanApplicationService;
})(window);
