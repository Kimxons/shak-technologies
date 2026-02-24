/**
 * Client Search Service
 * Handles API calls for searching clients in Loan Application
 */

(function (global) {
    const CoreApi = global.CoreApi;

    if (!CoreApi) {
        console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before clientSearchService.js.");
        return;
    }

    // Get Environment dynamically at call time to ensure it's loaded
    function getEnvironment() {
        return global.Environment || {};
    }

    // Get API endpoint dynamically - resolved at call time, not load time
    function getSearchEndpoint() {
        const env = getEnvironment();
        const baseUrl = (env.baseUrlSystemCodes || env.baseUrlCommon || env.baseUrlClient || "http://172.16.2.31:3306").replace(/\/+$/, "");
        return `${baseUrl}/api/OldAPI`;
    }

    function getContext() {
        const Environment = getEnvironment();
        const session = global.AuthService?.getSession?.() || {};

        const operatorFromSessionStorage =
            global.sessionStorage?.getItem?.('operatorID') ||
            global.sessionStorage?.getItem?.('operatorId') ||
            global.sessionStorage?.getItem?.('OperatorID') ||
            global.sessionStorage?.getItem?.('OperatorId') ||
            "";

        const branchFromSessionStorage =
            global.sessionStorage?.getItem?.('branchID') ||
            global.sessionStorage?.getItem?.('branchId') ||
            global.sessionStorage?.getItem?.('BranchID') ||
            global.sessionStorage?.getItem?.('BranchId') ||
            "";

        return {
            OperatorID:
                session.operatorID ||
                session.operatorId ||
                operatorFromSessionStorage ||
                "web_portal",
            OurBranchID:
                session.branchID ||
                session.branchId ||
                Environment.OurBranchID ||
                Environment.ourBranchId ||
                branchFromSessionStorage ||
                "0101"
        };
    }

    const ClientSearchService = {
        /**
         * Search for clients using p_GetSearchResult with WFClientExistID
         * @param {Object} searchCriteria - Search parameters (optional)
         * @returns {Promise} API response
         */
        async searchClients(searchCriteria = {}) {
            // Build WhereStmt based on criteria
            let whereConditions = [];

            const sanitizeSqlLiteral = (value) => String(value || "").replace(/'/g, "''");

            if (searchCriteria.clientId) {
                const operator = searchCriteria.clientIdOperator || 'like';
                const safeId = sanitizeSqlLiteral(searchCriteria.clientId);
                if (operator === 'like') whereConditions.push(`ClientID LIKE '%${safeId}%'`);
                else if (operator === 'equals') whereConditions.push(`ClientID='${safeId}'`);
            }

            if (searchCriteria.clientName) {
                const operator = searchCriteria.clientNameOperator || 'like';
                const safeName = sanitizeSqlLiteral(searchCriteria.clientName);
                // Match on common name columns; first-name searches like "james" will match "James ..." in Like mode.
                if (operator === 'like') whereConditions.push(`(Name LIKE '%${safeName}%' OR Names LIKE '%${safeName}%' OR FullName LIKE '%${safeName}%')`);
                else if (operator === 'equals') whereConditions.push(`(Name='${safeName}' OR Names='${safeName}' OR FullName='${safeName}')`);
            }

            const requestData = {
                TableID: "Client",
                AdvFilterString: "",
                WhereStmt: whereConditions.join(' AND '),
                PrevOrNext: 0,
                RefID: "",
                OperatorID: getContext().OperatorID,
                ModuleID: 0,
                OurBranchID: getContext().OurBranchID,
                SearchKey: "",
                LanguageID: "ENG"
            };

            // Create envelope using CoreApi helper
            const envelope = CoreApi.makeRequestEnvelope("p_GetSearchResult", requestData);

            // Add timeout wrapper
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Client search timeout (>30000ms)`)), 30000)
            );

            try {
                // Get endpoint dynamically at call time
                const endpoint = getSearchEndpoint();
                console.log('[ClientSearchService] Calling API endpoint:', endpoint);
                console.log('[ClientSearchService] Request envelope:', envelope);

                const result = await Promise.race([
                    CoreApi.post(endpoint, envelope),
                    timeoutPromise
                ]);

                console.log('[ClientSearchService] Full response:', result);
                console.log('[ClientSearchService] Response.Details:', result.Details);
                console.log('[ClientSearchService] Response.data:', result.data);
                console.log('[ClientSearchService] Response.data keys:', Object.keys(result.data || {}));
                console.log('[ClientSearchService] Response.Details01:', result.Details01);
                
                // Check if data is an array or object with Details property
                let details = [];
                if (Array.isArray(result.Details) && result.Details.length > 0) {
                    details = result.Details;
                } else if (Array.isArray(result.data)) {
                    details = result.data;
                } else if (result.data && typeof result.data === 'object') {
                    // If data is an object, check for Details, Details01, or other arrays
                    details = result.data.Details || result.data.Details01 || result.data.data || [];
                }
                
                console.log('[ClientSearchService] Using details array:', details);
                
                return details;
            } catch (error) {
                console.error('[ClientSearchService] Request error:', error.message);
                throw error;
            }
        }
    };

    global.ClientSearchService = ClientSearchService;
})(window);
