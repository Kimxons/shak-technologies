/**
 * Center Search Service
 * Handles API calls for searching centers
 * Note: Uses TableID "GroupID" as per the backend API structure
 */

const CenterSearchService = (function() {
    
    const resolveOldApiEndpoint = () => {
        try {
            const Environment = window.Environment || {};
            if (Environment.useLocalOldApiProxy === true) return '/api/OldAPI';
            const base = (Environment.baseUrlCommon || "").toString().replace(/\/+$/, "");
            return base ? `${base}/api/OldAPI` : '/api/OldAPI';
        } catch {
            return '/api/OldAPI';
        }
    };

    /**
     * Search centers using the backend API
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array>} Array of center objects
     */
    async function searchCenters(criteria) {
        try {
            console.log('Searching centers with criteria:', criteria);

            // Get user session data
            const userBranchID = sessionStorage.getItem('userBranchID') || '0603';
            const operatorID = sessionStorage.getItem('operatorID') || 'web_portal';

            // Build WhereStmt
            let whereConditions = [];
            if (criteria.centerId) {
                 whereConditions.push(`GroupID LIKE '%${criteria.centerId}%'`);
            }
            if (criteria.centerName) {
                 whereConditions.push(`GroupName LIKE '%${criteria.centerName}%'`);
            }
            if (criteria.exactCenterId) {
                 whereConditions.push(`GroupID='${criteria.exactCenterId}'`);
            }

            // Build request data matching the exact API structure
            // Uses TableID "GroupID" as per the backend requirement
            const requestData = {
                TableID: 'GroupID',
                AdvFilterString: '',
                WhereStmt: whereConditions.join(' AND '),
                PrevOrNext: '1',
                RefID: '',
                OperatorID: operatorID,
                ModuleID: 7035,
                OurBranchID: userBranchID
            };

            // Create request envelope
            const requestEnvelope = {
                RequestID: 'p_GetSearchResult',
                FormID: 'p_GetSearchResult',
                RequestData: requestData,
                RequestTime: new Date().toISOString(),
                AppName: 'CLIENT_DATA',
                Checksum: ''
            };

            console.log('Center search request envelope:', requestEnvelope);

            // Call the API using CoreApi
            const endpoint = resolveOldApiEndpoint();
            console.log('Using endpoint:', endpoint);
            
            const response = await Promise.race([
                window.CoreApi ? 
                    window.CoreApi.post(endpoint, requestEnvelope) :
                    fetch(endpoint, {
                        method: 'POST',
                        headers: {
                            'accept': '*/*',
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(requestEnvelope)
                    }).then(res => res.json()),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timeout')), 30000)
                )
            ]);

            console.log('Center search API response:', response);

            // Extract results from response and map GroupID/GroupName to CenterID/CenterName
            if (response && response.Details) {
                return response.Details.map(item => ({
                    CenterID: item.GroupID,
                    CenterName: item.GroupName
                }));
            }

            return [];

        } catch (error) {
            console.error('Error in searchCenters:', error);
            throw error;
        }
    }

    // Public API
    return {
        searchCenters
    };
})();
