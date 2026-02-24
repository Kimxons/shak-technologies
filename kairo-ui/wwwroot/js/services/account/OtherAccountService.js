(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlCommon || Environment.baseUrlAccount || "http://localhost:XXXX").replace(/\/+$/, "");
  const ACCOUNT_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const OtherAccountService = {
    /**
     * Add or edit account operated by (save/update signatories)
     * @param {Object} requestData - { OurBranchID, AccountID, OperatedBy, OperatedOn, SupervisedBy, UpdateCount, DetailRecords }
     * @returns {Promise} API response
     */
    addEditAccountOperatedBy(requestData) {
      const formId = "dbo.p_AddEditAccountOperatedBy";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account operated by (signatories with full details)
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response with signatory records
     */
    getAccountOperatedBy(requestData) {
      const formId = "dbo.p_GetAccountOperatedBy";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account signatories
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response with signatory records
     */
    getAccountSignatories(requestData) {
      const formId = "dbo.p_GetAccountSignatories";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get signatory image (signature/photo)
     * @param {Object} requestData - { SignID, PhotoID, DocumentID }
     * @returns {Promise} API response with image data
     */
    getSignatoryImage(requestData) {
      const formId = "dbo.p_GetSignatoryImage";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Get account nominee
     * @param {Object} requestData - { OurBranchID, AccountID, NomineeClientID, OperatorID, Direction }
     * @returns {Promise} API response with nominee records
     */
    getAccountNominee(requestData) {
      const formId = "dbo.p_GetAccountNominee";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Add or edit account nominee
     * @param {Object} requestData - { OurBranchID, AccountID, NomineeClientID, IsDependent, NominationPercentage, IsNominationRollover, Remarks, CreatedBy, CreatedOn, ModifiedBy, ModifiedOn, SupervisedBy, NewRecord }
     * @returns {Promise} API response
     */
    addEditAccountNominee(requestData) {
      const formId = "dbo.p_AddEditAccountNominee";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    },

    /**
     * Delete account nominee
     * @param {Object} requestData - { OurBranchID, AccountID, NomineeClientID, NewRecord }
     * @returns {Promise} API response
     */
    deleteAccountNominee(requestData) {
      const formId = "dbo.p_DeleteAccountNominee";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(ACCOUNT_ENDPOINT, envelope);
    }
  };

  // Export as both OtherAccountService and otherAccountService for compatibility
  global.OtherAccountService = OtherAccountService;
  global.otherAccountService = OtherAccountService;
})(window);
