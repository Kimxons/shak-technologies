(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlAccount || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const BLOCKING_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const BlockingUnblockingService = {
    /**
     * Add blocked details (Block an account)
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   ModuleTypeID: "SystemSubID",
     *   RelevantID: "AccountID",
     *   BlockedDate: "smalldatetime",
     *   BlockedReasonID: "UserSubID",
     *   BlockedDescription: "Description",
     *   BlockedInstructionBy: "Names",
     *   CreatedBy: "OperatorID",
     *   CreatedOn: "smalldatetime",
     *   SupervisedBy: "OperatorID"
     * }
     * @returns {Promise} API response
     */
    addBlockedDetails(requestData) {
      const formId = "dbo.p_AddBlockedDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Add unblocked details (Unblock an account)
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   ModuleTypeID: "SystemSubID",
     *   RelevantID: "AccountID",
     *   ReferenceID: "smallint",
     *   UnBlockedDate: "smalldatetime",
     *   UnBlockedReasonID: "UserSubID",
     *   UnBlockedDescription: "Description",
     *   UnBlockedInstructionBy: "Names",
     *   ModifiedBy: "OperatorID",
     *   ModifiedOn: "smalldatetime",
     *   SupervisedBy: "OperatorID",
     *   SupervisedOn: "smalldatetime",
     *   NewRecord: "tinyint"
     * }
     * @returns {Promise} API response
     */
    addUnBlockedDetails(requestData) {
      const formId = "dbo.p_AddUnBlockedDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Get account blocking/unblocking details
     * @param {Object} requestData - { OurBranchID, ModuleTypeID, RelevantID, OperatorID, ModuleID }
     * @returns {Promise} API response with blocking details
     */
    getBlockingDetails(requestData) {
      const formId = "dbo.p_GetBlockedDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Get blocking reasons lookup
     * @param {Object} requestData - { OurBranchID, OperatorID }
     * @returns {Promise} API response with blocking reasons
     */
    getBlockingReasons(requestData) {
      const formId = "dbo.p_GetBlockingReasons";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Get account blocking history
     * @param {Object} requestData - { OurBranchID, ModuleTypeID, RelevantID, OperatorID, ModuleID }
     * @returns {Promise} API response with blocking history
     */
    getBlockingHistory(requestData) {
      const formId = "dbo.p_GetBlockedHistory";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Delete blocking record
     * @param {Object} requestData - { OurBranchID, AccountID, OperatorID }
     * @returns {Promise} API response
     */
    deleteBlocking(requestData) {
      const formId = "dbo.p_DeleteBlockedDetails";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Get account freeze details
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID", 
     *   ReferenceID: "smallint",
     *   OperatorID: "OperatorID",
     *   Direction: "smallint"
     * }
     * @returns {Promise} API response with freeze details
     */
    getAccountFreeze(requestData) {
      const formId = "dbo.p_GetAccountFreeze";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Add or edit account freeze
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID",
     *   ReferenceID: "smallint",
     *   FreezedDate: "datetime",
     *   EffectiveDate: "datetime",
     *   FreezeCateGoryID: "varchar",
     *   FreezedReason: "varchar", 
     *   FreezedValue: "decimal",
     *   CreatedBy: "OperatorID",
     *   CreatedOn: "datetime",
     *   ModifiedBy: "OperatorID",
     *   ModifiedOn: "datetime",
     *   SupervisedBy: "OperatorID",
     *   LoanBranchID: "BranchID",
     *   LoanAccountID: "AccountID",
     *   ApplicationID: "varchar",
     *   UpdateCount: "tinyint"
     * }
     * @returns {Promise} API response with new ReferenceID
     */
    addEditAccountFreeze(requestData) {
      const formId = "dbo.p_AddEditAccountFreeze";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Get account freeze history
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID",
     *   FromDate: "smalldatetime",
     *   ToDate: "smalldatetime"
     * }
     * @returns {Promise} API response with freeze history
     */
    getAccountFreezeHistory(requestData) {
      const formId = "dbo.p_GetAccountFreezeHistory";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    },

    /**
     * Release account freeze
     * @param {Object} requestData - {
     *   OurBranchID: "BranchID",
     *   AccountID: "AccountID",
     *   ReferenceID: "nvarchar",
     *   ReleasedDate: "smalldatetime",
     *   ReleasedReason: "Remarks",
     *   ErrorNo: "int"
     * }
     * @returns {Promise} API response
     */
    releaseAccountFreeze(requestData) {
      const formId = "dbo.p_AddAccountFreezeRelease";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(BLOCKING_ENDPOINT, envelope);
    }
  };

  global.BlockingUnblockingService = BlockingUnblockingService;
})(window);
