(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const LoanStatementService = {
    /**
     * Fetch account transactions (loan statement)
     * @param {object} requestData - { OurBranchID, AccountID, FromDate, ToDate, OperatorID }
     * @returns {Promise}
     */
    async getAccountTransactions(requestData) {
      const formId = "p_GetAccountTransactions";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(LOANS_ENDPOINT, envelope);
    }
  };

  global.LoanStatementService = LoanStatementService;
})(window);
