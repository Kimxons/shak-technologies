/**
 * Cost Center Service
 * Wraps OldAPI stored procedures for the Cost Center module.
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlOtherModules || Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$|\s+$/g, "");

  const CostCenterService = {
    /**
     * Get Cost Center
     * @param {Object} requestData - { OurBranchID, CostCenterID, OperatorID }
     */
    getCostCenter(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetCostCenter", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add or Edit Cost Center
     * @param {Object} requestData - { OurBranchID, CostCenterID, CostCenter, CreatedBy, ModifiedBy, SupervisedBy, UpdateCount, IsActive }
     */
    addOrEditCostCenter(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditCostCenter", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete Cost Center
     * @param {Object} requestData - { OurBranchID, CostCenterID, OperatorID }
     */
    deleteCostCenter(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteCostCenter", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.CostCenterService = CostCenterService;
})(window);
