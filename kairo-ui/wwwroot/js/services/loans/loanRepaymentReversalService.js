/**
 * Loan Repayment Reversal Service
 * Module ID: 3117
 * Handles all API calls for Loan Repayment Reversal functionality
 * 
 * Stored Procedures:
 *   - p_GetRepayReversalDetail (GET): Fetches repayment transactions to reverse
 *   - p_AddLoanRepayReversalTrx (SAVE): Reverses selected transactions
 *   - p_GetSearchResult: For branch/client/account lookups and date dropdowns
 */

(function (global) {
  'use strict';

  const SERVICE_NAME = 'LoanRepaymentReversalService';
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;
  const MODULE_ID = '3117';

  console.log(`[${SERVICE_NAME}] Initializing service with endpoint:`, ENDPOINT);

  /**
   * Helper: Escape XML special characters
   */
  function escapeXml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Get operator ID from session
   */
  function getOperatorId() {
    if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      const session = AuthService.getSession();
      return session?.OperatorID || session?.operatorID || 'web_portal';
    }
    return 'web_portal';
  }

  /**
   * Get Repayment Reversal Details
   * Calls: exec p_GetRepayReversalDetail @OurBranchID, @AccountID, @FromDate, @ToDate, @OperatorID
   * Returns: Details (metadata), Details01 (transaction list), Details02 (Behind The Scene data)
   * 
   * @param {Object} params - { OurBranchID, AccountID, FromDate, ToDate, OperatorID }
   * @returns {Promise<Object>} Response with transaction data
   */
  async function getRepaymentReversalDetails(params) {
    try {
      console.log(`[${SERVICE_NAME}] Getting repayment reversal details:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetRepayReversalDetail';
      const requestData = {
        OurBranchID: params.OurBranchID,
        AccountID: params.AccountID,
        FromDate: params.FromDate,
        ToDate: params.ToDate,
        OperatorID: params.OperatorID || getOperatorId()
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Repayment reversal details loaded successfully:`, response);
        return {
          success: true,
          Details: response.Details || [],
          Details01: response.Details01 || [],  // Transaction list
          Details02: response.Details02 || [],  // Behind The Scene data
          transactions: response.Details01 || [],
          btsData: response.Details02 && response.Details02.length > 0 ? response.Details02[0] : null
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to load repayment reversal details:`, response);
        return {
          success: false,
          Details: [],
          Details01: [],
          Details02: [],
          transactions: [],
          btsData: null,
          message: response?.message || 'Failed to load data'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error loading repayment reversal details:`, error);
      return {
        success: false,
        Details: [],
        Details01: [],
        Details02: [],
        transactions: [],
        btsData: null,
        message: error.message
      };
    }
  }

  /**
   * Reverse Selected Repayment Transactions
   * Calls: exec p_AddLoanRepayReversalTrx @OurBranchID, @LoanAccountID, @LoanSeries, @CreatedBy, @DetailRecords (XML)
   * 
   * @param {Object} params - { OurBranchID, LoanAccountID, LoanSeries, CreatedBy, selectedTransactions }
   * @returns {Promise<Object>} Response with reversal result
   */
  async function reverseRepaymentTransactions(params) {
    try {
      console.log(`[${SERVICE_NAME}] Reversing repayment transactions:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      if (!params.selectedTransactions || params.selectedTransactions.length === 0) {
        return {
          success: false,
          message: 'No transactions selected for reversal'
        };
      }

      // Build XML from selected transactions
      // Expected format: <dt_LoanRepayReversal><record><TrxBatchID>...</TrxBatchID>...</record></dt_LoanRepayReversal>
      let xmlDetails = '<dt_LoanRepayReversal>';
      params.selectedTransactions.forEach(trx => {
        xmlDetails += '<record>';
        xmlDetails += `<TrxBatchID>${escapeXml(trx.TrxBatchID || '')}</TrxBatchID>`;
        xmlDetails += `<ValueDate>${escapeXml(trx.ValueDate || '')}</ValueDate>`;
        xmlDetails += `<TrxDate>${escapeXml(trx.TrxDate || '')}</TrxDate>`;
        xmlDetails += `<TransactionAmount>${trx.TransactionAmount || 0}</TransactionAmount>`;
        xmlDetails += `<Description>${escapeXml(trx.Description || '')}</Description>`;
        xmlDetails += '</record>';
      });
      xmlDetails += '</dt_LoanRepayReversal>';

      const formId = 'dbo.p_AddLoanRepayReversalTrx';
      const requestData = {
        OurBranchID: params.OurBranchID,
        LoanAccountID: params.LoanAccountID,
        LoanSeries: parseInt(params.LoanSeries) || 1,
        CreatedBy: params.CreatedBy || getOperatorId(),
        DetailRecords: xmlDetails
      };

      console.log(`[${SERVICE_NAME}] Calling p_AddLoanRepayReversalTrx with:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Repayment transactions reversed successfully:`, response);
        return {
          success: true,
          message: 'Transactions reversed successfully',
          data: response
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to reverse transactions:`, response);
        return {
          success: false,
          message: response?.message || 'Failed to reverse transactions'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error reversing transactions:`, error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * Search for branches
   * @param {Object} params - { OperatorID, OurBranchID }
   * @returns {Promise<Object>} Response with branch data
   */
  async function searchBranches(params = {}) {
    try {
      console.log(`[${SERVICE_NAME}] Searching branches:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        TableID: 'DIM_BRANCH',
        WhereStmt: 'IsActive=1',
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: '',
        OperatorID: params.OperatorID || getOperatorId(),
        ModuleID: MODULE_ID,
        OurBranchID: params.OurBranchID || '',
        SearchKey: params.SearchKey || null,
        LanguageID: 'en'
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Branch search successful:`, response);
        return {
          success: true,
          data: response.data || response.Details || [],
          Details: response.Details || response.data || []
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Branch search failed:`, response);
        return {
          success: false,
          data: [],
          Details: [],
          message: response?.message || 'Search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching branches:`, error);
      return { success: false, data: [], Details: [], message: error.message };
    }
  }

  /**
   * Search for clients
   * @param {Object} params - { OurBranchID, ClientID (search key), OperatorID }
   * @returns {Promise<Object>} Response with client data
   */
  async function searchClients(params = {}) {
    try {
      console.log(`[${SERVICE_NAME}] Searching clients:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetSearchResult';
      const whereStmt = params.OurBranchID 
        ? `IsActive=1 AND OurBranchID='${params.OurBranchID}'`
        : 'IsActive=1';

      const requestData = {
        TableID: 'ClientActiveID',
        WhereStmt: whereStmt,
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: '',
        OperatorID: params.OperatorID || getOperatorId(),
        ModuleID: MODULE_ID,
        OurBranchID: params.OurBranchID || '',
        SearchKey: params.SearchKey || null,
        LanguageID: 'en'
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Client search successful:`, response);
        return {
          success: true,
          data: response.data || response.Details || [],
          Details: response.Details || response.data || []
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Client search failed:`, response);
        return {
          success: false,
          data: [],
          Details: [],
          message: response?.message || 'Search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching clients:`, error);
      return { success: false, data: [], Details: [], message: error.message };
    }
  }

  /**
   * Search for loan accounts
   * @param {Object} params - { OurBranchID, ClientID, SearchKey, OperatorID }
   * @returns {Promise<Object>} Response with account data
   */
  async function searchAccounts(params = {}) {
    try {
      console.log(`[${SERVICE_NAME}] Searching accounts:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      // Build where statement with filters
      let whereStmt = "ProductTypeID='LN' AND LoanStatusID IN ('A','N')";
      
      if (params.OurBranchID) {
        whereStmt += ` AND OurBranchID='${params.OurBranchID}'`;
      }
      
      if (params.ClientID) {
        whereStmt += ` AND ClientID='${params.ClientID}'`;
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        TableID: 'LoanID',
        WhereStmt: whereStmt,
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: '',
        OperatorID: params.OperatorID || getOperatorId(),
        ModuleID: MODULE_ID,
        OurBranchID: params.OurBranchID || '',
        SearchKey: params.SearchKey || null,
        LanguageID: 'en'
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Account search successful:`, response);
        return {
          success: true,
          data: response.data || response.Details || [],
          Details: response.Details || response.data || []
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Account search failed:`, response);
        return {
          success: false,
          data: [],
          Details: [],
          message: response?.message || 'Search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching accounts:`, error);
      return { success: false, data: [], Details: [], message: error.message };
    }
  }

  /**
   * Get date dropdown options (for FromDate and ToDate selects)
   * This could be implemented to fetch available transaction dates
   * For now, returns empty array - implement as needed
   * 
   * @param {Object} params - { AccountID, OurBranchID, OperatorID }
   * @returns {Promise<Object>} Response with date options
   */
  async function getDateOptions(params = {}) {
    try {
      console.log(`[${SERVICE_NAME}] Getting date options (stub):`, params);
      
      // This is a placeholder - implement actual logic based on backend requirements
      // May need to call p_GetSearchResult or another procedure to get transaction dates
      
      return {
        success: true,
        data: [],
        message: 'Date options endpoint not yet implemented'
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error getting date options:`, error);
      return { success: false, data: [], message: error.message };
    }
  }

  // Export service methods
  const LoanRepaymentReversalService = {
    getRepaymentReversalDetails,
    reverseRepaymentTransactions,
    searchBranches,
    searchClients,
    searchAccounts,
    getDateOptions,
    getOperatorId,
    MODULE_ID,
    ENDPOINT
  };

  global.LoanRepaymentReversalService = LoanRepaymentReversalService;

  console.log(`[${SERVICE_NAME}] Service registered globally`);

})(window);
