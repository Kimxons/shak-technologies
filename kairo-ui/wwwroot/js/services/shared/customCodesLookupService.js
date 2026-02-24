(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error(
      "CoreApi is not loaded. Ensure services/shared/coreApi.js is included before customCodesLookupService.js."
    );
    return;
  }

  // Base URL for OldAPI; allow a dedicated override but default to the SystemCodes URL.
  const BASE_URL = (
    Environment.baseUrlCustomCodes ||
    Environment.baseUrlSystemCodes ||
    "http://localhost:5059"
  ).replace(/\/+$/, "");

  const endpoints = {
    oldApi: `${BASE_URL}/api/OldAPI`,
  };

  const PROCEDURE = "dbo.p_v1_GetCustomDropDownCodes";
  const cache = new Map();

  const mapDetailsToOptions = (details = []) =>
    details
      .map((row) => ({
        value: row.SubCodeID,
        label: row.CodeDescription,
        order: row.DisplayOrder ?? 0,
      }))
      .sort((a, b) => a.order - b.order);

  function normalizeDetails(rowsOrWrapper) {
    if (!rowsOrWrapper) return [];
    if (Array.isArray(rowsOrWrapper)) return rowsOrWrapper;

    // Some procedures return { Details: [...] }
    if (rowsOrWrapper.Details && Array.isArray(rowsOrWrapper.Details)) {
      return rowsOrWrapper.Details;
    }

    // Single row object
    return [rowsOrWrapper];
  }

  async function getCustomCodeOptions(codeId) {
    const cacheKey = `customCode:${codeId}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const requestData = { CodeID: codeId };
    const envelope = CoreApi.makeRequestEnvelope(PROCEDURE, requestData);

    try {
      const response = await CoreApi.post(endpoints.oldApi, envelope);

      if (!response.success) {
        console.error("Custom dropdown lookup failed for", codeId, response.message);
        return [];
      }

      const rows = normalizeDetails(response.data ?? response.Details);
      const options = mapDetailsToOptions(rows);
      cache.set(cacheKey, options);
      return options;
    } catch (error) {
      console.error("Custom dropdown lookup failed for", codeId, error);
      return [];
    }
  }

  class CustomCodesLookupService {
    /**
     * Direct API call.
     * @param {object} requestData - e.g. { CodeID: "DepreciationRateID" }
     * @returns {Promise} Normalized response
     */
    getCustomDropDownCodes(requestData) {
      const envelope = CoreApi.makeRequestEnvelope(PROCEDURE, requestData);
      return CoreApi.post(endpoints.oldApi, envelope);
    }

    /**
     * Cached dropdown options in standard shape: [{ value, label, order }]
     * @param {string} codeId
     * @returns {Promise<Array<{value:string,label:string,order:number}>>}
     */
    async getCustomCodeOptions(codeId) {
      return getCustomCodeOptions(codeId);
    }

    clearCache(codeId = null) {
      if (codeId) cache.delete(`customCode:${codeId}`);
      else cache.clear();
    }
  }

  // Primary, consistently-named global
  global.customCodesLookupService = new CustomCodesLookupService();

  // Backward-compatible aliases (older mixed-case name + PascalCase)
  global.customCodesLookUPSERCH = global.customCodesLookupService;
  global.CustomCodesLookupService = global.customCodesLookupService;
})(window);
