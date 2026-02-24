// Repayment Accounts Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const RepaymentAccountsService = {
    /**
     * Get repayment accounts for a loan application
     * @param {Object} requestData - { OurBranchID, AccountID, LoanSeries, ApplicationID, OperatorID }
     * @returns {Promise<Object>} Normalized response with repayment accounts data
     */
    getRepaymentAccounts(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetLoanRepaymentAccount", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new repayment account
     * @param {Object} requestData - Repayment account details
     * @returns {Promise<Object>} Normalized response
     */
    createRepaymentAccount(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateRepaymentAccount", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update an existing repayment account
     * @param {Object} requestData - Updated repayment account details
     * @returns {Promise<Object>} Normalized response
     */
    updateRepaymentAccount(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateRepaymentAccount", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete a repayment account
     * @param {Object} requestData - { OurBranchID, ApplicationID, RepaymentAccountID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteRepaymentAccount(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteRepaymentAccount", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.RepaymentAccountsService = RepaymentAccountsService;
})(window);
