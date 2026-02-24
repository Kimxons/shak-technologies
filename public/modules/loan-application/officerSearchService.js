/**
 * Officer Search Service
 * Handles API calls for searching officers in Loan Application
 */

(function (global) {
    
    const OfficerSearchService = {
        /**
         * Search for officers using p_GetSearchResult with ActiveOfficerID
         * @param {Object} searchCriteria - Search parameters
         * @returns {Promise<Array>} Array of officer objects
         */
        async searchOfficers(searchCriteria = {}) {
            // Get CoreApi at runtime
            const CoreApi = global.CoreApi;
            const Environment = global.Environment || {};

            if (!CoreApi) {
                console.error("CoreApi is not loaded. Ensure ServiceLoader.loadCore() is called.");
                throw new Error("CoreApi not available");
            }

            const BASE_URL = (Environment.baseUrl || "http://172.16.2.31:3306").replace(/\/+$/, "");
            const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;

            // Build WhereStmt
            let whereConditions = [];
            
            if (searchCriteria.officerId) {
                const operator = searchCriteria.officerIdOperator || 'like';
                if (operator === 'like') {
                    whereConditions.push(`OfficerID LIKE '%${searchCriteria.officerId}%'`);
                } else if (operator === 'equals') {
                    whereConditions.push(`OfficerID='${searchCriteria.officerId}'`);
                } else if (operator === 'startswith') {
                    whereConditions.push(`OfficerID LIKE '${searchCriteria.officerId}%'`);
                }
            }
            
            if (searchCriteria.officerName) {
                const operator = searchCriteria.officerNameOperator || 'like';
                if (operator === 'like') {
                    whereConditions.push(`Name LIKE '%${searchCriteria.officerName}%'`);
                } else if (operator === 'equals') {
                    whereConditions.push(`Name='${searchCriteria.officerName}'`);
                } else if (operator === 'startswith') {
                    whereConditions.push(`Name LIKE '${searchCriteria.officerName}%'`);
                }
            }

            const whereStmt = whereConditions.join(' AND ');

            // Construct AdvFilterString
            const advFilterString = "BankID='00' AND OfficerTypeID='CO'";
            
            // Get branch ID from search criteria or session
            const branchId = ""; // OfficerID search requires empty branch ID

            const requestData = {
                TableID: "OfficerID",
                AdvFilterString: advFilterString,
                WhereStmt: whereStmt,
                PrevOrNext: "1",
                RefID: "",
                OperatorID: sessionStorage.getItem('operatorID') || "web_portal",
                ModuleID: 1000,
                OurBranchID: branchId
            };

            const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);

            try {
                const result = await CoreApi.post(SEARCH_ENDPOINT, envelope);
                return result.Details || [];
            } catch (error) {
                console.error('[OfficerSearchService] Request error:', error.message);
                throw error;
            }
        }
    };

    global.OfficerSearchService = OfficerSearchService;
})(window);
