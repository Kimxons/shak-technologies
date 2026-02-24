(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlMicroFinance || "http://localhost:XXXX").replace(/\/+$/, "");
  
  const ExitTypeService = {
    getExitTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetExitTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },
    
    addEditExitType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditExitTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    deleteExitType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteExitTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };
  
  global.ExitTypeService = ExitTypeService;
})(window);