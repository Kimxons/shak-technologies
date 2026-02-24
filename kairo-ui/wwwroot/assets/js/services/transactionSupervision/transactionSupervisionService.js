/**
 * Transaction Supervision Service
 * Handles all transaction supervision operations
 */
(function (global) {
  'use strict';

  const CoreApi = global.CoreApi;
  if (!CoreApi) {
    throw new Error('CoreApi is required. Please load coreApi.js first.');
  }

  const BASE_URL = (global.Environment?.baseUrlTransactionSupervision || global.Environment?.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");

  const TransactionSupervisionService = {
    /**
     * Get unsupervised module list
     * @param {Object} requestData - { OurBranchID, OperatorID }
     * @returns {Promise} API response
     */
    getUnsuperviseModuleList(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetUnsuperviseModuleList", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get pending transactions for supervision
     * @param {Object} requestData - Filter parameters
     * @returns {Promise} API response
     */
    getPendingTransactions(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetPendingTransactions", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get unsupervised transaction list
     * @param {Object} requestData - { OurBranchID, OperatorID, CategoryID, ModuleID, IsRole, TrxCreatedBy }
     * @returns {Promise} API response
     */
    getUnsuperviseTrxList(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetUnsuperviseTrxList", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Supervise selected transactions
     * @param {Object} requestData - { TrxBranchID, TrxBatchID, CategoryID, SupervisedBy, IsJointSupervision, IsUnpaidItem }
     * @returns {Promise} API response
     */
    superviseTransaction(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_SuperviseTrx", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Reject selected transactions
     * @param {Object} requestData - { TrxBranchID, TrxBatchID, SupervisedBy, RejectReason }
     * @returns {Promise} API response
     */
    rejectTransaction(requestData) {
      console.log('🔴 TransactionSupervisionService.rejectTransaction called with:', requestData);
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_RejectTrx", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Verify supervisor password
     * @param {Object} requestData - { Password, OperatorID }
     * @returns {Promise} API response
     */
    verifyPassword(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_VerifySupervisorPassword", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get account balance details
     * @param {Object} requestData - { AccountID, OurBranchID }
     * @returns {Promise} API response
     */
    getAccountBalance(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetAccountBalance", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  // Expose to global scope
  global.TransactionSupervisionService = TransactionSupervisionService;

  console.log('✓ TransactionSupervisionService loaded');

})(window);
