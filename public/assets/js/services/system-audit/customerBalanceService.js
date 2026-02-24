(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;
  const FORM_ID = "dbo.ch_AccountBalance";
  const UPDATE_FORM_ID = "dbo.ch_UpdateAccountBalance";
  const APP_NAME = "PROJECT_KAIRO";

  function formatLegacyRequestTime(date = new Date()) {
    const pad2 = (n) => String(n).padStart(2, "0");
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = String(date.getFullYear());
    const hh = pad2(date.getHours());
    const min = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
  }

  const CustomerBalanceService = {
    /**
     * Fetch customer/account balance audit data.
     * Expected payload shape (RequestData):
     * { OurBranchID, ProductID, Year, Mode, Status, OperatorID }
     */
    getCustomerBalance(requestData) {
      if (!CoreApi) {
        throw new Error("CoreApi not loaded. Ensure ServiceLoader.loadCore() ran first.");
      }

      // Use the shared envelope builder for consistency, but override a couple
      // fields to match the requested legacy shape for this stored procedure.
      const envelope = CoreApi.makeRequestEnvelope(FORM_ID, requestData, APP_NAME);
      envelope.RequestID = FORM_ID;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(ENDPOINT, envelope);
    }
    ,

    /**
     * Rectify/update account balances.
     * Expected payload shape (RequestData):
     * { OurBranchID, AccountTypeID, DetailRecords, CreatedBy, CreatedOn, SupervisedBy }
     */
    updateAccountBalance(requestData) {
      if (!CoreApi) {
        throw new Error("CoreApi not loaded. Ensure ServiceLoader.loadCore() ran first.");
      }

      const envelope = CoreApi.makeRequestEnvelope(UPDATE_FORM_ID, requestData, APP_NAME);
      envelope.RequestID = UPDATE_FORM_ID;
      envelope.FormId = UPDATE_FORM_ID;
      envelope.RequestTime = formatLegacyRequestTime();

      return CoreApi.post(ENDPOINT, envelope);
    }
  };

  global.CustomerBalanceService = CustomerBalanceService;
})(window);
