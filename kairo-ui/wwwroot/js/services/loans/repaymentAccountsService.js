/**
 * Repayment Accounts Service
 * 
 * Service layer for Repayment Accounts functionality in Loan Maintenance module.
 * Handles all API communication for repayment accounts operations.
 * 
 * Module ID: 3119
 * Location: Loans > Loan Maintenance > Data Entry > Repayment Accounts
 * 
 * Database Procedures:
 * - p_GetLoanRepaymentAccount: Fetches repayment account details
 * - p_AddRepaymentAccountTrx: Saves repayment account records
 * 
 * Response Structure:
 * - Details: Event/edit lock information (OperatorID, EventID, NewData, CreatedOn, UpdateCount)
 * - Details01: Repayment account records
 * 
 * @author CBS Development Team
 * @date January 31, 2026
 */

(function (global) {
  'use strict';

  // Module guard
  if (global.RepaymentAccountsService) {
    console.warn('RepaymentAccountsService already loaded');
    return;
  }

  const SERVICE_NAME = 'RepaymentAccountsService';
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};
  const MODULE_ID = '3119';

  // Base URL and endpoint configuration (same pattern as loan-collaterals-service.js)
  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  console.log(`[${SERVICE_NAME}] Initializing service with endpoint:`, ENDPOINT);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get current operator ID from AuthService
   * @returns {string} Operator ID
   */
  function getOperatorId() {
    if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      const session = AuthService.getSession();
      return session?.operatorID || session?.OperatorID || '';
    }
    return '';
  }

  /**
   * Escape XML special characters
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  function escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // ============================================================================
  // API METHODS
  // ============================================================================

  /**
   * Get Loan Repayment Account Details
   * 
   * Fetches repayment account details for a specific loan account.
   * Calls: p_GetLoanRepaymentAccount
   * 
   * Request:
   * exec p_GetLoanRepaymentAccount @OurBranchID, @AccountID, @LoanSeries, @ApplicationID, @OperatorID
   * 
   * Response:
   * - Details: [{OperatorID, EventID, NewData, CreatedOn, UpdateCount}]
   * - Details01: [{RepaymentAccountID, RepaymentAccount, IsMainRepaymentAccount, RecoveryOrder, ...}]
   * 
   * @param {Object} params - Request parameters
   * @param {string} params.OurBranchID - Branch ID
   * @param {string} params.AccountID - Account ID
   * @param {string} params.LoanSeries - Loan Series
   * @param {string} params.ApplicationID - Application ID
   * @returns {Promise<Object>} API response with Details and Details01 arrays
   */
  async function getRepaymentAccountDetails(params) {
    try {
      const operatorId = getOperatorId();

      // Build payload matching the stored procedure parameters
      const payload = {
        OurBranchID: params.OurBranchID || '',
        AccountID: params.AccountID || '',
        LoanSeries: params.LoanSeries || '',
        ApplicationID: params.ApplicationID || '',
        OperatorID: operatorId
      };

      console.log(`[${SERVICE_NAME}] getRepaymentAccountDetails - Request:`, {
        endpoint: ENDPOINT,
        procedure: 'dbo.p_GetLoanRepaymentAccount',
        payload
      });

      // Use CoreApi.makeRequestEnvelope with stored procedure name (same pattern as loan-collaterals-service)
      const envelope = CoreApi.makeRequestEnvelope('dbo.p_GetLoanRepaymentAccount', payload);

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw = await response.json();
      console.log(`[${SERVICE_NAME}] getRepaymentAccountDetails - Raw response:`, raw);

      // Normalize response to match expected structure
      return {
        success: true,
        data: {
          Details: raw.Details || [],
          Details01: raw.Details01 || []
        }
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error fetching repayment account details:`, error);
      return {
        success: false,
        message: error.message || 'Failed to fetch repayment account details'
      };
    }
  }

  /**
   * Save Repayment Accounts
   * 
   * Saves repayment account records.
   * Calls: exec p_AddEditLoanRepaymentAccount @OurBranchID, @AccountID, @LoanSeries, @ApplicationID, @OperatorID, @Details
   * 
   * @Details XML format (each record is a <dt_RepaymentAccount> element):
   * <dt_RepaymentAccount>
   *   <RowID>0</RowID>
   *   <AccountID>1201806000001</AccountID>
   *   <OurBranchID>1201</OurBranchID>
   *   <LoanSeries>1</LoanSeries>
   *   <ClientID>120101007</ClientID>
   *   <ClientName>...</ClientName>
   *   <AccountName>...</AccountName>
   *   <BranchName>...</BranchName>
   *   <ApplicationID>1201007859</ApplicationID>
   *   <RepaymentAccountID>1201130000966</RepaymentAccountID>
   *   <RepaymentAccountBranchID>1201</RepaymentAccountBranchID>
   *   <IsMainRepaymentAccount>true</IsMainRepaymentAccount>
   *   <RecoveryOrder>1</RecoveryOrder>
   *   <RepaymentAccount>...</RepaymentAccount>
   *   <Applicable>true</Applicable>
   *   <CreatedBy>MS6702000767</CreatedBy>
   *   <CreatedOn>2024-10-18T09:25:00+03:00</CreatedOn>
   *   <ModifiedBy>101</ModifiedBy>
   *   <ModifiedOn>1900-01-01T00:00:00+03:00</ModifiedOn>
   *   <SupervisedOn>2026-01-24T10:02:00+03:00</SupervisedOn>
   *   <UpdateCount>3</UpdateCount>
   *   <ButtonMark>A</ButtonMark>
   * </dt_RepaymentAccount>
   * 
   * @param {Object} params - Request parameters
   * @param {string} params.OurBranchID - Branch ID
   * @param {string} params.AccountID - Account ID
   * @param {string} params.LoanSeries - Loan Series
   * @param {string} params.ApplicationID - Application ID
   * @param {Array} params.RepaymentAccounts - Array of repayment account records
   * @returns {Promise<Object>} API response
   */
  async function saveRepaymentAccounts(params) {
    try {
      const operatorId = getOperatorId();

      // Build XML for repayment accounts - each record is a <dt_RepaymentAccount> element
      let xmlDetails = '';
      
      if (params.RepaymentAccounts && Array.isArray(params.RepaymentAccounts)) {
        params.RepaymentAccounts.forEach((record) => {
          xmlDetails += '<dt_RepaymentAccount>';
          xmlDetails += `<RowID>${escapeXml(record.RowID || '0')}</RowID>`;
          xmlDetails += `<AccountID>${escapeXml(params.AccountID || record.AccountID || '')}</AccountID>`;
          xmlDetails += `<OurBranchID>${escapeXml(params.OurBranchID || record.OurBranchID || '')}</OurBranchID>`;
          xmlDetails += `<LoanSeries>${escapeXml(params.LoanSeries || record.LoanSeries || '')}</LoanSeries>`;
          xmlDetails += `<ClientID>${escapeXml(record.ClientID || '')}</ClientID>`;
          xmlDetails += `<ClientName>${escapeXml(record.ClientName || '')}</ClientName>`;
          xmlDetails += `<AccountName>${escapeXml(record.AccountName || '')}</AccountName>`;
          xmlDetails += `<BranchName>${escapeXml(record.BranchName || '')}</BranchName>`;
          xmlDetails += `<ApplicationID>${escapeXml(params.ApplicationID || record.ApplicationID || '')}</ApplicationID>`;
          xmlDetails += `<RepaymentAccountID>${escapeXml(record.RepaymentAccountID || '')}</RepaymentAccountID>`;
          xmlDetails += `<RepaymentAccountBranchID>${escapeXml(record.RepaymentAccountBranchID || '')}</RepaymentAccountBranchID>`;
          xmlDetails += `<IsMainRepaymentAccount>${record.IsMainRepaymentAccount === true || record.IsMainRepaymentAccount === 'true' ? 'true' : 'false'}</IsMainRepaymentAccount>`;
          xmlDetails += `<RecoveryOrder>${escapeXml(record.RecoveryOrder || '0')}</RecoveryOrder>`;
          xmlDetails += `<RepaymentAccount>${escapeXml(record.RepaymentAccount || '')}</RepaymentAccount>`;
          xmlDetails += `<Applicable>${record.Applicable === true || record.Applicable === 'true' ? 'true' : 'false'}</Applicable>`;
          xmlDetails += `<CreatedBy>${escapeXml(record.CreatedBy || operatorId)}</CreatedBy>`;
          if (record.CreatedOn) {
            xmlDetails += `<CreatedOn>${escapeXml(record.CreatedOn)}</CreatedOn>`;
          }
          xmlDetails += `<ModifiedBy>${escapeXml(record.ModifiedBy || operatorId)}</ModifiedBy>`;
          if (record.ModifiedOn) {
            xmlDetails += `<ModifiedOn>${escapeXml(record.ModifiedOn)}</ModifiedOn>`;
          }
          if (record.SupervisedBy) {
            xmlDetails += `<SupervisedBy>${escapeXml(record.SupervisedBy)}</SupervisedBy>`;
          }
          if (record.SupervisedOn) {
            xmlDetails += `<SupervisedOn>${escapeXml(record.SupervisedOn)}</SupervisedOn>`;
          }
          xmlDetails += `<UpdateCount>${escapeXml(record.UpdateCount || '1')}</UpdateCount>`;
          if (record.ButtonMark) {
            xmlDetails += `<ButtonMark>${escapeXml(record.ButtonMark)}</ButtonMark>`;
          }
          xmlDetails += '</dt_RepaymentAccount>';
        });
      }

      // Build payload for p_AddEditLoanRepaymentAccount
      const payload = {
        OurBranchID: params.OurBranchID || '',
        AccountID: params.AccountID || '',
        LoanSeries: params.LoanSeries || '',
        ApplicationID: params.ApplicationID || '',
        OperatorID: operatorId,
        Details: xmlDetails
      };

      console.log(`[${SERVICE_NAME}] saveRepaymentAccounts - Request:`, {
        endpoint: ENDPOINT,
        procedure: 'dbo.p_AddEditLoanRepaymentAccount',
        params: {
          OurBranchID: payload.OurBranchID,
          AccountID: payload.AccountID,
          LoanSeries: payload.LoanSeries,
          ApplicationID: payload.ApplicationID,
          OperatorID: payload.OperatorID,
          Details: '(XML data - see console for full XML)'
        }
      });
      console.log(`[${SERVICE_NAME}] saveRepaymentAccounts - XML Details:`, xmlDetails);

      const envelope = CoreApi.makeRequestEnvelope('dbo.p_AddEditLoanRepaymentAccount', payload);

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw = await response.json();
      console.log(`[${SERVICE_NAME}] saveRepaymentAccounts - Raw response:`, raw);

      // Check for error in response
      if (raw.ResponseCode && raw.ResponseCode !== '00') {
        return {
          success: false,
          message: raw.ResponseMessage || 'Save failed'
        };
      }

      return {
        success: true,
        data: raw
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error saving repayment accounts:`, error);
      return {
        success: false,
        message: error.message || 'Failed to save repayment accounts'
      };
    }
  }

  /**
   * Get User Rights
   * 
   * Checks user rights for a specific mode (EDIT, NONE, etc.)
   * 
   * @param {Object} params - Request parameters
   * @param {string} params.Mode - Mode (EDIT, NONE, etc.)
   * @param {string} params.OurBranchID - Branch ID
   * @param {string} params.AccountID - Account ID
   * @param {string} params.LoanSeries - Loan Series
   * @param {string} params.ApplicationID - Application ID
   * @param {string} params.BankID - Bank ID
   * @param {number} params.UpdateCount - Update count
   * @returns {Promise<Object>} API response
   */
  async function getUserRights(params) {
    try {
      // Build payload for user rights check
      const payload = {
        Mode: params.Mode || '',
        OurBranchID: params.OurBranchID || '',
        AccountID: params.AccountID || '',
        LoanSeries: params.LoanSeries || '',
        ApplicationID: params.ApplicationID || '',
        BankID: params.BankID || '',
        UpdateCount: params.UpdateCount || '0'
      };

      console.log(`[${SERVICE_NAME}] getUserRights - Request:`, {
        endpoint: ENDPOINT,
        procedure: 'dbo.p_CheckUserRights',
        payload
      });

      const envelope = CoreApi.makeRequestEnvelope('dbo.p_CheckUserRights', payload);

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(envelope)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const raw = await response.json();
      console.log(`[${SERVICE_NAME}] getUserRights - Raw response:`, raw);

      return {
        success: true,
        data: raw
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error getting user rights:`, error);
      return {
        success: false,
        message: error.message || 'Failed to check user rights'
      };
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  const RepaymentAccountsService = {
    getRepaymentAccountDetails,
    saveRepaymentAccounts,
    getUserRights
  };

  // Expose to global scope
  global.RepaymentAccountsService = RepaymentAccountsService;

  console.log('RepaymentAccountsService initialized');

})(window);
