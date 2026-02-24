(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const LoansService = {
    getLoan(requestData) {
      const formId = "dbo.p_GetLoan";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(LOANS_ENDPOINT, envelope);
    },
    /**
     * Edit loan details (update)
     * @param {object} requestData - Edit payload for loan
     * @returns {Promise}
     */
    async editLoan(requestData) {
      const formId = "dbo.p_EditLoans";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(LOANS_ENDPOINT, envelope);
    }
  };

  global.LoansService = LoansService;
})(window);
