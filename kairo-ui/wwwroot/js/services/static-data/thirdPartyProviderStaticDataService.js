(function (global) {
  const core = global.StaticDataCore;
  const controllerApi = global.AppCore;
  if (!core) {
    console.error('StaticDataCore is not loaded. Ensure staticDataCore.js is included before thirdPartyProviderStaticDataService.js.');
    return;
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});
  const thirdPartyProviderService = (global.ThirdPartyProviderStaticDataService = global.ThirdPartyProviderStaticDataService || {});

  function normalizeControllerResponse(response) {
    const success = response?.Success === true || response?.success === true;
    const message = response?.Message || response?.message || response?.ErrorMessage || response?.errorMessage || '';
    const data = response?.Data ?? response?.data ?? null;

    return {
      success,
      message,
      data,
      Details: data?.Details ?? data?.details ?? data ?? null
    };
  }

  async function invokeThirdPartyProviderController(endpoint, payload) {
    if (!controllerApi?.invokeControllerAsync) {
      throw new Error('AppCore.invokeControllerAsync is not available.');
    }

    const response = await controllerApi.invokeControllerAsync(endpoint, payload || {});
    return normalizeControllerResponse(response);
  }

  thirdPartyProviderService.getThirdPartyProvider = function getThirdPartyProvider(requestData) {
    return invokeThirdPartyProviderController('StaticData/ThirdPartyProvider/api/get-third-party-provider', requestData);
  };

  thirdPartyProviderService.searchThirdPartyProvider = function searchThirdPartyProvider(requestData) {
    return invokeThirdPartyProviderController('StaticData/ThirdPartyProvider/api/search-third-party-provider', requestData);
  };

  thirdPartyProviderService.addEditThirdPartyProvider = function addEditThirdPartyProvider(payload) {
    return invokeThirdPartyProviderController('StaticData/ThirdPartyProvider/api/save-third-party-provider', payload);
  };

  thirdPartyProviderService.deleteThirdPartyProvider = function deleteThirdPartyProvider(payload) {
    return invokeThirdPartyProviderController('StaticData/ThirdPartyProvider/api/delete-third-party-provider', payload);
  };

  Object.assign(svc, {
    getThirdPartyProvider: thirdPartyProviderService.getThirdPartyProvider,
    searchThirdPartyProvider: thirdPartyProviderService.searchThirdPartyProvider,
    addEditThirdPartyProvider: thirdPartyProviderService.addEditThirdPartyProvider,
    deleteThirdPartyProvider: thirdPartyProviderService.deleteThirdPartyProvider
  });
})(window);