(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before systemUtilitiesService.js."
    );
    return;
  }

  const BASE_URL = (
    Environment.baseUrlCommon || Environment.baseUrlSystemCodes || "http://localhost:5059"
  ).replace(/\/+$/g, "");

  const OLD_API_ENDPOINT = `${BASE_URL}/api/OldAPI`;
  const APP_NAME = "PROJECT_KAIRO";

  function postOldApi(formID, requestData) {
    const envelope = CoreApi.makeRequestEnvelope(formID, requestData || {}, APP_NAME);
    return CoreApi.post(OLD_API_ENDPOINT, envelope);
  }

  const svc = (global.SystemUtilitiesService = global.SystemUtilitiesService || {});

  svc.postOldApi = postOldApi;

  // ============================
  // User Codes
  // ============================
  svc.getUserCodes = function getUserCodes(requestData) {
    return postOldApi("dbo.p_GetUserCodes", requestData);
  };

  svc.addEditUserCodes = function addEditUserCodes(requestData) {
    return postOldApi("dbo.p_AddEditUserCodes", requestData);
  };

  // ============================
  // Documents
  // ============================
  svc.getDocuments = function getDocuments(requestData) {
    return postOldApi("dbo.p_GetDocuments", requestData);
  };
})(window);
