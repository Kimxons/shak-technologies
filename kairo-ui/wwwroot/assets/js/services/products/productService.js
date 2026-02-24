(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlProduct || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const ProductService = {
    /**
     * Get Product (FD, RD, SC) details
     * @param {Object} requestData - { BankID, OurBranchID, ProductID, OperatorID, Direction }
     * @returns {Promise} Normalized response with success, code, message, data
     */
    getProduct(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetProductFD", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create new Product (FD, RD, SC)
     * @param {Object} requestData - Product data including all required fields
     * @returns {Promise} Normalized response
     */
    createProduct(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateProductFD", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update existing Product (FD, RD, SC)
     * @param {Object} requestData - Product data with ProductID to update
     * @returns {Promise} Normalized response
     */
    updateProduct(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateProductFD", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add or Edit Product (FD, RD, SC) - Unified method
     * @param {Object} requestData - Product data including all required fields
     * @returns {Promise} Normalized response
     */
    addEditProductFD(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditProductFD", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Product (FD, RD, SC)
     * @param {Object} requestData - { ProductID }
     * @returns {Promise} Normalized response
     */
    deleteProduct(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteProductFD", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.ProductService = ProductService;
})(window);
