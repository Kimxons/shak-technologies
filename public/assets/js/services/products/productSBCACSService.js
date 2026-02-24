(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlProducts || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const ProductSBCACSService = {
    /**
     * Get Product (SB, CA, CS, SH) details
     * @param {Object} requestData - { BankID, OurBranchID, ProductID, ProductTypeID, OperatorID, Direction }
     * @returns {Promise} Normalized response with success, code, message, data
     */
    getProductSB(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetProductSB", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create new Product (SB, CA, CS, SH)
     * @param {Object} requestData - Product data including all required fields
     * @returns {Promise} Normalized response
     */
    createProductSB(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditProductSB", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update existing Product (SB, CA, CS, SH)
     * @param {Object} requestData - Product data with ProductID to update
     * @returns {Promise} Normalized response
     */
    updateProductSB(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditProductSB", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Product (SB, CA, CS, SH)
     * @param {Object} requestData - { ProductID }
     * @returns {Promise} Normalized response
     */
    deleteProductSB(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteProductSB", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.ProductSBCACSService = ProductSBCACSService;
})(window);
