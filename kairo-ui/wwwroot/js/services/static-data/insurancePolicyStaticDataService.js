(function (global) {
  const core = global.StaticDataCore;
  if (!core) {
    console.error('StaticDataCore is not loaded. Ensure staticDataCore.js is included before insurancePolicyStaticDataService.js.');
    return;
  }

  const svc = (global.StaticDataService = global.StaticDataService || {});
  const insurancePolicyService = (global.InsurancePolicyStaticDataService = global.InsurancePolicyStaticDataService || {});

  insurancePolicyService.getInsurancePolicy = function getInsurancePolicy(PolicyNo) {
    return core.postOldApi('dbo.P_GetInsurancePolicy', { PolicyNo }, core.APP_NAME);
  };

  insurancePolicyService.addEditInsurancePolicy = function addEditInsurancePolicy(payload) {
    return core.postOldApi('dbo.P_AddEditInsurancePolicy', payload || {}, core.APP_NAME);
  };

  insurancePolicyService.deleteInsurancePolicy = function deleteInsurancePolicy(PolicyNo) {
    return core.postOldApi('dbo.P_DeleteInsurancePolicy', { PolicyNo }, core.APP_NAME);
  };

  Object.assign(svc, {
    getInsurancePolicy: insurancePolicyService.getInsurancePolicy,
    addEditInsurancePolicy: insurancePolicyService.addEditInsurancePolicy,
    deleteInsurancePolicy: insurancePolicyService.deleteInsurancePolicy
  });
})(window);