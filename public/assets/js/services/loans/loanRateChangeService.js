/**
 * Loan Rate Change Service
 * Module ID: 4554
 * Handles all API calls for Loan Rate Change functionality
 * 
 * Stored Procedures:
 *   - p_GetSearchResult: Branch, Client, Account search
 *   - p_GetLoanRateChangeDetails: Fetch loan details and current schedule
 *   - p_GenerateNewSchedule: Calculate new schedule based on proposed rate
 *   - p_AddLoanRateChangeTrx: Save loan rate change and generate transactions
 */

(function (global) {
  'use strict';

  const SERVICE_NAME = 'LoanRateChangeService';
  const CoreApi = global.CoreApi;
  const SearchService = global.SearchService;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;
  const MODULE_ID = '4554';

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
   * Get logged in branch ID
   */
  function getOurBranchId() {
    return getSessionBranchId();
  }

  // ========================================
  // SEARCH FUNCTIONS (using SearchService)
  // ========================================

  /**
   * Search branches by ID or name
   */
  async function searchBranches(searchKey) {
    if (!SearchService || !SearchService.search) {
      console.error(`[${SERVICE_NAME}] SearchService not available`);
      return { success: false, data: [], error: 'Search service not available' };
    }

    try {
      // Build WhereStmt with LIKE pattern for branch ID search
      const whereStmt = searchKey ? `OurBranchID LIKE '%${searchKey}%'` : '';
      
      const payload = {
        TableID: 'BranchID',
        WhereStmt: whereStmt,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: '4300',
        OurBranchID: '000',
        AdvFilterString: '',
        SearchKey: ''
      };

      const response = await SearchService.search(payload);

      // Normalize response format
      let data = [];
      if (response?.Details?.SearchResults) {
        data = response.Details.SearchResults;
      } else if (response?.Details) {
        data = response.Details;
      } else if (response?.data?.SearchResults) {
        data = response.data.SearchResults;
      } else if (response?.data) {
        data = response.data;
      } else if (response?.SearchResults) {
        data = response.SearchResults;
      } else if (response?.result?.ResultSets?.[0]) {
        data = response.result.ResultSets[0];
      } else if (Array.isArray(response)) {
        data = response;
      }

      return {
        success: true,
        data: Array.isArray(data) ? data : []
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Search branches error:`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Search clients by branch and search key
   */
  async function searchClients(branchId, searchKey) {
    if (!SearchService || !SearchService.search) {
      console.error(`[${SERVICE_NAME}] SearchService not available`);
      return { success: false, data: [], error: 'Search service not available' };
    }

    try {
      const advFilter = `ProductTypeID = 'LN' AND OurBranchID='${branchId}'`;
      
      const payload = {
        TableID: 'ClientAccountID',
        WhereStmt: '',
        PrevOrNext: '0',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: '2207',
        OurBranchID: branchId,
        AdvFilterString: advFilter,
        SearchKey: ''
      };

      const response = await SearchService.search(payload);

      // Normalize response format
      let data = [];
      if (response?.Details?.SearchResults) {
        data = response.Details.SearchResults;
      } else if (response?.Details) {
        data = response.Details;
      } else if (response?.data?.SearchResults) {
        data = response.data.SearchResults;
      } else if (response?.data) {
        data = response.data;
      } else if (response?.SearchResults) {
        data = response.SearchResults;
      } else if (response?.result?.ResultSets?.[0]) {
        data = response.result.ResultSets[0];
      } else if (Array.isArray(response)) {
        data = response;
      }

      return {
        success: true,
        data: Array.isArray(data) ? data : []
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Search clients error:`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Search accounts by branch, client, and search key
   */
  async function searchAccounts(branchId, clientId, searchKey) {
    if (!SearchService || !SearchService.search) {
      console.error(`[${SERVICE_NAME}] SearchService not available`);
      return { success: false, data: [], error: 'Search service not available' };
    }

    try {
      const advFilter = `OurBranchID='${branchId}' AND LoanStatusID IN ('A','N')`;
      
      const payload = {
        TableID: 'LoanID',
        WhereStmt: '',
        PrevOrNext: '0',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: '2207',
        OurBranchID: branchId,
        AdvFilterString: advFilter,
        SearchKey: ''
      };

      const response = await SearchService.search(payload);

      // Normalize response format
      let data = [];
      if (response?.Details?.SearchResults) {
        data = response.Details.SearchResults;
      } else if (response?.Details) {
        data = response.Details;
      } else if (response?.data?.SearchResults) {
        data = response.data.SearchResults;
      } else if (response?.data) {
        data = response.data;
      } else if (response?.SearchResults) {
        data = response.SearchResults;
      } else if (response?.result?.ResultSets?.[0]) {
        data = response.result.ResultSets[0];
      } else if (Array.isArray(response)) {
        data = response;
      }

      return {
        success: true,
        data: Array.isArray(data) ? data : []
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Search accounts error:`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  // ========================================
  // BUSINESS FUNCTIONS
  // ========================================

  /**
   * Get loan rate change details (current loan details + schedule)
   * Uses p_GetLoanRescheduleDetails stored procedure
   */
  async function getLoanRateChangeDetails(branchId, clientId, accountId, loanSeries = '') {
    if (!CoreApi) {
      console.error(`[${SERVICE_NAME}] CoreApi not available`);
      return { success: false, error: 'API not available' };
    }

    try {
      const operatorId = getOperatorId();
      
      // Call p_GetLoanRescheduleDetails stored procedure
      const payload = {
        OurBranchID: branchId,
        AccountID: accountId,
        OperatorID: operatorId
      };

      const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetLoanRescheduleDetails', payload);
      console.log(`[${SERVICE_NAME}] Calling p_GetLoanRescheduleDetails with payload:`, envelope);

      const response = await CoreApi.post(ENDPOINT, envelope);
      console.log(`[${SERVICE_NAME}] p_GetLoanRescheduleDetails response:`, response);

      if (!response?.success) {
        console.error(`[${SERVICE_NAME}] Get loan details failed:`, response);
        return {
          success: false,
          error: response?.message || 'Failed to load loan details'
        };
      }

      // Response structure:
      // Details01: Header info (OurBranchID, ClientID, AccountID, etc.)
      // Details02: Loan details (LoanAmount, CurrencyID, InterestRate, etc.)
      // Details04: Configuration (CanExtTermOnReschedule, AllowIntWaiver, etc.)
      // Try multiple paths to access the data
      const headerData = response?.Details01?.[0] || response?.data?.Details01?.[0] || {};
      const loanData = response?.Details02?.[0] || response?.data?.Details02?.[0] || {};
      const configData = response?.Details04?.[0] || response?.data?.Details04?.[0] || {};
      
      console.log(`[${SERVICE_NAME}] Extracted headerData:`, headerData);
      console.log(`[${SERVICE_NAME}] Extracted loanData:`, loanData);
      console.log(`[${SERVICE_NAME}] Extracted configData:`, configData);
      
      // Use loanSeries from parameter (from form), or fallback to response data
      const finalLoanSeries = loanSeries || headerData.LoanSeries || '';
      
      console.log(`[${SERVICE_NAME}] Using loanSeries: "${finalLoanSeries}" (from parameter: "${loanSeries}", from response: "${headerData.LoanSeries}")`);
      
      // Now fetch current schedule using P_generateOldInstallment
      let currentSchedule = [];
      try {
        const schedulePayload = {
          OurbranchID: branchId,
          accountid: accountId,
          loanseries: finalLoanSeries
        };
        const scheduleEnvelope = CoreApi.makeRequestEnvelope('dbo.P_generateOldInstallment', schedulePayload);
        console.log(`[${SERVICE_NAME}] Calling P_generateOldInstallment with payload:`, scheduleEnvelope);
        const scheduleResponse = await CoreApi.post(ENDPOINT, scheduleEnvelope);
        console.log(`[${SERVICE_NAME}] P_generateOldInstallment response:`, scheduleResponse);
        if (scheduleResponse?.success && scheduleResponse?.Details) {
          currentSchedule = Array.isArray(scheduleResponse.Details) ? scheduleResponse.Details : [];
        }
      } catch (err) {
        console.warn(`[${SERVICE_NAME}] Failed to load current schedule:`, err);
      }
      
      return {
        success: true,
        data: {
          // Header info from Details01
          OurBranchID: headerData.OurBranchID || branchId,
          BranchName: headerData.BranchName || '',
          ClientID: headerData.ClientID || clientId,
          ClientName: headerData.ClientName || '',
          AccountID: headerData.AccountID || accountId,
          AccountName: headerData.AccountName || '',
          LoanSeries: headerData.LoanSeries || '',
          LoanRefNo: headerData.LoanRefNo || '',
          FromInstNo: headerData.FromInstNo || '',
          IsChangeTerm: headerData.IsChangeTerm || false,
          IsRateofIntChange: headerData.IsRateofIntChange,
          ProposedInterestRate: headerData.ProposedInterestRate,
          IsPostponeDueInst: headerData.IsPostponeDueInst,
          IsBrokenPeriod: headerData.IsBrokenPeriod,
          BrokenTerm: headerData.BrokenTerm,
          TermExtendReduceID: headerData.TermExtendReduceID,
          ExtRedTerm: headerData.ExtRedTerm,
          RescheduleStartDate: headerData.RescheduleStartDate,
          ProposedTerm: headerData.ProposedTerm,
          
          // Loan details from Details02
          LoanAmount: loanData.LoanAmount || 0,
          CurrencyID: loanData.CurrencyID || '',
          ProductID: loanData.ProductID || '',
          MaturityDate: loanData.MaturityDate || '',
          OutstandingPrincipal: loanData.OutstandingPrincipal || 0,
          OverduePrincipal: loanData.OverDuePrincipal || loanData.OverduePrincipal || 0,
          OverdueInterest: loanData.OverDueInterest || loanData.OverdueInterest || 0,
          TotalTerm: loanData.TotalTerm || '',
          TermType: loanData.TermType || '',
          BalanceTerm: loanData.BalanceTerm || '',
          LoanStatusID: loanData.LoanStatusID || '',
          LoanStatus: loanData.LoanStatus || '',
          InterestRate: loanData.InterestRate || '',
          CurrentInterestRate: loanData.InterestRate || '',
          CalculationMethodID: loanData.CalculationMethodID || '',
          PeriodTypeID: loanData.PeriodTypeID || '',
          RepaymentFrequencyID: loanData.RepaymentFrequencyID || '',
          RepaymentTerm: loanData.RepaymentTerm || '',
          GracePeriod: loanData.GracePeriod || 0,
          CurrentInstallment: loanData.installmentamount || loanData.InstallmentAmount || 0,
          LoanBalance: loanData.OutstandingPrincipal || 0,
          
          // Configuration from Details04
          MaxTrxDate: configData.MaxTrxDate || '',
          CanExtTermOnReschedule: configData.CanExtTermOnReschedule || false,
          MaxExtendableTerm: configData.MaxExtendableTerm || 0,
          MaxBreakPeriod: configData.MaxBreakPeriod || 0,
          BreakPeriod: configData.BreakPeriod,
          ColIntBreakPeriod: configData.ColIntBreakPeriod || false,
          AllowIntWaiver: configData.AllowIntWaiver || false,
          AllowInstPostpone: configData.AllowInstPostpone || false,
          
          // Current schedule
          CurrentSchedule: currentSchedule
        }
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Get loan details error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate current schedule
   * Uses p_generateOldInstallment stored procedure
   */
  async function generateCurrentSchedule(branchId, accountId, loanSeries) {
    if (!CoreApi) {
      return { success: false, data: [], error: 'API not available' };
    }

    try {
      const operatorId = getOperatorId();
      
      const payload = CoreApi.makeRequestEnvelope({
        RequestID: 'GenerateCurrentSchedule',
        ModuleID: MODULE_ID,
        OperatorID: operatorId,
        OperatorBranchID: branchId,
        OurBranchID: branchId,
        Data: {
          OurBranchID: branchId,
          AccountID: accountId,
          LoanSeries: loanSeries
        }
      }, 'p_generateOldInstallment', 'Loan');

      const response = await CoreApi.post(ENDPOINT, payload);

      if (!response || response.ResponseCode !== '200') {
        return { success: false, data: [], error: 'Failed to generate schedule' };
      }

      const data = response.ResponseValue ? JSON.parse(response.ResponseValue) : {};
      const scheduleData = data.Details || [];

      return {
        success: true,
        data: scheduleData
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Generate current schedule error:`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  /**
   * Save loan rate change
   * Calls p_LoanChangeRate stored procedure with @generateSchedule=1 to save and finalize
   * Matches Loan Maintenance pattern for save operations
   * @param {string} branchId - Branch ID (OurBranchID)
   * @param {string} accountId - Account ID
   * @param {string|number} loanSeries - Loan Series
   * @param {number} proposedRate - Proposed interest rate
   * @param {string} operatorId - Operator ID for audit trail
   * @returns {Promise<Object>} Response with success status
   */
  async function saveLoanRateChange(branchId, accountId, loanSeries, proposedRate, operatorId) {
    if (!CoreApi) {
      console.error(`[${SERVICE_NAME}] CoreApi not available`);
      return { success: false, error: 'API not available' };
    }

    try {
      operatorId = operatorId || getOperatorId();

      // Build payload for p_LoanChangeRate with @generateSchedule=1 (save mode)
      const payload = {
        OurBranchID: branchId,
        AccountID: accountId,
        LoanSeries: loanSeries,
        ProposedRate: parseFloat(proposedRate) || 0,
        IsRetainInstallmentAmount: 1,
        CreatedBy: operatorId,
        generateSchedule: 1  // 1 = save and finalize (vs 0 = preview only)
      };

      const envelope = CoreApi.makeRequestEnvelope('dbo.p_LoanChangeRate', payload);
      
      console.log(`[${SERVICE_NAME}] Calling p_LoanChangeRate (generateSchedule=1) with payload:`, envelope);
      console.log(`[${SERVICE_NAME}] Save payload details:`, {
        OurBranchID: branchId,
        AccountID: accountId,
        LoanSeries: loanSeries,
        ProposedRate: proposedRate,
        generateSchedule: 1
      });

      const response = await CoreApi.post(ENDPOINT, envelope);
      
      console.log(`[${SERVICE_NAME}] p_LoanChangeRate (generateSchedule=1) response:`, response);

      if (!response?.success) {
        console.error(`[${SERVICE_NAME}] Save rate change failed:`, response);
        return {
          success: false,
          error: response?.message || 'Failed to save loan rate change'
        };
      }

      console.log(`[${SERVICE_NAME}] Loan rate change saved successfully`);
      return {
        success: true,
        message: 'Loan rate change saved successfully',
        data: response.data || {}
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Save rate change error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate new schedule preview based on proposed rate
   * Uses p_LoanChangeRate stored procedure with @generateSchedule=0
   */
  async function generateNewSchedule(branchId, accountId, loanSeries, proposedRate) {
    if (!CoreApi) {
      console.error(`[${SERVICE_NAME}] CoreApi not available`);
      return { success: false, data: [], error: 'API not available' };
    }

    try {
      const operatorId = getOperatorId();

      // Prepare payload for p_LoanChangeRate with @generateSchedule=0
      const payload = {
        OurBranchID: branchId,
        AccountID: accountId,
        LoanSeries: loanSeries,
        ProposedRate: parseFloat(proposedRate) || 0,
        IsRetainInstallmentAmount: 1,
        CreatedBy: operatorId,
        generateSchedule: 0
      };

      const envelope = CoreApi.makeRequestEnvelope('dbo.p_LoanChangeRate', payload);
      
      console.log(`[${SERVICE_NAME}] Calling p_LoanChangeRate (generateSchedule=0) with payload:`, envelope);
      console.log(`[${SERVICE_NAME}] Payload details:`, {
        OurBranchID: branchId,
        AccountID: accountId,
        LoanSeries: loanSeries,
        ProposedRate: proposedRate,
        generateSchedule: 0
      });

      const response = await CoreApi.post(ENDPOINT, envelope);
      
      console.log(`[${SERVICE_NAME}] p_LoanChangeRate (generateSchedule=0) response:`, response);

      if (!response?.success) {
        console.error(`[${SERVICE_NAME}] Generate new schedule failed:`, response);
        return {
          success: false,
          data: [],
          error: response?.message || 'Failed to generate new schedule'
        };
      }

      // Extract schedule data from response
      const scheduleData = response?.Details || response?.data?.Details || [];

      console.log(`[${SERVICE_NAME}] New schedule data:`, scheduleData.length, 'rows');

      return {
        success: true,
        data: Array.isArray(scheduleData) ? scheduleData : []
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Generate new schedule error:`, error);
      return { success: false, data: [], error: error.message };
    }
  }

  // ========================================
  // EXPORTS
  // ========================================

  global.LoanRateChangeService = {
    searchBranches,
    searchClients,
    searchAccounts,
    getLoanDetails: getLoanRateChangeDetails, // Alias for convenience
    getLoanRateChangeDetails,
    generateNewSchedule,
    saveLoanRateChange
  };

  console.log(`[${SERVICE_NAME}] Service ready`);

})(window);
