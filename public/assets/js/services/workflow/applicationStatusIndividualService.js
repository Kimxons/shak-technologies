// Application Status Individual Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const ApplicationStatusIndividualService = {
    /**
     * Get individual application pending details
     * @param {Object} requestData - { OurBranchID, ApplicationID, OperatorID }
     * @returns {Promise<Object>} Normalized response with application details
     */
    getIndApplPendingDetail(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetIndApplPendingDetail", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.ApplicationStatusIndividualService = ApplicationStatusIndividualService;
})(window);
