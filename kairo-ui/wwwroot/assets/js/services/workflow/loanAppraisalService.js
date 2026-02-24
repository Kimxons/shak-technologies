// Loan Appraisal Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const LoanAppraisalService = {
    /**
     * Get workflow loan appraisals
     * @param {Object} requestData - { OurBranchID, LogInBranchID, ApplicationID, RefNo, OperatorID, Direction }
     * @returns {Promise<Object>} Normalized response with loan appraisal data
     */
    async getWFLoanAppraisals(requestData) {
      console.group('🔵 LoanAppraisalService.getWFLoanAppraisals');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanAppraisals", requestData);
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
     * Create/Save loan appraisal
     * @param {Object} requestData - Appraisal details
     * @returns {Promise<Object>} Normalized response
     */
    saveLoanAppraisal(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveLoanAppraisal", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.LoanAppraisalService = LoanAppraisalService;
})(window);
