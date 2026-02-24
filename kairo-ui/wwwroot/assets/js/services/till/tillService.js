(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (global.Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");
  
  const TillService = {
    /**
     * Get till details per cashier
     * @param {Object} requestData - { CashierID: string }
     * @returns {Promise<Object>} Normalized response
     */
    getTillDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.pc_GetTillDetailPerTill", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };
  
  global.TillService = TillService;
})(window);
