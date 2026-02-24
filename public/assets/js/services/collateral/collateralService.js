(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before collateralService.js."
    );
    return;
  }

  // Collateral requests must go through baseUrlCommon/api/OldAPI
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(
    /\/+$/,
    ""
  );
  const COLLATERAL_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  const CollateralService = {
    /**
     * Collateral Maintenance: Get Collaterals
     * @param {object} requestData - { OurBranchID, CollateralID, OperatorID, Direction }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getCollaterals(requestData) {
      const formId = "dbo.p_GetCollaterals";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(COLLATERAL_ENDPOINT, envelope);
    },

    // Alias (naming convenience)
    collateralMaintenance(requestData) {
      return this.getCollaterals(requestData);
    },

    /**
     * Collateral More Details: Get Collateral Properties
     * @param {object} requestData - { OurBranchID, CollateralID, RefNo, OperatorID, Direction }
     * @returns {Promise} Normalized response with { success, code, message, data }
     */
    getCollateralProperties(requestData) {
      const formId = "dbo.p_GetCollateralProperties";
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      return CoreApi.post(COLLATERAL_ENDPOINT, envelope);
    }
  };

  global.CollateralService = CollateralService;
})(window);
