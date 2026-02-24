(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrlProduct || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const ProductLoanService = {
    /**
     * Get Product Loan details
     * @param {Object} requestData - { BankID, OurBranchID, ProductID, OperatorID, Direction }
     * @returns {Promise} Normalized response with success, code, message, data
     */
    getProductLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetProductLoan", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create new Product Loan
     * @param {Object} requestData - Product data including all required fields
     * @returns {Promise} Normalized response
     */
    createProductLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditProductLoan", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update existing Product Loan
     * @param {Object} requestData - Product data with ProductID to update
     * @returns {Promise} Normalized response
     */
    updateProductLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditProductLoan", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Product Loan
     * @param {Object} requestData - { ProductID }
     * @returns {Promise} Normalized response
     */
    deleteProductLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteProductLoan", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.ProductLoanService = ProductLoanService;
})(window);
