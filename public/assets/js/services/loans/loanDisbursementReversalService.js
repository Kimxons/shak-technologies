/**
 * Loan Disbursement Reversal Service
 * Module ID: 4553
 * Handles all API calls for Loan Disbursement Reversal functionality
 * 
 * Stored Procedures:
 *   - p_GetSearchResult: Branch, Client, Account search
 *   - p_GetLoanReversalDetails: Fetch loan reversal details
 *   - p_AddUpdateLoanReversal: Save/update loan reversal
 *   - p_UserRights: Check user rights
 */

(function (global) {
  'use strict';

  const SERVICE_NAME = 'LoanDisbursementReversalService';
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;
  const MODULE_ID = '4553';

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
   * Get Branch ID from session
   */
  function getSessionBranchId() {
    if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      const session = AuthService.getSession();
      return session?.BranchID || session?.branchID || '0101';
    }
    return '0101';
  }

  /**
   * Search for Branch by ID
   */
  async function searchBranches(searchKey) {
    try {
      const payload = {
        TableID: 'BranchID',
        WhereStmt: `OurBranchID LIKE '%${searchKey}%'`,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: MODULE_ID,
        OurBranchID: getSessionBranchId(),
        AdvFilterString: '',
        SearchKey: searchKey
      };

      const response = await SearchService.search(payload);
      
      // Normalize response
      let results = response?.Details?.SearchResults
        || response?.Details
        || response?.data?.SearchResults
        || response?.data
        || response?.SearchResults
        || response?.result?.ResultSets?.[0]
        || response?.result
        || [];
      
      if (!Array.isArray(results)) {
        results = results ? [results] : [];
      }

      return { success: true, data: results };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in searchBranches:`, error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Search for Clients by criteria
   */
  async function searchClients(branchId, searchKey) {
    try {
      const payload = {
        TableID: 'ClientAccountID',
        WhereStmt: '',
        PrevOrNext: '0',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: MODULE_ID,
        OurBranchID: branchId,
        AdvFilterString: `ProductTypeID = 'LN' AND OurBranchID='${branchId}'`,
        SearchKey: searchKey,
        LanguageID: 'en'
      };

      const response = await SearchService.search(payload);
      
      // Normalize response
      let results = response?.Details?.SearchResults
        || response?.Details
        || response?.data?.SearchResults
        || response?.data
        || response?.SearchResults
        || response?.result?.ResultSets?.[0]
        || response?.result
        || [];
      
      if (!Array.isArray(results)) {
        results = results ? [results] : [];
      }

      return { success: true, data: results };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in searchClients:`, error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Search for Loan Accounts
   */
  async function searchAccounts(branchId, clientId, searchKey) {
    try {
      let advFilter = `OurBranchID='${branchId}' AND LoanStatusID IN ('A')`;
      if (clientId) {
        advFilter += ` AND ClientID='${clientId}'`;
      }

      const payload = {
        TableID: 'LoanID',
        WhereStmt: '',
        PrevOrNext: '0',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: MODULE_ID,
        OurBranchID: branchId,
        AdvFilterString: advFilter,
        SearchKey: searchKey,
        LanguageID: 'en'
      };

      const response = await SearchService.search(payload);
      
      // Normalize response
      let results = response?.Details?.SearchResults
        || response?.Details
        || response?.data?.SearchResults
        || response?.data
        || response?.SearchResults
        || response?.result?.ResultSets?.[0]
        || response?.result
        || [];
      
      if (!Array.isArray(results)) {
        results = results ? [results] : [];
      }

      return { success: true, data: results };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in searchAccounts:`, error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get Loan Reversal Details
   */
  async function getLoanReversalDetails(branchId, clientId, accountId) {
    try {
      console.log(`[${SERVICE_NAME}] Getting loan reversal details for:`, { branchId, accountId });

      const requestData = {
        OurBranchID: branchId || getSessionBranchId(),
        AccountID: accountId,
        OperatorID: getOperatorId()
      };

      const envelope = CoreApi.makeRequestEnvelope('p_GetLoanReversalDetails', requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (!response.success) {
        return {
          success: false,
          error: response.error || response.message || 'Failed to fetch loan reversal details',
          data: null
        };
      }

      // Extract data from response
      const data = response.data?.Details?.[0] || response.Details?.[0] || null;

      if (!data) {
        return { success: false, error: 'No loan reversal details found', data: null };
      }

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in getLoanReversalDetails:`, error);
      return {
        success: false,
        error: error.message || 'Failed to fetch loan reversal details',
        data: null
      };
    }
  }

  /**
   * Build XML for Loan Reversal List
   */
  function buildLoanReversalXml(reversalData) {
    let xml = '<dt_GroupLoanReversals>';
    xml += `<LoanAccountID>${escapeXml(reversalData.LoanAccountID)}</LoanAccountID>`;
    xml += `<LoanSeries>${escapeXml(reversalData.LoanSeries)}</LoanSeries>`;
    xml += `<ReversalTypeID>${escapeXml(reversalData.ReversalTypeID)}</ReversalTypeID>`;
    xml += `<ApplicationID>${escapeXml(reversalData.ApplicationID)}</ApplicationID>`;
    xml += '</dt_GroupLoanReversals>';
    return xml;
  }

  /**
   * Save Loan Reversal
   */
  async function saveLoanReversal(reversalData, eventType) {
    try {
      console.log(`[${SERVICE_NAME}] Saving loan reversal:`, reversalData);

      const loanRevAppListXml = buildLoanReversalXml(reversalData);

      const requestData = {
        OurBranchID: reversalData.OurBranchID || getSessionBranchId(),
        GroupID: null,
        LoanSchemeID: null,
        LoanRevAppList: loanRevAppListXml,
        LoanReversalReasonID: reversalData.LoanReversalReasonID,
        Remarks: reversalData.Remarks || '',
        OperatorID: getOperatorId(),
        ModuleID: MODULE_ID
      };

      const envelope = CoreApi.makeRequestEnvelope('p_AddLoanReversalTrx', requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (!response.success) {
        return {
          success: false,
          error: response.error || response.message || 'Failed to save loan reversal',
          data: null
        };
      }

      return {
        success: true,
        message: response.message || 'Loan reversal saved successfully',
        data: response.data || response.Details || {}
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in saveLoanReversal:`, error);
      return {
        success: false,
        error: error.message || 'Failed to save loan reversal',
        data: null
      };
    }
  }

  /**
   * Check user rights
   */
  async function checkUserRights(eventType, branchId, clientId, accountId, svUpdateCount) {
    try {
      console.log(`[${SERVICE_NAME}] Checking user rights for:`, { eventType, branchId, clientId, accountId });

      const requestData = {
        OperatorID: getOperatorId(),
        ModuleID: MODULE_ID,
        EventType: eventType,
        OurBranchID: branchId || getSessionBranchId(),
        ClientID: clientId || '',
        AccountID: accountId || '',
        SVUpdateCount: svUpdateCount || 0
      };

      const envelope = CoreApi.makeRequestEnvelope('p_UserRights', requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (!response.success) {
        return {
          success: false,
          message: response.error || response.message || 'User rights check failed',
          data: null
        };
      }

      return {
        success: true,
        message: 'User rights verified',
        data: response.data || {}
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in checkUserRights:`, error);
      return {
        success: false,
        message: error.message || 'Failed to check user rights',
        data: null
      };
    }
  }

  // Export the service
  const LoanDisbursementReversalService = {
    getLoanReversalDetails,
    saveLoanReversal,
    checkUserRights,
    searchBranches,
    searchClients,
    searchAccounts
  };

  global.LoanDisbursementReversalService = LoanDisbursementReversalService;
  console.log(`[${SERVICE_NAME}] Service registered successfully`);

})(window);
