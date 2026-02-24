(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const LoanInterestWorksheetService = {
    /**
     * Fetch loan interest worksheet data
     * @param {object} requestData - { FromDate, ToDate, OurBranchID, AccountID, LoanSeries }
     * @returns {Promise<Array>}
     */
    async getWorksheet(requestData) {
      const formId = "p_LoanIntWorksheet";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const resp = await CoreApi.post(LOANS_ENDPOINT, envelope);
      if (resp && resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
        return resp.data;
      }
      return [];
    }
  };

  global.LoanInterestWorksheetService = LoanInterestWorksheetService;
})(window);
