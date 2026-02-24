/**
 * Group Search Service
 * Handles API calls for searching groups
 */

const GroupSearchService = (function() {
    
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
     * Search groups using the backend API
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array>} Array of group objects
     */
    async function searchGroups(criteria) {
        try {
            console.log('Searching groups with criteria:', criteria);

            // Get user session data
            const userBranchID = sessionStorage.getItem('userBranchID') || '0603';
            const operatorID = sessionStorage.getItem('operatorID') || 'web_portal';

            // Build WhereStmt
            let whereConditions = [];
            if (criteria.groupId) {
                 whereConditions.push(`SubGroupID LIKE '%${criteria.groupId}%'`);
            }
            if (criteria.groupName) {
                 whereConditions.push(`SubGroupName LIKE '%${criteria.groupName}%'`);
            }
            if (criteria.exactGroupId) {
                 whereConditions.push(`SubGroupID='${criteria.exactGroupId}'`);
            }

            // Build request data matching the exact API structure
            const requestData = {
                TableID: 'SubGroupID',
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

            console.log('Group search request envelope:', requestEnvelope);

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

            console.log('Group search API response:', response);

            // Extract results from response
            if (response && response.Details) {
                return response.Details.map(item => ({
                    ...item,
                    GroupID: item.SubGroupID,
                    GroupName: item.SubGroupName,
                    groupId: item.SubGroupID,
                    groupName: item.SubGroupName
                }));
            }

            return [];

        } catch (error) {
            console.error('Error in searchGroups:', error);
            throw error;
        }
    }

    // Public API
    return {
        searchGroups
    };
})();
