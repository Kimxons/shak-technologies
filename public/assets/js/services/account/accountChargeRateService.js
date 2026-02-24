/**
 * Account Charge Rate Service
 * Handles account charge rate write operations (add/edit/delete)
 * Note: Use AccountService.getAccountChargeRate() for read operations
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const AccountChargeRateService = {
    /**
     * Add or edit account charge rate
     * @param {Object} requestData - { OurBranchID, AccountID, ApplicationID, ChargeID, EffectiveDate, EffectiveDateID, ExpiryDate, OperatorID, XMLData }
     * @returns {Promise} API response
     */
    addEditAccountChargeRate(requestData) {
      const formId = "dbo.p_AddEditAccountChargeRate";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ENDPOINT, envelope);
    },

    /**
     * Delete account charge rate
     * @param {Object} requestData - { OurBranchID, AccountID, ChargeID, EffectiveDateID, OperatorID }
     * @returns {Promise} API response
     */
    deleteAccountChargeRate(requestData) {
      const formId = "dbo.p_DeleteAccountChargeRate";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ENDPOINT, envelope);
    }
  };

  // Export to global scope
  global.AccountChargeRateService = AccountChargeRateService;
})(window);
