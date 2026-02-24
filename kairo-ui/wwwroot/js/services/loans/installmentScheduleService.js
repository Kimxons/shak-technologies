(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const InstallmentScheduleService = {
    /**
     * Fetch loan installment schedule
     * @param {object} requestData - { OurBranchID, AccountID, LoanSeries }
     * @returns {Promise}
     */
    async getInstallments(requestData) {
      const formId = "p_GetLoanInstallments";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(LOANS_ENDPOINT, envelope);
    }
  };

  global.InstallmentScheduleService = InstallmentScheduleService;
})(window);
