/**
 * Application Search Service
 * Handles API calls for searching loan applications
 */

(function (global) {
    const CoreApi = global.CoreApi;
    const Environment = global.Environment || {};

    if (!CoreApi) {
        console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before applicationSearchService.js.");
        return;
    }

    const BASE_URL = (Environment.baseUrl || "http://172.16.2.31:3306").replace(/\/+$/, "");
    const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;

    const ApplicationSearchService = {
        /**
         * Search for loan applications using p_GetSearchResult
         * @param {Object} searchCriteria - Search parameters (optional, can be empty to get all)
         * @param {string} branchId - Optional branch ID for filtering
         * @returns {Promise} API response
         */
        async searchApplications(searchCriteria = {}, branchId = null) {
            // Build filter string based on search criteria
            let advFilterString = "";
            const filters = [];

            // Application ID filter
            if (searchCriteria.applicationId && searchCriteria.applicationId.value) {
                const val = searchCriteria.applicationId.value;
                const op = searchCriteria.applicationId.operator || 'like';
                if (op === 'equals') {
                    filters.push(`ApplicationID = '${val}'`);
                } else if (op === 'starts') {
                    filters.push(`ApplicationID LIKE '${val}%'`);
                } else {
                    filters.push(`ApplicationID LIKE '%${val}%'`);
                }
            }

            // Client ID filter
            if (searchCriteria.clientId && searchCriteria.clientId.value) {
                const val = searchCriteria.clientId.value;
                const op = searchCriteria.clientId.operator || 'like';
                if (op === 'equals') {
                    filters.push(`ClientID = '${val}'`);
                } else if (op === 'starts') {
                    filters.push(`ClientID LIKE '${val}%'`);
                } else {
                    filters.push(`ClientID LIKE '%${val}%'`);
                }
            }

            // Name filter
            if (searchCriteria.name && searchCriteria.name.value) {
                const val = searchCriteria.name.value;
                const op = searchCriteria.name.operator || 'like';
                if (op === 'equals') {
                    filters.push(`ClientName = '${val}'`);
                } else if (op === 'starts') {
                    filters.push(`ClientName LIKE '${val}%'`);
                } else {
                    filters.push(`ClientName LIKE '%${val}%'`);
                }
            }

            // ID Number filter
            if (searchCriteria.idNumber && searchCriteria.idNumber.value) {
                const val = searchCriteria.idNumber.value;
                const op = searchCriteria.idNumber.operator || 'like';
                if (op === 'equals') {
                    filters.push(`IDNumber = '${val}'`);
                } else if (op === 'starts') {
                    filters.push(`IDNumber LIKE '${val}%'`);
                } else {
                    filters.push(`IDNumber LIKE '%${val}%'`);
                }
            }

            // Determine the branch ID to use
            const effectiveBranchId = branchId || sessionStorage.getItem('branchId') || Environment.OurBranchID || "0101";

            // Add OurBranchID filter to ensure we only get applications for the specified branch
            if (effectiveBranchId) {
                filters.push(`OurBranchID = '${effectiveBranchId}'`);
            }

            // Combine filters with AND
            if (filters.length > 0) {
                advFilterString = filters.join(' AND ');
            }

            const requestData = {
                TableID: "WFLoanIndvAppID",
                AdvFilterString: advFilterString,
                WhereStmt: "",
                PrevOrNext: "1",
                RefID: "",
                OperatorID: sessionStorage.getItem('operatorId') || "web_portal",
                ModuleID: 7035,
                OurBranchID: effectiveBranchId
            };

            console.log('[ApplicationSearchService] Search criteria:', searchCriteria);
            console.log('[ApplicationSearchService] Filter string:', advFilterString);

            // Create envelope using CoreApi helper
            const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);

            // Add timeout wrapper
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Application search timeout (>30000ms)`)), 30000)
            );

            try {
                console.log('[ApplicationSearchService] Calling API with:', envelope);
                
                const result = await Promise.race([
                    CoreApi.post(SEARCH_ENDPOINT, envelope),
                    timeoutPromise
                ]);

                console.log('[ApplicationSearchService] Response:', result);
                return result;
            } catch (error) {
                console.error('[ApplicationSearchService] Request error:', error.message);
                throw error;
            }
        }
    };

    global.ApplicationSearchService = ApplicationSearchService;
})(window);
