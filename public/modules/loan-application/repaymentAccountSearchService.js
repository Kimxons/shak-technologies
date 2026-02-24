/**
 * Repayment Account Search Service
 * Handles API calls for searching repayment accounts in Loan Application
 */

(function (global) {
    
    const RepaymentAccountSearchService = {
        /**
         * Search for repayment accounts using p_GetSearchResult with AccountID
         * @param {Object} searchCriteria - Search parameters
         * @param {string} searchCriteria.accountId - Account ID to search for
         * @param {string} searchCriteria.accountName - Account name to search for
         * @param {string} searchCriteria.accountIdOperator - Operator for Account ID (like, equals, startswith)
         * @param {string} searchCriteria.accountNameOperator - Operator for Account Name (like, equals, startswith)
         * @returns {Promise<Array>} Array of repayment account objects
         */
        async searchRepaymentAccounts(searchCriteria = {}) {
            // Get CoreApi at runtime (after it's been loaded by ServiceLoader)
            const CoreApi = global.CoreApi;
            const Environment = global.Environment || {};

            if (!CoreApi) {
                console.error("CoreApi is not loaded. Ensure ServiceLoader.loadCore() is called before using RepaymentAccountSearchService.");
                throw new Error("CoreApi not available");
            }

            const BASE_URL = (Environment.baseUrl || "http://172.16.2.31:3306").replace(/\/+$/, "");
            const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;

            // Build WhereStmt based on criteria
            let whereConditions = [];
            
            if (searchCriteria.accountId) {
                const operator = searchCriteria.accountIdOperator || 'like';
                if (operator === 'like') {
                    whereConditions.push(`AccountID LIKE '%${searchCriteria.accountId}%'`);
                } else if (operator === 'equals') {
                    whereConditions.push(`AccountID='${searchCriteria.accountId}'`);
                } else if (operator === 'startswith') {
                    whereConditions.push(`AccountID LIKE '${searchCriteria.accountId}%'`);
                }
            }
            
            if (searchCriteria.accountName) {
                const operator = searchCriteria.accountNameOperator || 'like';
                if (operator === 'like') {
                    whereConditions.push(`Name LIKE '%${searchCriteria.accountName}%'`);
                } else if (operator === 'equals') {
                    whereConditions.push(`Name='${searchCriteria.accountName}'`);
                } else if (operator === 'startswith') {
                    whereConditions.push(`Name LIKE '${searchCriteria.accountName}%'`);
                }
            }

            const whereStmt = whereConditions.join(' AND ');

            const requestData = {
                TableID: "AccountID",
                AdvFilterString: "",
                WhereStmt: whereStmt,
                PrevOrNext: "1",
                RefID: "",
                OperatorID: sessionStorage.getItem('operatorId') || "web_portal",
                ModuleID: 1000,
                OurBranchID: (sessionStorage.getItem('branchId') || branchIdFromForm() || Environment.OurBranchID || "002")
            };

            // Create envelope using CoreApi helper
            const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);

            // Add timeout wrapper
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Repayment account search timeout (>30000ms)`)), 30000)
            );

            try {
                console.log('[RepaymentAccountSearchService] Calling API with:', envelope);
                
                const result = await Promise.race([
                    CoreApi.post(SEARCH_ENDPOINT, envelope),
                    timeoutPromise
                ]);

                console.log('[RepaymentAccountSearchService] Response:', result);
                
                // Return the Details array from the response
                return result.Details || [];
            } catch (error) {
                console.error('[RepaymentAccountSearchService] Request error:', error.message);
                throw error;
            }
        }
    };

    function branchIdFromForm() {
        try {
            const branchField = document.getElementById('branchId');
            return branchField ? branchField.value.trim() : '';
        } catch (error) {
            console.warn('[RepaymentAccountSearchService] Unable to read branchId field:', error);
            return '';
        }
    }

    global.RepaymentAccountSearchService = RepaymentAccountSearchService;
})(window);
