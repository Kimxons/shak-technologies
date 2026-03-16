(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before staticDataCore.js."
    );
    return;
  }

  function resolveOldApiEndpoint() {
    if (Environment.useLocalOldApiProxy === true) {
      return '/api/OldAPI';
    }

    const baseUrl = (
      Environment.baseUrlCommon ||
      Environment.baseUrlSystemCodes ||
      ''
    ).toString().replace(/\/+$/g, '');

    return baseUrl ? `${baseUrl}/api/OldAPI` : '/api/OldAPI';
  }

  const APP_NAME = 'PROJECT_KAIRO';

  function formatLegacyRequestTime(d = new Date()) {
    const pad2 = (n) => String(n).padStart(2, '0');
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    const ss = pad2(d.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  function postOldApi(formID, requestData = {}, appName = null) {
    const envelope = CoreApi.makeRequestEnvelope(formID, requestData, appName);
    envelope.RequestID = formID;
    envelope.FormID = formID;
    envelope.FormId = formID;
    envelope.RequestTime = formatLegacyRequestTime();

    return CoreApi.post(resolveOldApiEndpoint(), envelope);
  }

  global.StaticDataCore = global.StaticDataCore || {
    APP_NAME,
    postOldApi,
    resolveOldApiEndpoint
  };

  const svc = (global.StaticDataService = global.StaticDataService || {});
  svc.postOldApi = postOldApi;
})(window);