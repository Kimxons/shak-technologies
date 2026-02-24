(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const CONFIG = global.CoreBankingConfig || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before services/treasury/treasuryService.js."
    );
    return;
  }

  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5059").replace(/\/+$/, "");
  const TREASURY_ENDPOINT = `${BASE_URL}/api/OldAPI`;

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
  const makeTreasuryEnvelope = (formId, requestData = {}) => {
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

  const TreasuryService = {
        /**
         * Forex Deal Front Office: Delete Forex Deal (Custom)
         * Stored procedure: dbo.p_DeleteFxDealFrontOfficeCustom
         * @param {object} requestData - { OurBranchID, DealNumber, UpdateCount }
         */
        deleteFxDealFrontOfficeCustom(requestData) {
          const formId = "dbo.p_DeleteFxDealFrontOfficeCustom";
          const envelope = makeTreasuryEnvelope(formId, requestData);
          return CoreApi.post(TREASURY_ENDPOINT, envelope);
        },
    /**
     * Security Maintenance: Get Security Master (Custom)
     * Stored procedure: dbo.p_getSecurityMasterCustom
     * @param {object} requestData - { BankID, OurBranchID, SerialID, IssueNumber, OperatorID, Direction }
     */
    getSecurityMasterCustom(requestData) {
      const formId = "dbo.p_getSecurityMasterCustom";
      const envelope = makeTreasuryEnvelope(formId, requestData);
      return CoreApi.post(TREASURY_ENDPOINT, envelope);
    },

    /**
     * Money Market Front Office: Get Money Market Deal (Custom)
     * Stored procedure: dbo.p_GetMoneyMarketDealCustom
     * @param {object} requestData - { BankID, ClientBranchID, ClientID, DealNumber, Status, OperatorID, Direction }
     */
    getMoneyMarketDealCustom(requestData) {
      const formId = "dbo.p_GetMoneyMarketDealCustom";
      const envelope = makeTreasuryEnvelope(formId, requestData);
      return CoreApi.post(TREASURY_ENDPOINT, envelope);
    },

    /**
     * Forex Deal Front Office: Add or Edit Forex Deal (Custom)
     * Stored procedure: dbo.p_AddEditFxDealFrontOfficeCustom
     * @param {object} requestData - Forex deal data including all fields
     */
    addEditFxDealFrontOfficeCustom(requestData) {
      const formId = "dbo.p_AddEditFxDealFrontOfficeCustom";
      const envelope = makeTreasuryEnvelope(formId, requestData);
      return CoreApi.post(TREASURY_ENDPOINT, envelope);
    },

    /**
     * Forex Deal Front Office: Get Forex Deal Details (Custom)
     * Stored procedure: dbo.p_getFxDealFrontOfficeCustom
     * @param {object} requestData - { OurBranchID, DealNumber, OperatorID, Direction }
     */
    getFxDealFrontOfficeCustom(requestData) {
      const formId = "dbo.p_getFxDealFrontOfficeCustom";
      const envelope = makeTreasuryEnvelope(formId, requestData);
      return CoreApi.post(TREASURY_ENDPOINT, envelope);
    },

    /**
     * Security Maintenance: Add or Edit Security Master (Custom)
     * Stored procedure: dbo.p_AddEditSecurityMasterCustom
     * @param {object} requestData - Security master data including all fields
     */
    addEditSecurityMasterCustom(requestData) {
      const formId = "dbo.p_AddEditSecurityMasterCustom";
      const envelope = makeTreasuryEnvelope(formId, requestData);
      return CoreApi.post(TREASURY_ENDPOINT, envelope);
    },

    /**
     * Security Maintenance: Delete Security Master (Custom)
     * Stored procedure: dbo.p_DeleteSecurityMasterCustom
     * @param {object} requestData - { BankID, OurBranchID, IssueNumber, UpdateCount }
     */
    deleteSecurityMasterCustom(requestData) {
      const formId = "dbo.p_DeleteSecurityMasterCustom";
      const envelope = makeTreasuryEnvelope(formId, requestData);
      return CoreApi.post(TREASURY_ENDPOINT, envelope);
    }
  };

  global.TreasuryService = TreasuryService;
})(window);
