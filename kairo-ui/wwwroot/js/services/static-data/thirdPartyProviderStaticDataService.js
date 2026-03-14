(function (global) {
  const core = global.StaticDataCore;
  if (!core) {
    console.error('StaticDataCore is not loaded. Ensure staticDataCore.js is included before thirdPartyProviderStaticDataService.js.');
    return;
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});
  const thirdPartyProviderService = (global.ThirdPartyProviderStaticDataService = global.ThirdPartyProviderStaticDataService || {});

  thirdPartyProviderService.getThirdPartyProvider = function getThirdPartyProvider(requestData) {
    return core.postOldApi('dbo.p_GetThirdPartyProvider', requestData || {}, core.APP_NAME);
  };

  thirdPartyProviderService.addEditThirdPartyProvider = function addEditThirdPartyProvider(payload) {
    return core.postOldApi('dbo.p_AddEditThirdPartyProvider', payload || {}, core.APP_NAME);
  };

  thirdPartyProviderService.deleteThirdPartyProvider = function deleteThirdPartyProvider(payload) {
    return core.postOldApi('dbo.p_DeleteThirdPartyProvider', payload || {}, core.APP_NAME);
  };

  Object.assign(svc, {
    getThirdPartyProvider: thirdPartyProviderService.getThirdPartyProvider,
    addEditThirdPartyProvider: thirdPartyProviderService.addEditThirdPartyProvider,
    deleteThirdPartyProvider: thirdPartyProviderService.deleteThirdPartyProvider
  });
})(window);