(function (global) {
  const core = global.StaticDataCore;
  const controllerApi = global.AppCore;
  if (!core) {
    console.error('StaticDataCore is not loaded. Ensure staticDataCore.js is included before deviceManagerStaticDataService.js.');
    return;
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});
  const deviceManagerService = (global.DeviceManagerStaticDataService = global.DeviceManagerStaticDataService || {});

  function normalizeControllerResponse(response) {
    const success = response?.Success === true || response?.success === true;
    const message = response?.Message || response?.message || response?.ErrorMessage || response?.errorMessage || '';
    const data = response?.Data ?? response?.data ?? null;
    const primaryDetails = data?.Details01 ?? data?.details01 ?? data?.Details ?? data?.details ?? null;

    return {
      success,
      message,
      data,
      Details: primaryDetails,
      Details01: data?.Details01 ?? data?.details01 ?? null
    };
  }

  async function invokeDeviceManagerController(endpoint, payload) {
    if (!controllerApi?.invokeControllerAsync) {
      throw new Error('AppCore.invokeControllerAsync is not available.');
    }

    const response = await controllerApi.invokeControllerAsync(endpoint, payload || {});
    return normalizeControllerResponse(response);
  }

  deviceManagerService.getDevice = function getDevice(payload) {
    const isDeviceManagerScreen = !!global.document?.getElementById('device-manager-form');
    if (isDeviceManagerScreen && global.__deviceManagerAllowGetDevice !== true) {
      return Promise.resolve({ success: true, data: [], Details: [] });
    }
    return invokeDeviceManagerController('StaticData/DeviceManager/api/get-device-manager', payload);
  };

  deviceManagerService.addEditDevice = function addEditDevice(payload) {
    return invokeDeviceManagerController('StaticData/DeviceManager/api/save-device-manager', payload);
  };

  deviceManagerService.deleteDevice = function deleteDevice(payload) {
    return invokeDeviceManagerController('StaticData/DeviceManager/api/delete-device-manager', payload);
  };

  Object.assign(svc, {
    getDevice: deviceManagerService.getDevice,
    addEditDevice: deviceManagerService.addEditDevice,
    deleteDevice: deviceManagerService.deleteDevice
  });
})(window);