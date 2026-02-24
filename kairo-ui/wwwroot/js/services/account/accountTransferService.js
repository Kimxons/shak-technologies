(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ACCOUNT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const AccountTransferService = {
    /**
     * Get account transfer details for viewing on page load
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response with transfer details
     */
    getAccountTransferDetails(requestData) {
      const formId = "dbo.p_GetAcTransferDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Save/Create account transfer
     * @param {Object} requestData - Transfer data to save
     * @returns {Promise} API response
     */
    saveAccountTransfer(requestData) {
      const formId = "dbo.p_AddAcTransferDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Delete account transfer
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response
     */
    deleteAccountTransfer(requestData) {
      const formId = "dbo.p_DeleteAcTransfer";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    }
  };

  global.AccountTransferService = AccountTransferService;
})(window);
