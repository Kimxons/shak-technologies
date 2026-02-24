(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const DORMANT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const AccountActivateDormantService = {
    /**
     * Get dormant account details
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID",
     *   OperatorID: "OperatorID"
     * }
     * @returns {Promise} API response with dormant account details
     */
    getAccountDormant(requestData) {
      const formId = "dbo.p_GetAccountDormant";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(DORMANT_ENDPOINT, envelope);
    },

    /**
     * Activate dormant account
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID",
     *   InstructedBy: "Names",
     *   Comments: "Description",
     *   OperatorID: "OperatorID"
     * }
     * @returns {Promise} API response
     */
    activateDormantAccount(requestData) {
      const formId = "dbo.p_ActivateDormantAccount";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(DORMANT_ENDPOINT, envelope);
    },

    /**
     * Update dormant account activation details
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID",
     *   InstructedBy: "Names",
     *   Comments: "Description",
     *   ModifiedBy: "OperatorID",
     *   ModifiedOn: "smalldatetime"
     * }
     * @returns {Promise} API response
     */
    updateDormantActivation(requestData) {
      const formId = "dbo.p_UpdateDormantActivation";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(DORMANT_ENDPOINT, envelope);
    },

    /**
     * Edit/Save dormant account activation
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID",
     *   ReferenceID: "smallint",
     *   ActivatedDate: "smalldatetime",
     *   ActivatedBy: "OperatorID",
     *   InstructedBy: "Names",
     *   Comments: "Remarks",
     *   TrxRowID: "numeric",
     *   ModifiedOn: "smalldatetime",
     *   SupervisedBy: "OperatorID",
     *   NewRecord: "tinyint"
     * }
     * @returns {Promise} API response
     */
    editAccountDormant(requestData) {
      const formId = "dbo.p_EditAccountDormant";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(DORMANT_ENDPOINT, envelope);
    }
  };

  // Expose to global scope
  global.AccountActivateDormantService = AccountActivateDormantService;
})(window);
