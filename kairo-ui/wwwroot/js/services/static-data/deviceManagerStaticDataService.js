(function (global) {
  const core = global.StaticDataCore;
  if (!core) {
    console.error('StaticDataCore is not loaded. Ensure staticDataCore.js is included before deviceManagerStaticDataService.js.');
    return;
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});
  const deviceManagerService = (global.DeviceManagerStaticDataService = global.DeviceManagerStaticDataService || {});

  deviceManagerService.getDevice = function getDevice(payload) {
    return core.postOldApi('dbo.p_GetDevice', payload || {}, core.APP_NAME);
  };

  deviceManagerService.addEditDevice = function addEditDevice(payload) {
    return core.postOldApi('dbo.p_AddEditDevice', payload || {}, core.APP_NAME);
  };

  deviceManagerService.deleteDevice = function deleteDevice(payload) {
    return core.postOldApi('dbo.p_DeleteDevice', payload || {}, core.APP_NAME);
  };

  Object.assign(svc, {
    getDevice: deviceManagerService.getDevice,
    addEditDevice: deviceManagerService.addEditDevice,
    deleteDevice: deviceManagerService.deleteDevice
  });
})(window);