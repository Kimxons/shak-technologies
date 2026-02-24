/**
 * Group Collection Service
 * Handles group collection operations
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (global.Environment?.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const GroupCollectionService = {
    /**
     * Get group/center transaction details
     * @param {Object} requestData - { OurBranchID, GroupID, OperatorID, GroupBranchID }
     * @returns {Promise<Object>} Normalized response
     */
    getGroupDetails(requestData) {
      const params = {
        OurBranchID: requestData.OurBranchID || "",
        GroupID: requestData.GroupID || "",
        OperatorID: requestData.OperatorID || "web_portal",
        GroupBranchID: requestData.GroupBranchID || requestData.OurBranchID || ""
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetTrxGroupMinDetail", params);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Save group collection transaction
     * @param {Object} requestData - All parameters for dbo.p_AddEditTrxGroup
     * @returns {Promise<Object>} Normalized response
     */
    saveGroupCollection(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditTrxGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Get all group transactions
     * @param {Object} requestData - { OurBranchID, OperatorID }
     * @returns {Promise<Object>} Normalized response
     */
    getTrxGroupList(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetTrxGroupList", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    getGroupTransaction(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetTrxGroup", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.GroupCollectionService = GroupCollectionService;
})(window);
