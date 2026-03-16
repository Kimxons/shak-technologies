(function (global) {
  const core = global.StaticDataCore;
  if (!core) {
    console.error('StaticDataCore is not loaded. Ensure staticDataCore.js is included before insuranceCodeStaticDataService.js.');
    return;
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});
  const insuranceCodeService = (global.InsuranceCodeStaticDataService = global.InsuranceCodeStaticDataService || {});

  insuranceCodeService.getInsuranceCode = function getInsuranceCode(InsuranceCode) {
    const code = InsuranceCode == null ? '' : String(InsuranceCode);
    return core.postOldApi('dbo.P_GetInsuranceCode', { InsuranceCode: code }, core.APP_NAME);
  };

  insuranceCodeService.addEditInsuranceCode = function addEditInsuranceCode(payload) {
    return core.postOldApi('dbo.P_AddEditInsuranceCode', payload || {}, core.APP_NAME);
  };

  insuranceCodeService.deleteInsuranceCode = function deleteInsuranceCode(InsuranceCode) {
    return core.postOldApi('dbo.P_DeleteInsuranceCode', { InsuranceCode }, core.APP_NAME);
  };

  Object.assign(svc, {
    getInsuranceCode: insuranceCodeService.getInsuranceCode,
    addEditInsuranceCode: insuranceCodeService.addEditInsuranceCode,
    deleteInsuranceCode: insuranceCodeService.deleteInsuranceCode
  });
})(window);