// Loan Application Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrl || Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");

  const LoanApplicationService = {
    /**
     * Get workflow loan applications
     * @param {Object} requestData - { OurBranchID, ApplicationID, OperatorID }
     * @returns {Promise<Object>} Normalized response with loan application data
     */
    getWFLoanApplications(requestData) {
      console.log('[LoanApplicationService] getWFLoanApplications called with:', requestData);
      console.log('[LoanApplicationService] Using BASE_URL:', BASE_URL);
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanApplications", requestData);
      console.log('[LoanApplicationService] Request envelope:', envelope);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new loan application using the unified Add/Edit SP
     * @param {Object} requestData - Loan application details
     * @returns {Promise<Object>} Normalized response
     */
    async createLoanApplication(requestData) {
      console.log('[LoanApplicationService] createLoanApplication called with:', requestData);
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditWFLoanApplications", requestData);
      console.log('[LoanApplicationService] Create envelope:', envelope);
      const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
      console.log('[LoanApplicationService] Create response:', result);
      return result;
    },

    /**
     * Update an existing loan application using the unified Add/Edit SP
     * @param {Object} requestData - Updated loan application details
     * @returns {Promise<Object>} Normalized response
     */
    updateLoanApplication(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditWFLoanApplications", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete (Reject) a loan application using p_RejectWFLoanApplication
     * @param {Object} requestData - Full rejection payload
     * @returns {Promise<Object>} Normalized response
     */
    deleteLoanApplication(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_RejectWFLoanApplication", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Alter a loan application
     * @param {Object} requestData - { ApplicationID, OurBranchID, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    alterLoanApplication(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AlterLoanApplication", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get the latest application ID for a branch
     * @param {string} ourBranchID - The branch ID
     * @returns {Promise<Object>} Normalized response with latest ApplicationID
     */
    getLatestApplicationID(ourBranchID) {
      const requestData = {
        OurBranchID: ourBranchID,
        ApplicationID: '',
        OperatorID: sessionStorage.getItem('operatorID') || 'web_portal'
      };
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanApplications", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.LoanApplicationService = LoanApplicationService;
})(window);
