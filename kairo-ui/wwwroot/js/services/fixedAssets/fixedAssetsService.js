(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrlFixedAssets || Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

  const FixedAssetsService = {
    getFASettings(requestData) {
      // FormId and RequestID as per your sample
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetFASettings", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditFADepRates(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditFADepRates", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getFADepreciationRates(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetFADepRates", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getFADepRateDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetFADepRateDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditFADepRateDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditFADepRateDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteFADepRateDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteFADepRateDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getFATypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetFATypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditFASettings(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditFASettings", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteFASettings(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteFASettings", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditFATypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditFATypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteFATypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteFATypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteFADepRates(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteFADepRates", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getFASubTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetFASubTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditFASubTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditFASubTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteFASubTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteFASubTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getFA(requestData) {
      const appName = Environment.appName || "PROJECT_KAIRO";
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetFA", requestData, appName);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    getGLInterface(requestData) {
      const appName = Environment.appName || "PROJECT_KAIRO";
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetGLInterface", requestData, appName);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    addEditGLInterface(requestData) {
      const appName = Environment.appName || "PROJECT_KAIRO";
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditGLInterface", requestData, appName);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    deleteGLInterface(requestData) {
      const appName = Environment.appName || "PROJECT_KAIRO";
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteGLInterface", requestData, appName);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.FixedAssetsService = FixedAssetsService;
})(window);
