/**
 * Sales Officer Search Service
 * Fetches sales officer data using AccountID table (p_GetSearchResult)
 */

(function (global) {
    const SalesOfficerSearchService = {
        /**
         * Search sales officers
         * @param {Object} searchCriteria
         * @param {string} [searchCriteria.officerId]
         * @param {string} [searchCriteria.officerName]
         * @param {string} [searchCriteria.officerIdOperator]
         * @param {string} [searchCriteria.officerNameOperator]
         * @param {string} [searchCriteria.branchId]
         * @returns {Promise<Array>}
         */
        async searchSalesOfficers(searchCriteria = {}) {
            const CoreApi = global.CoreApi;
            const Environment = global.Environment || {};

            if (!CoreApi) {
                console.error('[SalesOfficerSearchService] CoreApi not available. Make sure ServiceLoader.loadCore() ran before invoking sales officer search.');
                throw new Error('CoreApi not available');
            }

            const BASE_URL = (Environment.baseUrl || 'http://172.16.2.31:3306').replace(/\/+$/, '');
            const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;

            const whereConditions = [];

            if (searchCriteria.officerId) {
                const operator = (searchCriteria.officerIdOperator || 'like').toLowerCase();
                if (operator === 'equals') {
                    whereConditions.push(`AccountID='${searchCriteria.officerId}'`);
                } else if (operator === 'startswith') {
                    whereConditions.push(`AccountID LIKE '${searchCriteria.officerId}%'`);
                } else {
                    whereConditions.push(`AccountID LIKE '%${searchCriteria.officerId}%'`);
                }
            }

            if (searchCriteria.officerName) {
                const operator = (searchCriteria.officerNameOperator || 'like').toLowerCase();
                if (operator === 'equals') {
                    whereConditions.push(`Name='${searchCriteria.officerName}'`);
                } else if (operator === 'startswith') {
                    whereConditions.push(`Name LIKE '${searchCriteria.officerName}%'`);
                } else {
                    whereConditions.push(`Name LIKE '%${searchCriteria.officerName}%'`);
                }
            }

            const whereStmt = whereConditions.join(' AND ');

            const requestData = {
                TableID: 'AccountID',
                AdvFilterString: '',
                WhereStmt: whereStmt,
                PrevOrNext: '1',
                RefID: '',
                OperatorID: sessionStorage.getItem('operatorId') || 'web_portal',
                ModuleID: 1000,
                OurBranchID: searchCriteria.branchId || sessionStorage.getItem('branchId') || Environment.OurBranchID || '002'
            };

            const envelope = CoreApi.makeRequestEnvelope('p_GetSearchResult', requestData);

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Sales officer search timeout (>30000ms)')), 30000)
            );

            try {
                const result = await Promise.race([
                    CoreApi.post(SEARCH_ENDPOINT, envelope),
                    timeoutPromise
                ]);

                return result.Details || [];
            } catch (error) {
                console.error('[SalesOfficerSearchService] Request error:', error.message);
                throw error;
            }
        }
    };

    global.SalesOfficerSearchService = SalesOfficerSearchService;
})(window);
