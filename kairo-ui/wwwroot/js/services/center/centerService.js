/**
 * Center Service
 * Handles center-related operations
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (global.Environment?.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const CenterService = {
    /**
     * Search centers
     * @param {Object} searchParams - Search parameters
     * @returns {Promise<Object>} Normalized response
     */
    searchCenters(searchParams) {
      const defaultParams = {
        TableID: "GroupID",
        AdvFilterString: searchParams.AdvFilterString || "",
        WhereStmt: searchParams.WhereStmt || "",
        PrevOrNext: searchParams.PrevOrNext || "1",
        RefID: searchParams.RefID || "",
        OperatorID: searchParams.OperatorID || "web_portal",
        ModuleID: searchParams.ModuleID || 1000,
        OurBranchID: searchParams.OurBranchID || "002"
      };

      const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", defaultParams);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.CenterService = CenterService;
})(window);
