(function (global) {
  const CONFIG = global.CoreBankingConfig || {};
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before searchService.js.");
    return;
  }

  // All search requests must go through baseUrlCommon/api/OldAPI (no extra env keys)
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  // Configurable search timeout (default: 30 seconds)
  const SEARCH_TIMEOUT_MS = CONFIG.searchTimeoutMs || 30000;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // OldAPI samples commonly show: MM/DD/YYYY HH:mm:ss
  function formatRequestTime(date = new Date()) {
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = String(date.getFullYear());
    const hh = pad2(date.getHours());
    const mi = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  const SearchService = {
    /**
     * Generic search method for compatibility with consumers expecting SearchService.search
     * Delegates to searchClients (can be extended for other types)
     */
    async search(requestData = {}) {
      return this.searchClients(requestData);
    },
    /**
     * Perform a search using GetSystemSearchResult endpoint
     * @param {object} requestData - Search parameters (TableID, AdvFilterString, WhereStmt, etc.)
     * @param {string} appName - Optional application name override
     * @returns {Promise} Normalized response
     */
    async searchClients(requestData = {}) {
      // Match OldAPI naming used in sample requests
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetSearchResult", requestData);
      // Match sample RequestTime formatting (avoid touching CoreApi globally)
      envelope.RequestTime = formatRequestTime(new Date());

      // Add a timeout wrapper to prevent hanging (configurable, default 30s)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Search request timeout (>${SEARCH_TIMEOUT_MS}ms)`)), SEARCH_TIMEOUT_MS)
      );

      try {
        const result = await Promise.race([
          CoreApi.post(SEARCH_ENDPOINT, envelope),
          timeoutPromise
        ]);

        // Log result for debugging
        console.log('[SearchService] Response:', result);

        return result;
      } catch (error) {
        console.error('[SearchService] Request error:', error.message);
        throw error;
      }
    },

    /**
     * Perform a search for deals
     * @param {object} requestData - Search parameters
     * @returns {Promise} Normalized response
     */
    async searchDeals(requestData = {}) {
      return this.searchClients(requestData); // Reuse the same method
    },

    /**
     * Perform a search for roles
     * @param {object} requestData - Search parameters (TableID should be 'Role')
     * @returns {Promise} Normalized response
     */
    async searchRoles(requestData = {}) {
      // Ensure TableID is set to Role
      const payload = {
        TableID: 'Role',
        ...requestData
      };
      return this.searchClients(payload);
    },

    /**
     * Search for banks using p_GetBanks stored procedure
     * @param {string} bankId - The BankID to search for (empty string returns all banks)
     * @param {number} direction - Search direction (0=exact match, 1=forward/all, -1=backward)
     * @returns {Promise} Normalized response
     */
    async searchBanks(bankId = '', direction = 1) {
      const requestData = {
        BankID: bankId || '', // Empty string to get all banks
        OperatorID: Environment.OperatorID || 'CSADM',
        OurBranchID: Environment.OurBranchID || '0603',
        Direction: direction // Use 1 to get all/forward results
      };

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetBanks", requestData);
      envelope.RequestTime = formatRequestTime(new Date());

      console.log('[SearchService] Bank search request:', envelope);

      try {
        const result = await CoreApi.post(SEARCH_ENDPOINT, envelope);
        console.log('[SearchService] Bank search response:', result);
        return result;
      } catch (error) {
        console.error('[SearchService] Bank search error:', error.message);
        throw error;
      }
    },

    /**
     * Perform a search for sub groups
     * @param {object} requestData - Search parameters (TableID should be 'SubGroupID')
     * @returns {Promise} Normalized response
     */
    async searchSubGroups(requestData = {}) {
      // Ensure TableID is set to SubGroupID
      const payload = {
        TableID: 'SubGroupID',
        ModuleID: 5067,
        ...requestData
      };
      return this.searchClients(payload);
    },
    /**
     * Perform a search for account freezes
     * @param {object} requestData - Search parameters (TableID should be 'AccountFreeze')
     * @returns {Promise} Normalized response
     */
    async searchAccountFreezes(requestData = {}) {
      // Ensure TableID is set to AccountFreeze
      const payload = {
        TableID: 'AccountFreeze',
        ...requestData
      };
      return this.searchClients(payload);
    }
  };

  global.SearchService = SearchService;
})(window);