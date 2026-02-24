/**
 * Product Search Service
 * Handles API calls for searching products
 */

const ProductSearchService = (function() {
    
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
     * Search products using the backend API
     * @param {Object} criteria - Search criteria
     * @returns {Promise<Array>} Array of product objects
     */
    async function searchProducts(criteria) {
        try {
            console.log('Searching products with criteria:', criteria);

            // Get user session data
            const userBranchID = sessionStorage.getItem('userBranchID') || '0603';
            const operatorID = sessionStorage.getItem('operatorID') || 'web_portal';

            // Build WhereStmt
            let whereConditions = [];
            if (criteria.productId) {
                 whereConditions.push(`ProductID LIKE '%${criteria.productId}%'`);
            }
            if (criteria.productName) {
                 whereConditions.push(`ProductName LIKE '%${criteria.productName}%'`);
            }
            if (criteria.exactProductId) {
                 // Use exact match
                 whereConditions.push(`ProductID='${criteria.exactProductId}'`);
            }

            // Build request data matching the exact API structure
            // Relax filter to ensure we find the product regardless of branch context
            // Just use ProductTypeID='LN' to ensure it's a loan product
            const requestData = {
                TableID: 'WFAdvProductID',
                AdvFilterString: `ProductTypeID='LN'`, 
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

            console.log('Product search request envelope:', requestEnvelope);

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

            console.log('Product search API response:', response);

            // Extract results from response
            if (response && response.Details) {
                return response.Details;
            }

            return [];

        } catch (error) {
            console.error('Error in searchProducts:', error);
            throw error;
        }
    }

    /**
     * Get product details using p_GetWFProductDetails stored procedure
     * @param {Object} params - Parameters for the query
     * @param {string} params.branchId - OurBranchID
     * @param {string} params.productId - ProductID
     * @param {string} [params.wfAdvTypeId] - WFAdvTypeID (optional)
     * @returns {Promise<Object>} Product details object
     */
    async function getProductDetails(params) {
        try {
            console.log('Getting product details with params:', params);

            // Get user session data
            const userBranchID = params.branchId || sessionStorage.getItem('userBranchID') || '0603';
            const operatorID = sessionStorage.getItem('operatorID') || 'web_portal';
            const productId = params.productId || '';
            const wfAdvTypeId = params.wfAdvTypeId || '';

            // Build request data for p_GetWFProductDetails
            const requestData = {
                OurBranchID: userBranchID,
                WFAdvTypeID: wfAdvTypeId,
                ProductID: productId,
                OperatorID: operatorID
            };

            console.log('Product details request data:', requestData);

            // Use CoreApi.makeRequestEnvelope if available (consistent with other services)
            const endpoint = resolveOldApiEndpoint();
            console.log('Using endpoint:', endpoint);
            
            let response;
            if (window.CoreApi && window.CoreApi.makeRequestEnvelope) {
                // Use CoreApi pattern like LoanApplicationService
                const envelope = window.CoreApi.makeRequestEnvelope("dbo.p_GetWFProductDetails", requestData);
                console.log('Product details request envelope:', envelope);
                response = await window.CoreApi.post(endpoint, envelope);
            } else {
                // Fallback to manual envelope creation with dbo. prefix
                const requestEnvelope = {
                    RequestID: 'dbo.p_GetWFProductDetails',
                    FormID: 'dbo.p_GetWFProductDetails',
                    RequestData: requestData,
                    RequestTime: new Date().toISOString(),
                    AppName: 'PROJECT_KAIRO',
                    Checksum: ''
                };
                console.log('Product details request envelope (fallback):', requestEnvelope);
                
                const fetchResponse = await Promise.race([
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
                response = fetchResponse;
            }

            console.log('Product details API response:', response);

            // Extract product details from response
            // The stored procedure returns two result sets:
            // 1. Product info (Description, CurrencyID, LoanPeriodID, etc.) in Details
            // 2. Rate slabs (AmountSlabFrom, AmountSlabTo, TermFrom, TermTo, CommissionRate, TaxRate, EffectiveRate) in Details01
            if (response) {
                // CoreApi normalizes response, so Details01 might be in response.data
                const productInfo = response.Details && response.Details.length > 0 
                    ? response.Details[0] 
                    : (response.data && response.data.Details && response.data.Details.length > 0 
                        ? response.data.Details[0] 
                        : null);
                
                // Check for rate slabs in multiple possible locations after CoreApi normalization
                let rateSlabs = [];
                
                // Try direct access first
                if (response.Details01 && response.Details01.length > 0) {
                    rateSlabs = response.Details01;
                } 
                // Try response.data.Details01 (CoreApi normalized)
                else if (response.data && response.data.Details01 && response.data.Details01.length > 0) {
                    rateSlabs = response.data.Details01;
                }
                // Try Details1 (alternate naming)
                else if (response.Details1 && response.Details1.length > 0) {
                    rateSlabs = response.Details1;
                }
                // Try response.data.Details1
                else if (response.data && response.data.Details1 && response.data.Details1.length > 0) {
                    rateSlabs = response.data.Details1;
                }
                
                console.log('✅ Extracted productInfo:', productInfo);
                console.log('✅ Extracted rateSlabs:', rateSlabs);
                console.log('✅ Rate slab count:', rateSlabs.length);
                
                // Debug: Show what's in the first rate slab
                if (rateSlabs.length > 0) {
                    console.log('📊 First Rate Slab Details:', {
                        CommissionRate: rateSlabs[0].CommissionRate,
                        TaxRate: rateSlabs[0].TaxRate,
                        EffectiveRate: rateSlabs[0].EffectiveRate,
                        ProductEffectiveRate: rateSlabs[0].ProductEffectiveRate,
                        MarkingRate: rateSlabs[0].MarkingRate,
                        AllFields: rateSlabs[0]
                    });
                    
                    // Log all field names
                    console.log('📋 All Field Names in Rate Slab:');
                    Object.keys(rateSlabs[0]).forEach(key => {
                        console.log(`   ${key}: ${rateSlabs[0][key]}`);
                    });
                } else {
                    console.warn('⚠️ No rate slabs found! Checking all possible locations...');
                    console.log('response.Details01:', response.Details01);
                    console.log('response.data?.Details01:', response.data?.Details01);
                    console.log('Full response object:', response);
                }
                
                return {
                    productInfo: productInfo,
                    rateSlabs: rateSlabs,
                    rawResponse: response
                };
            }

            return null;

        } catch (error) {
            console.error('Error in getProductDetails:', error);
            throw error;
        }
    }

    /**
     * Get product rate variance details using p_GetWFProductDetails_v2 stored procedure
     * @param {Object} params - Parameters for the query
     * @param {string} params.branchId - OurBranchID
     * @param {string} params.productId - ProductID
     * @param {string} [params.wfAdvTypeId] - WFAdvTypeID (optional)
     * @returns {Promise<Object>} Product rate variance details
     */
    async function getProductRateVariance(params) {
        try {
            console.log('Getting product rate variance with params:', params);

            // Get user session data
            const userBranchID = params.branchId || sessionStorage.getItem('userBranchID') || '0603';
            const operatorID = sessionStorage.getItem('operatorID') || 'web_portal';
            const productId = params.productId || '';
            const wfAdvTypeId = params.wfAdvTypeId || '';

            // Build request data for p_GetWFProductDetails_v2
            const requestData = {
                OurBranchID: userBranchID,
                WFAdvTypeID: wfAdvTypeId,
                ProductID: productId,
                OperatorID: operatorID
            };

            console.log('Product rate variance request data:', requestData);

            const endpoint = resolveOldApiEndpoint();
            console.log('Using endpoint:', endpoint);
            
            let response;
            if (window.CoreApi && window.CoreApi.makeRequestEnvelope) {
                const envelope = window.CoreApi.makeRequestEnvelope("p_GetWFProductDetails_v2", requestData);
                console.log('Product rate variance request envelope:', envelope);
                response = await window.CoreApi.post(endpoint, envelope);
            } else {
                const requestEnvelope = {
                    RequestID: 'p_GetWFProductDetails_v2',
                    FormID: 'p_GetWFProductDetails_v2',
                    RequestData: requestData,
                    RequestTime: new Date().toISOString(),
                    AppName: 'PROJECT_KAIRO',
                    Checksum: ''
                };
                console.log('Product rate variance request envelope (fallback):', requestEnvelope);
                
                const fetchResponse = await Promise.race([
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
                response = fetchResponse;
            }

            console.log('Product rate variance API response:', response);

            // Extract rate variance details from response
            if (response) {
                // Check for rate variance in Details01
                let rateVariance = [];
                
                if (response.Details01 && response.Details01.length > 0) {
                    rateVariance = response.Details01;
                } else if (response.data && response.data.Details01 && response.data.Details01.length > 0) {
                    rateVariance = response.data.Details01;
                } else if (response.Details && response.Details.length > 0) {
                    rateVariance = response.Details;
                }
                
                console.log('✅ Extracted rate variance slabs:', rateVariance);
                console.log('✅ Rate variance count:', rateVariance.length);
                
                if (rateVariance.length > 0) {
                    console.log('📊 First Rate Variance Details:', rateVariance[0]);
                    console.log('📋 Rate Variance Field Names:');
                    Object.keys(rateVariance[0]).forEach(key => {
                        console.log(`   ${key}: ${rateVariance[0][key]}`);
                    });
                }
                
                return {
                    rateVariance: rateVariance,
                    rawResponse: response
                };
            }

            return null;

        } catch (error) {
            console.error('Error in getProductRateVariance:', error);
            throw error;
        }
    }

    // Public API
    return {
        searchProducts,
        getProductDetails,
        getProductRateVariance
    };
})();

// Expose to window for global access
window.ProductSearchService = ProductSearchService;
