// Unsupervised Data View Service
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const UnsupervisedDataViewService = {
    /**
     * Get supervision data for a specific user/operator
     * @param {Object} requestData - { OurBranchID, OperatorID }
     * @returns {Promise<Object>} Normalized response with supervision data
     */
    getSupervisionDataPerUser(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSupervisionDataPerUser", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Reject/delete a supervision data record
     * @param {Object} requestData - { EventID, OurBranchID, OperatorID, etc. }
     * @returns {Promise<Object>} Normalized response
     */
    rejectSupervisionData(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_RejectSupervisionData", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.UnsupervisedDataViewService = UnsupervisedDataViewService;
})(window);
