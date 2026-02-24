(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const GuarantorService = {
    /**
     * Fetch guarantors for a loan
     * @param {object} requestData - { OurBranchID, AccountID, LoanSeries, OperatorID }
     * @returns {Promise<Array>}
     */
    async getGuarantors(requestData) {
      const formId = "p_GuarantorView";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const resp = await CoreApi.post(LOANS_ENDPOINT, envelope);
      if (resp && resp.success && Array.isArray(resp.data) && resp.data.length > 0) {
        return resp.data;
      }
      return [];
    }
  };

  global.GuarantorService = GuarantorService;
})(window);
