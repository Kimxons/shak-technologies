/**
 * Batch Search Service
 * Handles searching for Batch Numbers using the search service
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before batchSearchService.js.");
    return;
  }

  const SYSTEM_CODES_BASE_URL = (Environment.baseUrlSystemCodes || "http://localhost:5059").replace(/\/+$/, "");
  const SEARCH_ENDPOINT = `${SYSTEM_CODES_BASE_URL}/api/OldAPI`;

  const BatchSearchService = {
    /**
     * Search for Batch Numbers
     * @param {object} params - Search parameters
     * @param {string} params.branchId - Branch ID (e.g., '0101')
     * @param {string} params.accountId - GL Account ID (e.g., '10132013')
     * @param {string} params.operatorId - Operator ID (default: 'CSADM')
     * @param {string} params.searchKey - Optional search key for filtering
     * @returns {Promise} Normalized response with Batch list
     */
    async searchBatches(params = {}) {
      const branchId = params.branchId || '0101';
      const accountId = params.accountId || '';
      const operatorId = params.operatorId || 'CSADM';
      const searchKey = params.searchKey || null;

      // Build AdvFilterString with both branch and account filters
      let advFilterString = `OurBranchID ='${branchId}'`;
      if (accountId) {
        advFilterString += ` AND AccountID ='${accountId}'`;
      }

      const requestData = {
        WhereStmt: '',
        TableID: 'BatchNo',
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: advFilterString,
        OperatorID: operatorId,
        ModuleID: 8624,
        OurBranchID: branchId,
        SearchKey: searchKey,
        LanguageID: 'en'
      };

      console.log('[BatchSearchService] Searching Batches with:', requestData);

      const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);

      // Add a timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Batch search timeout (>5000ms)`)), 5000)
      );

      try {
        const result = await Promise.race([
          CoreApi.post(SEARCH_ENDPOINT, envelope),
          timeoutPromise
        ]);

        console.log('[BatchSearchService] Response:', result);

        // Transform the response to a consistent format
        if (result.success) {
          // Handle both data and Details arrays (response has both)
          let batches = [];
          
          // Try Details first (server returns both data and Details with same content)
          if (result.Details && Array.isArray(result.Details)) {
            batches = result.Details;
          } else if (result.data && Array.isArray(result.data)) {
            batches = result.data;
          } else if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
            batches = result.data.Details;
          }
          
          console.log('[BatchSearchService] Found', batches.length, 'batches');
          console.log('[BatchSearchService] First batch:', batches[0]);
          
          // Map to Batch format with proper field names from actual response
          // Response fields: BatchNo (number), StatementFromDate, StatementToDate, AccountID, GLName
          const batchList = batches.map(batch => ({
            BatchNo: String(batch.BatchNo || batch.BatchNumber || batch.BatchID || ''),
            BatchNumber: String(batch.BatchNo || batch.BatchNumber || batch.BatchID || ''),
            Description: batch.GLName || batch.Description || batch.Narration || 'N/A',
            BatchDate: batch.StatementFromDate || batch.BatchDate || batch.Date || '',
            StatementFromDate: batch.StatementFromDate || '',
            StatementToDate: batch.StatementToDate || '',
            AccountID: batch.AccountID || '',
            GLName: batch.GLName || '',
            OurBranchID: batch.OurBranchID || branchId
          })).filter(batch => batch.BatchNo && batch.BatchNo !== ''); // Filter out empty batch numbers

          console.log('[BatchSearchService] Mapped', batchList.length, 'valid batches');
          console.log('[BatchSearchService] First mapped batch:', batchList[0]);

          return {
            ...result,
            data: batchList
          };
        }

        return result;
      } catch (error) {
        console.error('[BatchSearchService] Request error:', error.message);
        throw error;
      }
    }
  };

  global.BatchSearchService = BatchSearchService;
  console.log('✅ BatchSearchService loaded');
})(window);
