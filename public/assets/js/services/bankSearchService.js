/**
 * Bank Search Service
 * Handles searching for Banks using the p_GetBanks stored procedure
 */
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before bankSearchService.js.");
    return;
  }

  const BASE_URL = (Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
  const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  // Format request time as MM/DD/YYYY HH:mm:ss
  function formatRequestTime(date = new Date()) {
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = String(date.getFullYear());
    const hh = pad2(date.getHours());
    const mi = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
  }

  const BankSearchService = {
    /**
     * Search for Banks
     * @param {object} params - Search parameters
     * @param {string} params.bankId - Bank ID to search for (empty string returns all banks)
     * @param {string} params.operatorId - Operator ID (default: 'CSADM')
     * @param {string} params.ourBranchId - Branch ID (default: '0603')
     * @param {number} params.direction - Search direction (0=exact, 1=forward/all, -1=backward)
     * @returns {Promise} Normalized response with Bank list
     */
    async searchBanks(params = {}) {
      const bankId = params.bankId || '';
      const operatorId = params.operatorId || Environment.OperatorID || 'CSADM';
      const ourBranchId = params.ourBranchId || Environment.OurBranchID || '0603';
      const direction = params.direction !== undefined ? params.direction : 1; // Default to 1 for all banks

      const requestData = {
        BankID: bankId,
        OperatorID: operatorId,
        OurBranchID: ourBranchId,
        Direction: direction
      };

      console.log('[BankSearchService] Searching Banks with:', requestData);

      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetBanks", requestData);
      envelope.RequestTime = formatRequestTime(new Date());

      // Add a timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Bank search timeout (>30000ms)`)), 30000)
      );

      try {
        const result = await Promise.race([
          CoreApi.post(SEARCH_ENDPOINT, envelope),
          timeoutPromise
        ]);

        console.log('[BankSearchService] Response:', result);

        // Transform the response to a consistent format
        if (result.success) {
          // Handle multiple possible response formats
          let banks = [];
          
          if (result.data && result.data.Details01 && Array.isArray(result.data.Details01)) {
            banks = result.data.Details01;
          } else if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
            banks = result.data.Details;
          } else if (result.Details01 && Array.isArray(result.Details01)) {
            banks = result.Details01;
          } else if (result.Details && Array.isArray(result.Details)) {
            banks = result.Details;
          } else if (result.data && Array.isArray(result.data)) {
            banks = result.data;
          }
          
          console.log('[BankSearchService] Found', banks.length, 'banks');
          if (banks.length > 0) {
            console.log('[BankSearchService] First bank:', banks[0]);
          }
          
          // Return the full bank data (all fields from the response)
          return {
            ...result,
            data: banks
          };
        }

        return result;
      } catch (error) {
        console.error('[BankSearchService] Request error:', error.message);
        throw error;
      }
    }
  };

  global.BankSearchService = BankSearchService;
  console.log('✅ BankSearchService loaded');
})(window);
