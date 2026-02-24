/**
 * Legal Expense Service
 * Module ID: 3118
 * Handles all API calls for Legal Expense functionality
 * 
 * Stored Procedures:
 *   - p_GetLegalExpenseDetail (GET): Fetches legal expense details
 *   - p_AddLegalExpenseTrx (SAVE): Saves legal expense transactions
 *   - p_GetSearchResult: For branch/client/account lookups
 *   - p_GetCurrencyRate: For exchange rate lookup
 */

(function (global) {
  'use strict';

  const SERVICE_NAME = 'LegalExpenseService';
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;
  const MODULE_ID = '3118';

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
   * Get Legal Expense Details
   * Calls: exec p_GetLegalExpenseDetail @OurBranchID, @AccountID, @OperatorID
   * Returns: Details (account info), Details01 (transaction list), Details02 (Behind The Scene data)
   * 
   * @param {Object} params - { OurBranchID, AccountID, OperatorID }
   * @returns {Promise<Object>} Response with legal expense data
   */
  async function getLegalExpenseDetails(params) {
    try {
      console.log(`[${SERVICE_NAME}] Getting legal expense details:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetLegalExpenseDetail';
      const requestData = {
        OurBranchID: params.OurBranchID,
        AccountID: params.AccountID,
        OperatorID: params.OperatorID || getOperatorId()
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Legal expense details loaded successfully:`, response);
        return {
          success: true,
          Details: response.Details || null,
          Details01: response.Details01 || [], // Transaction list
          Details02: response.Details02 || null, // Behind The Scene data
          message: 'Legal expense details loaded successfully'
        };
      } else {
        console.error(`[${SERVICE_NAME}] Failed to load legal expense details:`, response);
        return {
          success: false,
          message: response?.message || 'Failed to load legal expense details'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error getting legal expense details:`, error);
      return {
        success: false,
        message: error.message || 'An error occurred while loading legal expense details'
      };
    }
  }

  /**
   * Get Till Details Per Till
   * Calls: exec pc_GetTillDetailPerTill @CashierID
   * @param {string} cashierId
   * @returns {Promise<Object>} Response with till details
   */
  async function getTillDetailsPerTill(cashierId) {
    try {
      console.log(`[${SERVICE_NAME}] Getting till details for cashier:`, cashierId);
      if (!CoreApi) throw new Error('CoreApi not available');
      const formId = 'dbo.pc_GetTillDetailPerTill';
      const requestData = { CashierID: cashierId };
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);
      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Till details loaded:`, response.Details);
        return { success: true, Details: response.Details || [] };
      } else {
        return { success: false, message: response?.message || 'Failed to load till details' };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error getting till details:`, error);
      return { success: false, message: error.message || 'An error occurred while loading till details' };
    }
  }

  /**
   * Get Loan Legal Expense
   * Calls: exec p_GetLoanLegalExpence @OurBranchID, @AccountID, @LoanSeries
   * @param {Object} params - { OurBranchID, AccountID, LoanSeries }
   * @returns {Promise<Object>} Response with legal expense
   */
  async function getLoanLegalExpense(params) {
    try {
      console.log(`[${SERVICE_NAME}] Getting loan legal expense:`, params);
      if (!CoreApi) throw new Error('CoreApi not available');
      const formId = 'dbo.p_GetLoanLegalExpence';
      const requestData = {
        OurBranchID: params.OurBranchID,
        AccountID: params.AccountID,
        LoanSeries: params.LoanSeries
      };
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);
      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Loan legal expense loaded:`, response.Details);
        return { success: true, Details: response.Details || [] };
      } else {
        return { success: false, message: response?.message || 'Failed to load legal expense' };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error getting loan legal expense:`, error);
      return { success: false, message: error.message || 'An error occurred while loading legal expense' };
    }
  }

  /**
   * Save Legal Expense Transaction
   * Calls: exec p_AddLegalExpenseTrx @OurBranchID, @LoanAccountID, @LoanSeries, @CreatedBy, @DetailRecords
   * 
   * @param {Object} params - { OurBranchID, LoanAccountID, LoanSeries, CreatedBy, transactions[] }
   * @returns {Promise<Object>} Response with save status
   */
  async function saveLegalExpenseTransaction(params) {
    try {
      console.log(`[${SERVICE_NAME}] Saving legal expense transaction:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      if (!params.transactions || params.transactions.length === 0) {
        throw new Error('No transactions to save');
      }

      // Build XML for transactions
      let xmlRecords = '<dt_LegalExpense>';
      params.transactions.forEach(txn => {
        xmlRecords += '<record>';
        xmlRecords += `<TransferType>${escapeXml(txn.TransferType)}</TransferType>`;
        xmlRecords += `<TrxTypeID>${escapeXml(txn.TrxTypeID)}</TrxTypeID>`;
        xmlRecords += `<AccountType>${escapeXml(txn.AccountType)}</AccountType>`;
        xmlRecords += `<ContraBranchID>${escapeXml(txn.ContraBranchID)}</ContraBranchID>`;
        xmlRecords += `<ContraAccountID>${escapeXml(txn.ContraAccountID)}</ContraAccountID>`;
        xmlRecords += `<TrxAmount>${escapeXml(txn.TrxAmount)}</TrxAmount>`;
        xmlRecords += `<LocalAmount>${escapeXml(txn.LocalAmount)}</LocalAmount>`;
        xmlRecords += `<ExchangeRate>${escapeXml(txn.ExchangeRate)}</ExchangeRate>`;
        xmlRecords += `<ForexGainLoss>${escapeXml(txn.ForexGainLoss)}</ForexGainLoss>`;
        xmlRecords += `<ReferenceNo>${escapeXml(txn.ReferenceNo)}</ReferenceNo>`;
        xmlRecords += `<Narration>${escapeXml(txn.Narration)}</Narration>`;
        xmlRecords += `<TillID>${escapeXml(txn.TillID)}</TillID>`;
        xmlRecords += '</record>';
      });
      xmlRecords += '</dt_LegalExpense>';

      const formId = 'dbo.p_AddLegalExpenseTrx';
      const requestData = {
        OurBranchID: params.OurBranchID,
        LoanAccountID: params.LoanAccountID,
        LoanSeries: params.LoanSeries,
        CreatedBy: params.CreatedBy || getOperatorId(),
        DetailRecords: xmlRecords
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Legal expense transaction saved successfully:`, response);
        return {
          success: true,
          message: 'Legal expense transaction saved successfully'
        };
      } else {
        console.error(`[${SERVICE_NAME}] Failed to save legal expense transaction:`, response);
        return {
          success: false,
          message: response?.message || 'Failed to save legal expense transaction'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error saving legal expense transaction:`, error);
      return {
        success: false,
        message: error.message || 'An error occurred while saving legal expense transaction'
      };
    }
  }

  /**
   * Search Branches
   * Calls: p_GetSearchResult with TableID = 'DIM_BRANCH'
   * 
   * @param {Object} params - { SearchText, SearchBy }
   * @returns {Promise<Object>} Response with branch list
   */
  async function searchBranches(params) {
    try {
      console.log(`[${SERVICE_NAME}] Searching branches:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        TableID: 'DIM_BRANCH',
        WhereStmt: 'IsActive=1',
        SearchBy: params.SearchBy || 'BranchID',
        SearchText: params.SearchText || ''
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Branch search completed:`, response);
        return {
          success: true,
          data: response.data || [],
          Details: response.Details || []
        };
      } else {
        console.error(`[${SERVICE_NAME}] Branch search failed:`, response);
        return {
          success: false,
          message: response?.message || 'Branch search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching branches:`, error);
      return {
        success: false,
        message: error.message || 'An error occurred while searching branches'
      };
    }
  }

  /**
   * Search Clients
   * Calls: p_GetSearchResult with TableID = 'ClientActiveID'
   * 
   * @param {Object} params - { SearchText, SearchBy, BranchID }
   * @returns {Promise<Object>} Response with client list
   */
  async function searchClients(params) {
    try {
      console.log(`[${SERVICE_NAME}] Searching clients:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      let whereStmt = 'IsActive=1';
      if (params.BranchID) {
        whereStmt += ` AND OurBranchID='${params.BranchID}'`;
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        TableID: 'ClientActiveID',
        WhereStmt: whereStmt,
        SearchBy: params.SearchBy || 'ClientID',
        SearchText: params.SearchText || ''
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Client search completed:`, response);
        return {
          success: true,
          data: response.data || [],
          Details: response.Details || []
        };
      } else {
        console.error(`[${SERVICE_NAME}] Client search failed:`, response);
        return {
          success: false,
          message: response?.message || 'Client search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching clients:`, error);
      return {
        success: false,
        message: error.message || 'An error occurred while searching clients'
      };
    }
  }

  /**
   * Search Accounts (Loan Accounts)
   * Calls: p_GetSearchResult with TableID = 'LoanID'
   * 
   * @param {Object} params - { SearchText, SearchBy, BranchID, ClientID }
   * @returns {Promise<Object>} Response with account list
   */
  async function searchAccounts(params) {
    try {
      console.log(`[${SERVICE_NAME}] Searching accounts:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      let whereStmt = "ProductTypeID='LN' AND LoanStatusID IN ('A','N')";
      if (params.BranchID) {
        whereStmt += ` AND OurBranchID='${params.BranchID}'`;
      }
      if (params.ClientID) {
        whereStmt += ` AND ClientID='${params.ClientID}'`;
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        TableID: 'LoanID',
        WhereStmt: whereStmt,
        SearchBy: params.SearchBy || 'AccountID',
        SearchText: params.SearchText || ''
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Account search completed:`, response);
        return {
          success: true,
          data: response.data || [],
          Details: response.Details || []
        };
      } else {
        console.error(`[${SERVICE_NAME}] Account search failed:`, response);
        return {
          success: false,
          message: response?.message || 'Account search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching accounts:`, error);
      return {
        success: false,
        message: error.message || 'An error occurred while searching accounts'
      };
    }
  }

  /**
   * Search Contra Accounts (GL/CASA Accounts)
   * Calls: p_GetSearchResult with TableID based on AccountType
   * 
   * @param {Object} params - { SearchText, SearchBy, BranchID, AccountType }
   * @returns {Promise<Object>} Response with contra account list
   */
  async function searchContraAccounts(params) {
    try {
      console.log(`[${SERVICE_NAME}] Searching contra accounts:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      // Determine TableID based on AccountType
      let tableId = 'AccountID'; // Default
      if (params.AccountType === 'G') {
        tableId = 'GLID';
      } else if (params.AccountType === 'C') {
        tableId = 'CASAID';
      }

      let whereStmt = 'IsActive=1';
      if (params.BranchID) {
        whereStmt += ` AND OurBranchID='${params.BranchID}'`;
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        TableID: tableId,
        WhereStmt: whereStmt,
        SearchBy: params.SearchBy || 'AccountID',
        SearchText: params.SearchText || ''
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Contra account search completed:`, response);
        return {
          success: true,
          data: response.data || [],
          Details: response.Details || []
        };
      } else {
        console.error(`[${SERVICE_NAME}] Contra account search failed:`, response);
        return {
          success: false,
          message: response?.message || 'Contra account search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching contra accounts:`, error);
      return {
        success: false,
        message: error.message || 'An error occurred while searching contra accounts'
      };
    }
  }

  /**
   * Get Currency Rate
   * Calls: p_GetCurrencyRate
   * 
   * @param {Object} params - { FromCurrencyID, ToCurrencyID, ValueDate }
   * @returns {Promise<Object>} Response with exchange rate
   */
  async function getCurrencyRate(params) {
    try {
      console.log(`[${SERVICE_NAME}] Getting currency rate:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetCurrencyRate';
      const requestData = {
        FromCurrencyID: params.FromCurrencyID,
        ToCurrencyID: params.ToCurrencyID,
        ValueDate: params.ValueDate
      };

      console.log(`[${SERVICE_NAME}] Request data:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Currency rate retrieved successfully:`, response);
        return {
          success: true,
          rate: response.Details?.ExchangeRate || response.data?.ExchangeRate || 1.0000,
          message: 'Currency rate retrieved successfully'
        };
      } else {
        console.error(`[${SERVICE_NAME}] Failed to get currency rate:`, response);
        return {
          success: false,
          rate: 1.0000,
          message: response?.message || 'Failed to get currency rate'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error getting currency rate:`, error);
      return {
        success: false,
        rate: 1.0000,
        message: error.message || 'An error occurred while getting currency rate'
      };
    }
  }

  // Public API
  global.LegalExpenseService = {
    getLegalExpenseDetails,
    getTillDetailsPerTill,
    getLoanLegalExpense,
    saveLegalExpenseTransaction,
    searchBranches,
    searchClients,
    searchAccounts,
    searchContraAccounts,
    getCurrencyRate
  };

  console.log(`[${SERVICE_NAME}] Service initialized successfully`);

})(window);
