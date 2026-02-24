/**
 * Loan Waiver Service
 * Module ID: 4361
 * Handles all API calls for Loan Waiver functionality
 * 
 * Stored Procedures:
 *   - p_GetSearchResult: Branch, Client, Account search
 *   - p_GetLoanWaiver: Fetch loan waiver details and components (JSON response)
 *   - p_GetLoanWaiverPostTrx: Generate waiver transactions
 *   - p_AddLoanWaiverPostTrx: Save loan waiver
 */

(function (global) {
  'use strict';

  const SERVICE_NAME = 'LoanWaiverService';
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;
  const MODULE_ID = '4361';

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
   * Build XML for component data (for Generate and Save)
   */
  function buildComponentsXml(components) {
    if (!components || components.length === 0) {
      return '';
    }

    let xml = '';
    components.forEach(comp => {
      xml += '<dt_LoanWaiver>';
      xml += `<SLNo>${comp.SLNo || ''}</SLNo>`;
      xml += `<ComponentID>${escapeXml(comp.ComponentID || '')}</ComponentID>`;
      xml += `<Component>${escapeXml(comp.Component || '')}</Component>`;
      xml += `<WaiverAmount>${comp.WaiverAmount || '0'}</WaiverAmount>`;
      xml += `<ActualAmount>${comp.ActualAmount || '0'}</ActualAmount>`;
      xml += '<DS_LoanWaiver_Id>0</DS_LoanWaiver_Id>';
      xml += `<IsEditable>${comp.IsEditable === true || comp.IsEditable === 'true' ? 'true' : 'false'}</IsEditable>`;
      xml += `<SettlementAmount>${comp.SettlementAmount || '0'}</SettlementAmount>`;
      xml += '</dt_LoanWaiver>';
    });
    return xml;
  }

  /**
   * Build XML for header data (for Save)
   */
  function buildHeaderXml(header, remarks, createdBy, modifiedBy) {
    let xml = '<dt_BHSLoanWaiver>';
    xml += `<OurBranchID>${escapeXml(header.OurBranchID || '')}</OurBranchID>`;
    xml += `<BranchName>${escapeXml(header.BranchName || '')}</BranchName>`;
    xml += `<ClientID>${escapeXml(header.ClientID || '')}</ClientID>`;
    xml += `<ClientName>${escapeXml(header.ClientName || '')}</ClientName>`;
    xml += `<AccountID>${escapeXml(header.AccountID || '')}</AccountID>`;
    xml += `<AccountName>${escapeXml(header.AccountName || '')}</AccountName>`;
    xml += `<LoanSeries>${header.LoanSeries || ''}</LoanSeries>`;
    xml += `<ProductID>${escapeXml(header.ProductID || '')}</ProductID>`;
    xml += `<LoanAmount>${header.LoanAmount || '0'}</LoanAmount>`;
    xml += `<MaturityDate>${escapeXml(header.MaturityDate || '')}</MaturityDate>`;
    xml += `<LoanBalance>${header.LoanBalance || '0'}</LoanBalance>`;
    xml += `<DaysArrears>${header.DaysArrears || '0'}</DaysArrears>`;
    xml += `<CurrencyID>${escapeXml(header.CurrencyID || '')}</CurrencyID>`;
    xml += `<RiskClassification>${escapeXml(header.RiskClassification || '')}</RiskClassification>`;
    xml += `<CreatedBy>${escapeXml(createdBy || '')}</CreatedBy>`;
    xml += `<ModifiedBy>${escapeXml(modifiedBy || '')}</ModifiedBy>`;
    xml += `<Remarks>${escapeXml(remarks || '')}</Remarks>`;
    xml += '<DS_LoanWaiver_Id>0</DS_LoanWaiver_Id>';
    xml += '</dt_BHSLoanWaiver>';
    return xml;
  }

  /**
   * Build XML for transaction data (for Save)
   */
  function buildTransactionsXml(transactions) {
    if (!transactions || transactions.length === 0) {
      return '';
    }

    let xml = '';
    transactions.forEach(trx => {
      xml += '<dt_Transactions>';
      xml += `<TrxBatchSLNo>${trx.TrxBatchSLNo || ''}</TrxBatchSLNo>`;
      xml += `<TrxBranchID>${escapeXml(trx.TrxBranchID || trx.OurBranchID || '')}</TrxBranchID>`;
      xml += `<OurBranchID>${escapeXml(trx.OurBranchID || '')}</OurBranchID>`;
      xml += `<AccountTypeID>${escapeXml(trx.AccountTypeID || '')}</AccountTypeID>`;
      xml += `<AccountType>${escapeXml(trx.AccountType || '')}</AccountType>`;
      xml += `<AccountID>${escapeXml(trx.AccountID || '')}</AccountID>`;
      xml += `<Name>${escapeXml(trx.Name || '')}</Name>`;
      xml += `<ProductID>${escapeXml(trx.ProductID || '')}</ProductID>`;
      xml += `<TrxCodeID>${escapeXml(trx.TrxCodeID || '')}</TrxCodeID>`;
      xml += `<TrxTypeID>${escapeXml(trx.TrxTypeID || '')}</TrxTypeID>`;
      xml += `<TrxType>${escapeXml(trx.TrxType || '')}</TrxType>`;
      xml += `<TrxDate>${escapeXml(trx.TrxDate || '')}</TrxDate>`;
      xml += `<ValueDate>${escapeXml(trx.ValueDate || '')}</ValueDate>`;
      xml += `<Amount>${trx.Amount || '0'}</Amount>`;
      xml += `<LocalAmount>${trx.LocalAmount || '0'}</LocalAmount>`;
      xml += `<TrxCurrencyID>${escapeXml(trx.TrxCurrencyID || '')}</TrxCurrencyID>`;
      xml += `<TrxAmount>${trx.TrxAmount || '0'}</TrxAmount>`;
      xml += `<ExchangeRate>${trx.ExchangeRate || '1.0'}</ExchangeRate>`;
      xml += `<MeanRate>${trx.MeanRate || '1'}</MeanRate>`;
      xml += `<Profit>${trx.Profit || '0'}</Profit>`;
      xml += `<ReferenceNo>${escapeXml(trx.ReferenceNo || '')}</ReferenceNo>`;
      xml += `<Remarks>${escapeXml(trx.Remarks || '')}</Remarks>`;
      xml += `<TrxDescriptionID>${trx.TrxDescriptionID || ''}</TrxDescriptionID>`;
      xml += `<TrxDescription>${escapeXml(trx.TrxDescription || '')}</TrxDescription>`;
      xml += `<MainGLID>${escapeXml(trx.MainGLID || '')}</MainGLID>`;
      xml += `<ContraGLID>${escapeXml(trx.ContraGLID || '')}</ContraGLID>`;
      xml += `<TrxBatchID>${escapeXml(trx.TrxBatchID || '')}</TrxBatchID>`;
      xml += `<TrxSerialID>${escapeXml(trx.TrxSerialID || '')}</TrxSerialID>`;
      xml += '<DS_Transactions_Id>0</DS_Transactions_Id>';
      xml += '</dt_Transactions>';
    });
    return xml;
  }

  /**
   * Search for Branch by ID
   * Calls p_GetSearchResult with TableID='BranchID'
   */
  async function searchBranches(searchKey) {
    try {
      const xmlPayload = `
        <Payload>
          <ProcName>p_GetSearchResult</ProcName>
          <OperatorID>${escapeXml(getOperatorId())}</OperatorID>
          <ModuleID>${MODULE_ID}</ModuleID>
          <Params>
            <Param Name="TableID" Value="BranchID" />
            <Param Name="WhereStmt" Value="OurBranchID LIKE '%${escapeXml(searchKey)}%'" />
            <Param Name="PrevOrNext" Value="1" />
            <Param Name="RefID" Value="" />
            <Param Name="OurBranchID" Value="${escapeXml(getSessionBranchId())}" />
            <Param Name="AdvFilterString" Value="" />
            <Param Name="SearchKey" Value="" />
            <Param Name="LanguageID" Value="en" />
          </Params>
        </Payload>
      `.trim();

      const response = await CoreApi.post(ENDPOINT, xmlPayload);
      
      if (!response.success) {
        return { success: false, error: response.error || 'Branch search failed', data: [] };
      }

      // Parse JSON response - should contain array of branch results
      if (response.data && typeof response.data === 'string') {
        try {
          const parsed = JSON.parse(response.data);
          return { success: true, data: parsed || [] };
        } catch {
          return { success: false, error: 'Invalid response format', data: [] };
        }
      }

      return { success: true, data: response.data || [] };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in searchBranches:`, error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Search for Clients by criteria
   * Calls p_GetSearchResult with TableID='ClientAccountID'
   */
  async function searchClients(branchId, searchKey) {
    try {
      const advFilter = `ProductTypeID = 'LN' AND OurBranchID='${escapeXml(branchId)}'`;
      
      const xmlPayload = `
        <Payload>
          <ProcName>p_GetSearchResult</ProcName>
          <OperatorID>${escapeXml(getOperatorId())}</OperatorID>
          <ModuleID>${MODULE_ID}</ModuleID>
          <Params>
            <Param Name="TableID" Value="ClientAccountID" />
            <Param Name="WhereStmt" Value="" />
            <Param Name="PrevOrNext" Value="0" />
            <Param Name="RefID" Value="" />
            <Param Name="OurBranchID" Value="${escapeXml(branchId)}" />
            <Param Name="AdvFilterString" Value="${escapeXml(advFilter)}" />
            <Param Name="SearchKey" Value="${escapeXml(searchKey)}" />
            <Param Name="LanguageID" Value="en" />
          </Params>
        </Payload>
      `.trim();

      const response = await CoreApi.post(ENDPOINT, xmlPayload);

      if (!response.success) {
        return { success: false, error: response.error || 'Client search failed', data: [] };
      }

      if (response.data && typeof response.data === 'string') {
        try {
          const parsed = JSON.parse(response.data);
          return { success: true, data: parsed || [] };
        } catch {
          return { success: false, error: 'Invalid response format', data: [] };
        }
      }

      return { success: true, data: response.data || [] };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in searchClients:`, error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Search for Accounts (Loans) by criteria
   * Calls p_GetSearchResult with TableID='LoanID'
   */
  async function searchAccounts(branchId, searchKey) {
    try {
      const advFilter = `OurBranchID='${escapeXml(branchId)}' AND LoanStatusID IN('A','R','S','N')`;
      
      const xmlPayload = `
        <Payload>
          <ProcName>p_GetSearchResult</ProcName>
          <OperatorID>${escapeXml(getOperatorId())}</OperatorID>
          <ModuleID>${MODULE_ID}</ModuleID>
          <Params>
            <Param Name="TableID" Value="LoanID" />
            <Param Name="WhereStmt" Value="" />
            <Param Name="PrevOrNext" Value="0" />
            <Param Name="RefID" Value="" />
            <Param Name="OurBranchID" Value="${escapeXml(branchId)}" />
            <Param Name="AdvFilterString" Value="${escapeXml(advFilter)}" />
            <Param Name="SearchKey" Value="${escapeXml(searchKey)}" />
            <Param Name="LanguageID" Value="en" />
          </Params>
        </Payload>
      `.trim();

      const response = await CoreApi.post(ENDPOINT, xmlPayload);

      if (!response.success) {
        return { success: false, error: response.error || 'Account search failed', data: [] };
      }

      if (response.data && typeof response.data === 'string') {
        try {
          const parsed = JSON.parse(response.data);
          return { success: true, data: parsed || [] };
        } catch {
          return { success: false, error: 'Invalid response format', data: [] };
        }
      }

      return { success: true, data: response.data || [] };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in searchAccounts:`, error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get Loan Waiver Details
   * Calls p_GetLoanWaiver (returns JSON with Details and Details01)
   */
  async function getLoanWaiverDetails(branchId, accountId) {
    try {
      console.log(`[${SERVICE_NAME}] Getting loan waiver details for:`, { branchId, accountId });

      const requestData = {
        OurBranchID: branchId || getSessionBranchId(),
        AccountID: accountId,
        OperatorID: getOperatorId()
      };

      const envelope = CoreApi.makeRequestEnvelope('p_GetLoanWaiver', requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (!response.success) {
        return {
          success: false,
          error: response.error || response.message || 'Failed to fetch loan waiver details',
          data: null
        };
      }

      // Extract data from response
      let data = response.data || response.Details || {};

      // Extract header and components
      const header = data.Details?.[0] || null;
      const components = data.Details01 || [];

      if (!header) {
        return { success: false, error: 'No loan waiver details found', data: null };
      }

      return {
        success: true,
        data: {
          header,
          components
        }
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in getLoanWaiverDetails:`, error);
      return {
        success: false,
        error: error.message || 'Failed to fetch loan waiver details',
        data: null
      };
    }
  }

  /**
   * Generate Loan Waiver Transactions
   * Calls p_GetLoanWaiverPostTrx
   */
  async function generateLoanWaiver(branchId, accountId, loanSeries, components) {
    try {
      console.log(`[${SERVICE_NAME}] Generating loan waiver for:`, { branchId, accountId, loanSeries });

      const componentsXml = buildComponentsXml(components);

      const requestData = {
        OurBranchID: branchId || getSessionBranchId(),
        AccountID: accountId,
        LoanSeries: loanSeries || '',
        OperatorID: getOperatorId(),
        WFComponents: componentsXml
      };

      const envelope = CoreApi.makeRequestEnvelope('p_GetLoanWaiverPostTrx', requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (!response.success) {
        return {
          success: false,
          error: response.error || response.message || 'Failed to generate loan waiver transactions',
          data: null
        };
      }

      // Extract transactions from response - they are in Details array
      const transactions = response.data?.Details || response.Details || [];

      return {
        success: true,
        data: {
          transactions
        }
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in generateLoanWaiver:`, error);
      return {
        success: false,
        error: error.message || 'Failed to generate loan waiver transactions',
        data: null
      };
    }
  }

  /**
   * Save Loan Waiver
   * Calls p_AddLoanWaiverPostTrx
   */
  async function saveLoanWaiver(branchId, accountId, loanSeries, header, components, transactions, remarks, createdBy) {
    try {
      console.log(`[${SERVICE_NAME}] Saving loan waiver:`, { branchId, accountId, loanSeries });

      const componentsXml = buildComponentsXml(components);
      const transactionsXml = buildTransactionsXml(transactions);
      const headerXml = buildHeaderXml(header, remarks, createdBy || getOperatorId(), getOperatorId());

      // DetailRecords - just the transactions XML directly (no wrapper)
      const detailRecordsValue = transactionsXml;
      
      // Build DetailsWaiver with components + header (with DetailRecords nested as escaped XML)
      const headerWithDetails = headerXml.replace(
        '</dt_BHSLoanWaiver>',
        `<DetailRecords>${transactionsXml.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</DetailRecords></dt_BHSLoanWaiver>`
      );

      const requestData = {
        OurBranchID: branchId || getSessionBranchId(),
        AccountID: accountId,
        LoanSeries: loanSeries || '',
        Remarks: remarks || '',
        DetailRecords: detailRecordsValue,
        DetailsWaiver: `${componentsXml}${headerWithDetails}`,
        CreatedBy: createdBy || getOperatorId(),
        CreatedOn: null,
        ModifiedBy: getOperatorId(),
        ModifiedOn: null,
        SupervisedBy: null,
        SupervisedOn: null
      };

      const envelope = CoreApi.makeRequestEnvelope('p_AddLoanWaiverPostTrx', requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (!response.success) {
        return {
          success: false,
          error: response.error || response.message || 'Failed to save loan waiver',
          data: null
        };
      }

      return {
        success: true,
        message: response.message || 'Loan waiver saved successfully',
        data: response.data || response.Details || {}
      };
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error in saveLoanWaiver:`, error);
      return {
        success: false,
        error: error.message || 'Failed to save loan waiver',
        data: null
      };
    }
  }

  /**
   * Check user rights for loan waiver operation
   * Calls p_LoanWaiver_CheckUserRights or similar stored procedure
   * @param {string} mode - Operation mode ('ADD', 'EDIT', etc.)
   * @param {string} branchId - Branch ID
   * @param {string} accountId - Account ID
   * @param {string} loanSeries - Loan Series
   */
  async function checkUserRights(mode, branchId, accountId, loanSeries) {
    try {
      console.log(`[${SERVICE_NAME}] Checking user rights for mode: ${mode}`);
      
      const requestData = {
        OperatorID: getOperatorId(),
        ModuleID: MODULE_ID,
        Mode: mode,
        BranchID: branchId || '',
        AccountID: accountId || '',
        LoanSeries: loanSeries || ''
      };

      const envelope = CoreApi.makeRequestEnvelope('p_LoanWaiver_CheckUserRights', requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (!response.success) {
        return {
          success: false,
          message: response.error || response.message || 'User rights check failed',
          data: null
        };
      }

      // Parse the response to check if supervised
      const isSupervised = response.data?.IsSupervised === 'true' || 
                          response.data?.IsSupervised === true ||
                          response.Details?.IsSupervised === 'true' ||
                          response.Details?.IsSupervised === true;

      return {
        success: true,
        message: 'User rights verified',
        data: {
          isSupervised: isSupervised,
          ...response.data
        }
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
  const LoanWaiverService = {
    getLoanWaiverDetails,
    generateLoanWaiver,
    saveLoanWaiver,
    checkUserRights,
    searchBranches,
    searchClients,
    searchAccounts
  };

  global.LoanWaiverService = LoanWaiverService;
  console.log(`[${SERVICE_NAME}] Service registered successfully`);

})(window);
