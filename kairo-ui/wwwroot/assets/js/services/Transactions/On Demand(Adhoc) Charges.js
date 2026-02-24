(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  
  // Use common base URL like other services
  const BASE_URL = (
    Environment.baseUrl ||
    Environment.baseUrlCommon ||
    "http://172.16.2.31:3306"
  ).replace(/\/+$/, "");

  const OnDemandChargesService = {
    /**
     * Add AdHoc Charge
     * Stored procedure: dbo.p_AddAdHocCharge
     */
    addAdHocCharge(requestData) {
      const formId = "dbo.p_AddAdHocCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    
    /**
     * Get Adhoc Charge List
     * Stored procedure: dbo.p_GetAdhocChargeList
     */
    getAdhocChargeList(requestData) {
      const formId = "dbo.p_GetAdhocChargeList";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    
    /**
     * Get Single AdHoc Charge
     * Stored procedure: dbo.p_GetAdHocCharge
     */
    getAdHocCharge(requestData) {
      const formId = "dbo.p_GetAdHocCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    
    getCharges(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("GetOnDemandCharges", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    createCharge(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("CreateOnDemandCharge", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    updateCharge(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("UpdateOnDemandCharge", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteCharge(requestData) {
      const formId = "dbo.p_DeleteAdHocCharge";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData, "PROJECT_KAIRO");
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.OnDemandChargesService = OnDemandChargesService;
})(window);
