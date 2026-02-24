(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const LoanHistoryService = {
    /**
     * Fetch loan history
     * @param {object} requestData - { OurBranchID, AccountID }
     * @returns {Promise}
     */
    async getLoanHistory(requestData) {
      const formId = "p_GetLoanHistory";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(LOANS_ENDPOINT, envelope);
    }
  };

  global.LoanHistoryService = LoanHistoryService;
})(window);
