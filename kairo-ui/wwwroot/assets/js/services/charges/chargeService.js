/**
 * Charge Service
 * Handles all API calls related to charge maintenance
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCharges || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const CHARGES_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const ChargeService = {
    /**
     * Get charge details by Charge ID
     * @param {Object} requestData - { ChargeID, BankID, OurBranchID, OperatorID, Direction }
     * @returns {Promise} API response with charge data
     */
    getCharge(requestData) {
      const formId = "dbo.p_GetCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHARGES_ENDPOINT, envelope);
    },

    /**
     * Create a new charge
     * @param {Object} requestData - Charge data object
     * @returns {Promise} API response
     */
    createCharge(requestData) {
      const formId = "dbo.p_CreateCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHARGES_ENDPOINT, envelope);
    },

    /**
     * Update an existing charge
     * @param {Object} requestData - Charge data object
     * @returns {Promise} API response
     */
    updateCharge(requestData) {
      const formId = "dbo.p_UpdateCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHARGES_ENDPOINT, envelope);
    },

    /**
     * Delete a charge
     * @param {Object} requestData - { ChargeID, BankID, OurBranchID, OperatorID }
     * @returns {Promise} API response
     */
    deleteCharge(requestData) {
      const formId = "dbo.p_DeleteCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHARGES_ENDPOINT, envelope);
    },

    /**
     * Search charges using p_GetSearchResult
     * @param {String} whereStmt - WHERE clause for search
     * @param {String} advFilterString - Advanced filter string (e.g., "BankID='00'")
     * @param {Object} options - Additional options (OperatorID, ModuleID, OurBranchID)
     * @returns {Promise} API response with search results
     */
    searchCharges(whereStmt = '', advFilterString = '', options = {}) {
      const requestData = {
        TableID: "ChargeID",
        WhereStmt: whereStmt,
        PrevOrNext: 0,
        RefID: null,
        AdvFilterString: advFilterString || "BankID='00'",
        OperatorID: options.OperatorID || "web_portal",
        ModuleID: options.ModuleID || 2260,
        OurBranchID: options.OurBranchID || "002",
        SearchKey: null,
        LanguageID: "en"
      };
      
      const formId = "p_GetSearchResult";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHARGES_ENDPOINT, envelope);
    },

    /**
     * Search currencies using p_GetSearchResult
     * @param {String} whereStmt - WHERE clause for search
     * @param {String} advFilterString - Advanced filter string
     * @param {Object} options - Additional options
     * @returns {Promise} API response with search results
     */
    searchCurrencies(whereStmt = '', advFilterString = '', options = {}) {
      const requestData = {
        TableID: "Currency",
        WhereStmt: whereStmt,
        PrevOrNext: 0,
        RefID: null,
        AdvFilterString: advFilterString || "BankID='00'",
        OperatorID: options.OperatorID || "web_portal",
        ModuleID: options.ModuleID || 2260,
        OurBranchID: options.OurBranchID || "002",
        SearchKey: null,
        LanguageID: "en"
      };
      
      const formId = "p_GetSearchResult";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(CHARGES_ENDPOINT, envelope);
    }
  };

  global.ChargeService = ChargeService;
})(window);
