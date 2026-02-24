(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const CONFIG = global.CoreBankingConfig || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before services/deposit/depositService.js."
    );
    return;
  }

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5059").replace(/\/+$/, "");
  const DEPOSIT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const pad2 = (n) => String(n).padStart(2, "0");

  // Format: MM/DD/YYYY HH:mm:ss (matches the sample request)
  const getRequestTime = () => {
    const d = new Date();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const HH = pad2(d.getHours());
    const MM = pad2(d.getMinutes());
    const SS = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${HH}:${MM}:${SS}`;
  };

  // Envelope shaped like the sample request (also includes FormID for compatibility)
  const makeDepositEnvelope = (formId, requestData = {}) => {
    return {
      RequestID: formId,
      FormId: formId,
      FormID: formId,
      RequestData: requestData,
      RequestTime: getRequestTime(),
      AppName: Environment.appName || CONFIG.appName || "PROJECT_KAIRO",
      Checksum: ""
    };
  };

  const DepositService = {
    /**
     * Get Deposit Account Details.
     * Stored procedure: dbo.p_GetDepositAccountDetails
     * @param {object} requestData - { BankID, OurBranchID, AccountID, OperatorID }
     */
    getDepositAccountDetails(requestData) {
      const formId = "dbo.p_GetDepositAccountDetails";
      const envelope = makeDepositEnvelope(formId, requestData);
      return CoreApi.post(DEPOSIT_ENDPOINT, envelope);
    },

    /**
     * Get FD Account Details.
     * Stored procedure: dbo.p_getFDAccountDetails
     * @param {object} requestData - { BankID, OurBranchID, ClientID, AccountID, ReceiptID, SerialID, Direction, DirectionType, OperatorID }
     */
    getFDAccountDetails(requestData) {
      const formId = "dbo.p_getFDAccountDetails";
      const envelope = makeDepositEnvelope(formId, requestData);
      return CoreApi.post(DEPOSIT_ENDPOINT, envelope);
    }
  };

  global.DepositService = DepositService;
})(window);
