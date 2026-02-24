/**
 * Branch Service
 * Handles branch-related operations
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (global.Environment?.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const BranchService = {
    /**
     * Search system branches
     * @param {Object} requestData - { BankID: "BankID" }
     * @returns {Promise<Object>} Normalized response
     */
    searchBranches(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.pc_SearchSystemBranches", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.BranchService = BranchService;
})(window);
