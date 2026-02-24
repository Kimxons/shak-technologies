(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlProduct || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const ProductBillContractService = {
    /**
     * Get Bill Product details
     * @param {Object} requestData - { BankID, OurBranchID, ProductID, OperatorID, Direction }
     * @returns {Promise} Normalized response with success, code, message, data
     */
    getBillProduct(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetBillProduct", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create new Bill Contract
     * @param {Object} requestData - Bill Contract data including all required fields
     * @returns {Promise} Normalized response
     */
    createBillContract(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateBillContract", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update existing Bill Contract
     * @param {Object} requestData - Bill Contract data with ID to update
     * @returns {Promise} Normalized response
     */
    updateBillContract(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateBillContract", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Bill Contract
     * @param {Object} requestData - { ID } or appropriate identifier
     * @returns {Promise} Normalized response
     */
    deleteBillContract(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteBillContract", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.ProductBillContractService = ProductBillContractService;
})(window);
