/**
 * Loan Collaterals Service
 * Handles API calls for Workflow Loan Collaterals module
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

  const LoanCollateralsService = {
    /**
     * Get workflow advanced collaterals
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.ModuleID - Module ID
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.ApplicationID - Application ID
     * @param {string} requestData.CollateralID - Collateral ID (optional)
     * @param {string} requestData.OperatorID - Operator ID
     * @param {string} requestData.Direction - Direction (1 for forward, 0 for backward)
     * @returns {Promise<Object>} Normalized response with collateral data
     */
    getWFAdvCollaterals(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("p_GetWFAdvCollaterals", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add or edit loan collateral
     * @param {Object} requestData - Collateral data to save
     * @returns {Promise<Object>} Normalized response
     */
    addEditLoanCollateral(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("p_AddEditWFAdvCollaterals", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete loan collateral
     * @param {Object} requestData - Collateral deletion parameters
     * @returns {Promise<Object>} Normalized response
     */
    deleteLoanCollateral(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("p_DeleteWFAdvCollaterals", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Withdraw collateral assignment
     * @param {Object} requestData - Withdrawal parameters
     * @returns {Promise<Object>} Normalized response
     */
    withdrawCollateral(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("p_WithdrawWFAdvCollaterals", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.LoanCollateralsService = LoanCollateralsService;
})(window);
