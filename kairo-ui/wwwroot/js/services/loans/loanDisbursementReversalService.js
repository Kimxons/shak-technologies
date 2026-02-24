

// LoanDisbursementReversalService - refactored to match LoanMaintenanceService logic and structure
(function (global) {
  const MODULE_ID = '4553';
  const SERVICE_NAME = 'LoanDisbursementReversalService';
  const LookupService = global.LookupService;
  const SearchService = global.SearchService;
  const CoreApi = global.CoreApi;
  const AuthService = global.AuthService;
  const Environment = global.Environment || {};
  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  if (!CoreApi) {
    console.error(`[${SERVICE_NAME}] CoreApi not loaded - service initialization aborted`);
    return;
  }
  if (!SearchService) {
    console.error(`[${SERVICE_NAME}] SearchService not loaded - service initialization aborted`);
    return;
  }

  class LoanDisbursementReversalService {
    constructor() {
      this.moduleID = MODULE_ID;
      this.serviceName = SERVICE_NAME;
    }

    getOperatorId() {
      if (AuthService && AuthService.getSession) {
        const session = AuthService.getSession();
        return session?.OperatorID || session?.operatorID || 'web_portal';
      }
      return 'web_portal';
    }

    getSessionBranchId() {
      if (AuthService && AuthService.getSession) {
        const session = AuthService.getSession();
        return session?.BranchID || session?.branchID || '0101';
      }
      return '0101';
    }

    // Dropdown: Loan Reversal Reason
    async getLoanReversalReasonOptions() {
      try {
        if (LookupService && LookupService.getSystemCodeOptions) {
          return await LookupService.getSystemCodeOptions('LoanReversalReasonID');
        }
        // Fallback: direct CoreApi call
        const requestData = { CodeID: 'LoanReversalReasonID' };
        const envelope = CoreApi.makeRequestEnvelope('p_v1_GetSystemCodes', requestData);
        const response = await CoreApi.post(ENDPOINT, envelope);
        let options = response?.data?.Details || response?.Details || [];
        if (!Array.isArray(options)) options = options ? [options] : [];
        return options.map(opt => ({
          value: opt.SubCodeID || opt.value,
          label: opt.CodeDescription || opt.Description || opt.label || opt.text || opt.SubCodeID
        }));
      } catch (error) {
        console.error(`[${SERVICE_NAME}] Error in getLoanReversalReasonOptions:`, error);
        return [];
      }
    }

    // Search: Branches
    async searchBranches(searchKey) {
      try {
        const payload = {
          TableID: 'BranchID',
          WhereStmt: `OurBranchID LIKE '%${searchKey}%'`,
          PrevOrNext: '1',
          RefID: '',
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: this.getSessionBranchId(),
          AdvFilterString: '',
          SearchKey: searchKey
        };
        const response = await SearchService.search(payload);
        let results = response?.Details?.SearchResults
          || response?.Details
          || response?.data?.SearchResults
          || response?.data
          || response?.SearchResults
          || response?.result?.ResultSets?.[0]
          || response?.result
          || [];
        if (!Array.isArray(results)) results = results ? [results] : [];
        return { success: true, data: results };
      } catch (error) {
        console.error(`[${SERVICE_NAME}] Error in searchBranches:`, error);
        return { success: false, error: error.message, data: [] };
      }
    }

    // Search: Clients
    async searchClients(branchId, searchKey) {
      try {
        const payload = {
          TableID: 'ClientAccountID',
          WhereStmt: '',
          PrevOrNext: '0',
          RefID: '',
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: branchId,
          AdvFilterString: `ProductTypeID = 'LN' AND OurBranchID='${branchId}'`,
          SearchKey: searchKey,
          LanguageID: 'en'
        };
        const response = await SearchService.search(payload);
        let results = response?.Details?.SearchResults
          || response?.Details
          || response?.data?.SearchResults
          || response?.data
          || response?.SearchResults
          || response?.result?.ResultSets?.[0]
          || response?.result
          || [];
        if (!Array.isArray(results)) results = results ? [results] : [];
        return { success: true, data: results };
      } catch (error) {
        console.error(`[${SERVICE_NAME}] Error in searchClients:`, error);
        return { success: false, error: error.message, data: [] };
      }
    }

    // Search: Loan Accounts
    async searchAccounts(branchId, clientId, searchKey) {
      try {
        let advFilter = `OurBranchID='${branchId}' AND LoanStatusID IN ('A')`;
        if (clientId) advFilter += ` AND ClientID='${clientId}'`;
        const payload = {
          TableID: 'LoanID',
          WhereStmt: '',
          PrevOrNext: '0',
          RefID: '',
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          OurBranchID: branchId,
          AdvFilterString: advFilter,
          SearchKey: searchKey,
          LanguageID: 'en'
        };
        const response = await SearchService.search(payload);
        let results = response?.Details?.SearchResults
          || response?.Details
          || response?.data?.SearchResults
          || response?.data
          || response?.SearchResults
          || response?.result?.ResultSets?.[0]
          || response?.result
          || [];
        if (!Array.isArray(results)) results = results ? [results] : [];
        return { success: true, data: results };
      } catch (error) {
        console.error(`[${SERVICE_NAME}] Error in searchAccounts:`, error);
        return { success: false, error: error.message, data: [] };
      }
    }

    // Get Loan Reversal Details
    async getLoanReversalDetails(branchId, clientId, accountId) {
      try {
        const requestData = {
          OurBranchID: branchId || this.getSessionBranchId(),
          AccountID: accountId,
          OperatorID: this.getOperatorId()
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
        const data = response.data?.Details?.[0] || response.Details?.[0] || null;
        if (!data) {
          return { success: false, error: 'No loan reversal details found', data: null };
        }
        return { success: true, data: data };
      } catch (error) {
        console.error(`[${SERVICE_NAME}] Error in getLoanReversalDetails:`, error);
        return {
          success: false,
          error: error.message || 'Failed to fetch loan reversal details',
          data: null
        };
      }
    }

    // Save Loan Reversal
    async saveLoanReversal(reversalData, eventType) {
      try {
        const loanRevAppListXml = this.buildLoanReversalXml(reversalData);
        const requestData = {
          OurBranchID: reversalData.OurBranchID || this.getSessionBranchId(),
          GroupID: null,
          LoanSchemeID: null,
          LoanRevAppList: loanRevAppListXml,
          LoanReversalReasonID: reversalData.LoanReversalReasonID,
          Remarks: reversalData.Remarks || '',
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID
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

    // Check user rights
    async checkUserRights(eventType, branchId, clientId, accountId, svUpdateCount) {
      try {
        const requestData = {
          OperatorID: this.getOperatorId(),
          ModuleID: this.moduleID,
          EventType: eventType,
          OurBranchID: branchId || this.getSessionBranchId(),
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

    // Helper: Build XML for Loan Reversal List
    buildLoanReversalXml(reversalData) {
      function escapeXml(str) {
        if (str == null) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      }
      let xml = '<dt_GroupLoanReversals>';
      xml += `<LoanAccountID>${escapeXml(reversalData.LoanAccountID)}</LoanAccountID>`;
      xml += `<LoanSeries>${escapeXml(reversalData.LoanSeries)}</LoanSeries>`;
      xml += `<ReversalTypeID>${escapeXml(reversalData.ReversalTypeID)}</ReversalTypeID>`;
      xml += `<ApplicationID>${escapeXml(reversalData.ApplicationID)}</ApplicationID>`;
      xml += '</dt_GroupLoanReversals>';
      return xml;
    }
  }

  // Expose to global scope
  const serviceInstance = new LoanDisbursementReversalService();
  global.LoanDisbursementReversalService = serviceInstance;
  console.log(`[${SERVICE_NAME}] ✓ Service loaded and ready`);
  console.log(`[${SERVICE_NAME}] Available methods:`, Object.getOwnPropertyNames(Object.getPrototypeOf(serviceInstance)).filter(m => m !== 'constructor'));

})(window);
