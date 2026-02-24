// Limits & Collateral Service
// Handles all API calls for the Limits & Collateral module

(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");

  const LimitsCollateralService = {
    /**
     * Get collateral types
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.BankID - Bank ID
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.CollateralTypeID - Collateral Type ID
     * @param {string} requestData.OperatorID - Operator ID
     * @param {string} requestData.Direction - Direction (1 for next, 0 for previous)
     * @returns {Promise} API response
     */
    getCollateralTypes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetCollateralTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new collateral type
     * @param {Object} requestData - Collateral type data
     * @returns {Promise} API response
     */
    createCollateralType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditCollateralTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update an existing collateral type
     * @param {Object} requestData - Collateral type data
     * @returns {Promise} API response
     */
    updateCollateralType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditCollateralTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add supervision data
     * @param {Object} requestData - Supervision data
     * @returns {Promise} API response
     */
    addSupervisionData(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddSupervionData", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete a collateral type
     * @param {Object} requestData - Request parameters
     * @returns {Promise} API response
     */
    deleteCollateralType(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteCollateralTypes", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get limit clients
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.LimitID - Limit ID
     * @param {string} requestData.RefNo - Reference Number
     * @param {string} requestData.ClientID - Client ID
     * @param {string} requestData.OperatorID - Operator ID
     * @param {string} requestData.Direction - Direction (1 for next, 0 for previous)
     * @returns {Promise} API response
     */
    getLimitClients(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetLimitClients", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new limit client
     * @param {Object} requestData - Limit client data
     * @returns {Promise} API response
     */
    createLimitClient(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddLimitClients", requestData);
      if (requestData.OurBranchID) envelope.OurBranchID = requestData.OurBranchID;
      if (requestData.ClientID) envelope.ClientID = requestData.ClientID;
      if (requestData.LimitID) envelope.LimitID = requestData.LimitID;
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Add a new client limit
     * @param {Object} requestData - Client limit data
     * @returns {Promise} API response
     */
    addClientLimit(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddLimitClients", requestData);
      if (requestData.OurBranchID) envelope.OurBranchID = requestData.OurBranchID;
      if (requestData.ClientID) envelope.ClientID = requestData.ClientID;
      if (requestData.LimitID) envelope.LimitID = requestData.LimitID;
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update an existing limit client
     * @param {Object} requestData - Limit client data
     * @returns {Promise} API response
     */
    updateLimitClient(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddLimitClients", requestData);
      if (requestData.OurBranchID) envelope.OurBranchID = requestData.OurBranchID;
      if (requestData.ClientID) envelope.ClientID = requestData.ClientID;
      if (requestData.LimitID) envelope.LimitID = requestData.LimitID;
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete a limit client
     * @param {Object} requestData - Request parameters
     * @returns {Promise} API response
     */
    deleteLimitClient(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteLimits2", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get limit collaterals
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.LimitID - Limit ID
     * @param {string} requestData.CollateralID - Collateral ID
     * @param {string} requestData.RefNo - Reference Number
     * @param {string} requestData.OperatorID - Operator ID
     * @param {string} requestData.Direction - Direction (1 for next, 0 for previous)
     * @returns {Promise} API response
     */
    getLimitCollaterals(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetLimitCollaterals", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new limit collateral
     * @param {Object} requestData - Limit collateral data
     * @returns {Promise} API response
     */
    createLimitCollateral(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateLimitCollateral", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update an existing limit collateral
     * @param {Object} requestData - Limit collateral data
     * @returns {Promise} API response
     */
    updateLimitCollateral(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateLimitCollateral", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete a limit collateral
     * @param {Object} requestData - Request parameters
     * @returns {Promise} API response
     */
    deleteLimitCollateral(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteLimitCollateral", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get system branch settings
     * @param {Object} requestData - Request parameters (e.g., { BankID })
     * @returns {Promise} API response
     */
    getSystemBranchSettings(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.pc_SystemBranchSettings", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get both system branch settings and client limit in one call
     * @param {Object} params - { branchSettings: { BankID }, clientLimit: { OurBranchID, LimitID, RefNo, ClientID, OperatorID, Direction } }
     * @returns {Promise<{ branchSettings: any, clientLimit: any }>}
     */
    async getBranchSettingsAndClientLimit(params) {
      const [branchSettings, clientLimit] = await Promise.all([
        this.getSystemBranchSettings(params.branchSettings),
        this.getLimitClients(params.clientLimit)
      ]);
      return { branchSettings, clientLimit };
    },

    /**
     * Get limit client details (product-wise limits)
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.LimitID - Limit ID
     * @param {string} requestData.ClientID - Client ID
     * @param {string} requestData.OperatorID - Operator ID
     * @returns {Promise} API response - Returns array of product limits
     */
    getLimitClientDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetLimitClientDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get next available Limit ID (auto-generate)
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.OperatorID - Operator ID
     * @returns {Promise} API response - Returns the next available Limit ID
     */
    getNextLimitId(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetNextLimitID", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update limit client details (product-wise limits) using JSON array
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.ClientID - Client ID
     * @param {string} requestData.LimitID - Limit ID
     * @param {number} requestData.RefNo - Reference Number
     * @param {string} requestData.LimitDetails - JSON string array of product limits
     * @param {string} requestData.OperatorID - Operator ID
     * @param {number} requestData.NewRecord - 0 for update, 1 for new
     * @returns {Promise} API response
     */
    updateLimitClientDetails(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddLimitClientsDetails", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.LimitsCollateralService = LimitsCollateralService;
})(window);
