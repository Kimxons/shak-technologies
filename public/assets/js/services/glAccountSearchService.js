/**
 * GL Account Search Service
 * Handles searching for GL Accounts using the search service
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before glAccountSearchService.js.");
    return;
  }

  const SYSTEM_CODES_BASE_URL = (Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");
  const SEARCH_ENDPOINT = `${SYSTEM_CODES_BASE_URL}/api/OldAPI`;

  const GLAccountSearchService = {
    /**
     * Search for GL Accounts
     * @param {object} params - Search parameters
     * @param {string} params.branchId - Branch ID (e.g., '0101')
     * @param {string} params.operatorId - Operator ID (default: 'CSADM')
     * @param {string} params.searchKey - Optional search key for filtering
     * @returns {Promise} Normalized response with GL Account list
     */
    async searchGLAccounts(params = {}) {
      const branchId = params.branchId || '0101';
      const operatorId = params.operatorId || 'CSADM';
      const searchKey = params.searchKey || null;

      const requestData = {
        WhereStmt: '',
        TableID: 'RecGLAccountID',
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: `OurBranchID='${branchId}'`,
        OperatorID: operatorId,
        ModuleID: 8624,
        OurBranchID: branchId,
        SearchKey: searchKey,
        LanguageID: 'en'
      };

      console.log('[GLAccountSearchService] Searching GL Accounts with:', requestData);

      const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);

      // Add a timeout wrapper to prevent hanging - increased to 10 seconds
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`GL Account search timeout (>10000ms)`)), 10000)
      );

      try {
        const result = await Promise.race([
          CoreApi.post(SEARCH_ENDPOINT, envelope),
          timeoutPromise
        ]);

        console.log('[GLAccountSearchService] Response:', result);

        // Transform the response to a consistent format
        if (result.success) {
          // Handle both data and Details arrays (response has both)
          let accounts = [];
          if (result.Details && Array.isArray(result.Details)) {
            accounts = result.Details;
          } else if (result.data && Array.isArray(result.data)) {
            accounts = result.data;
          } else if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
            accounts = result.data.Details;
          }

          console.log('[GLAccountSearchService] Found', accounts.length, 'GL accounts');

          // Map to GL Account format with proper field names
          const glAccounts = accounts.map(acc => ({
            AccountID: acc.AccountID || acc.GLAccountID || acc.RecGLAccountID || '',
            GLAccountID: acc.AccountID || acc.GLAccountID || acc.RecGLAccountID || '',
            AccountName: acc.GLName || acc.Description || acc.AccountName || acc.Name || acc.ShortName || 'N/A',
            GLName: acc.GLName || '',
            ShortName: acc.ShortName || acc.GLName || acc.AccountName || '',
            CurrencyID: acc.CurrencyID || '',
            GLAccountTypeID: acc.GLAccountTypeID || ''
          })).filter(acc => acc.AccountID); // Filter out empty account IDs

          console.log('[GLAccountSearchService] Mapped', glAccounts.length, 'valid GL accounts');

          return {
            ...result,
            data: glAccounts
          };
        }

        return result;
      } catch (error) {
        console.error('[GLAccountSearchService] Request error:', error.message);
        throw error;
      }
    }
  };

  global.GLAccountSearchService = GLAccountSearchService;
  console.log('✅ GLAccountSearchService loaded');
})(window);
