/**
 * Other Module Service
 * Handles all other module-related API operations including:
 * - Bank Statement Uploading
 * - Other module operations
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:8087").replace(/\/+$/, "");

  const OtherModuleService = {
    /**
     * Get Bank Statement - Retrieves reconciliation bank statement data
     * @param {Object} requestData - { BankID, OurBranchID, BatchNo, OperatorID }
     * @returns {Promise<Object>} Normalized response with bank statement data
     */
    getBankStatement(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetRecBankStatement", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Upload Bank Statement - Uploads bank statement file
     * @param {Object} requestData - Upload request data
     * @returns {Promise<Object>} Normalized response
     */
    uploadBankStatement(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UploadBankStatement", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save Bank Statement - Saves bank statement data
     * @param {Object} requestData - Bank statement data to save
     * @returns {Promise<Object>} Normalized response
     */
    saveBankStatement(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SaveBankStatement", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Bank Statement - Deletes bank statement data
     * @param {Object} requestData - { BankID, OurBranchID, BatchNo, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteBankStatement(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteBankStatement", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add Bank Statement - Adds new reconciliation bank statement record
     * @param {Object} requestData - Bank statement data to add
     * @returns {Promise<Object>} Normalized response
     */
    addBankStatement(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddRecBankStatement", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Bank Auto Reconciliation - Retrieves bank auto reconciliation data
     * @param {Object} requestData - Request data for auto reconciliation
     * @returns {Promise<Object>} Normalized response with bank auto reconciliation data
     */
    getBankAuto(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetBankAuto", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Auto Reconciliation - Retrieves auto reconciliation data
     * @param {Object} requestData - { BankID, OurBranchID, AccountID, BatchNo, OperatorID }
     * @returns {Promise<Object>} Normalized response with auto reconciliation data
     */
    getAutoReconciliation(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAutoReconciliation", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Edit Auto Reconciliation - Edits auto reconciliation batch details
     * @param {Object} requestData - { OurBranchID, AccountID, BatchDetail }
     * @returns {Promise<Object>} Normalized response
     */
    editAutoReconciliation(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditAutoReconciliation", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get Bank Reconciliation Manual - Retrieves manual bank reconciliation data
     * @param {Object} requestData - Request data for manual reconciliation
     * @returns {Promise<Object>} Normalized response with manual reconciliation data
     */
    getBankReconManual(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetBankReconlManual", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add Bank Reconciliation Manual - Adds/saves manual bank reconciliation data
     * @param {Object} requestData - { BankID, OurBranchID, AccountID, BatchNo, BankStmtDetail, AccountTrxDetail }
     * @returns {Promise<Object>} Normalized response
     */
    addBankReconManual(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddBankReconlManual", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.OtherModuleService = OtherModuleService;

  console.log('✅ OtherModuleService loaded');
})(window);
