/**
 * Loan Utilization Service
 * Handles all API calls for Loan Utilization functionality
 * Uses stored procedures: p_GetLoanUtilization, p_AddEditLoanUtilization, p_GetSearchResult
 */

(function (global) {
  'use strict';

  const SERVICE_NAME = 'LoanUtilizationService';
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  console.log(`[${SERVICE_NAME}] Initializing service with endpoint:`, ENDPOINT);

  /**
   * Get Loan Utilization data
   * Calls: exec p_GetLoanUtilization @OurBranchID, @AccountID, @OperatorID
   * Returns: Details (general info), Details01 (account/loan info), Details02 (utilization records)
   * @param {Object} params - { OurBranchID, AccountID, OperatorID }
   * @returns {Promise<Object>} Response with utilization data
   */
  async function getLoanUtilization(params) {
    try {
      console.log(`[${SERVICE_NAME}] Getting loan utilization:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetLoanUtilization';
      const requestData = {
        OurBranchID: params.OurBranchID,
        AccountID: params.AccountID,
        OperatorID: params.OperatorID
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Loan utilization loaded successfully:`, response);
        
        // CoreApi normalizeResponse puts Details01/02 under response.data when multiple Details exist
        const responseData = response.data || response;
        
        return {
          success: true,
          Details: responseData.Details || response.Details || [],
          Details01: responseData.Details01 || response.Details01 || [],
          Details02: responseData.Details02 || response.Details02 || [],
          data: responseData.Details02 || response.Details02 || []
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to load loan utilization:`, response);
        return {
          success: false,
          Details: [],
          Details01: [],
          Details02: [],
          data: [],
          message: response?.message || 'Failed to load loan utilization'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error loading loan utilization:`, error);
      return {
        success: false,
        Details: [],
        Details01: [],
        Details02: [],
        data: [],
        message: error.message
      };
    }
  }

  /**
   * Save or Update Loan Utilization records
   * Calls: exec p_AddEditLoanUtilization @OurBranchID, @AccountID, @LoanSeries, @OperatedBy, @OperatedOn, @SupervisedBy, @UpdateCount, @DetailRecords (XML)
   * @param {Object} params - Save parameters
   * @returns {Promise<Object>} Response with save result
   */
  async function saveLoanUtilization(params) {
    try {
      console.log(`[${SERVICE_NAME}] Saving loan utilization:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      // Build XML for DetailRecords from the utilization records array
      // Format: <dt_LoanUtilization><OurBranchID>...</OurBranchID><LoanSeries>...</LoanSeries>...<OurBranchID>...</OurBranchID>... (all rows sequential)
      // Helper function to handle null/undefined values - return empty space if null
      const safeValue = (val) => (val === null || val === undefined || val === '') ? ' ' : val;
      
      let xmlDetails = '<dt_LoanUtilization>';
      params.records.forEach(record => {
        xmlDetails += `<OurBranchID>${escapeXml(safeValue(record.OurBranchID))}</OurBranchID>`;
        xmlDetails += `<LoanSeries>${safeValue(record.LoanSeries)}</LoanSeries>`;
        xmlDetails += `<SLNo>${escapeXml(safeValue(record.SLNo))}</SLNo>`;
        xmlDetails += `<UtilizeDate>${safeValue(record.UtilizeDate)}</UtilizeDate>`;
        xmlDetails += `<UtilizeTypeID>${escapeXml(safeValue(record.UtilizeTypeID))}</UtilizeTypeID>`;
        xmlDetails += `<UtilizeType>${escapeXml(safeValue(record.UtilizeType))}</UtilizeType>`;
        xmlDetails += `<UtilizeAmount>${safeValue(record.UtilizeAmount)}</UtilizeAmount>`;
        xmlDetails += `<VerifiedBy>${escapeXml(safeValue(record.VerifiedBy))}</VerifiedBy>`;
        xmlDetails += `<Description>${escapeXml(safeValue(record.Description))}</Description>`;
        xmlDetails += `<OfficerName>${escapeXml(safeValue(record.OfficerName))}</OfficerName>`;
        xmlDetails += `<ButtonMark>${escapeXml(safeValue(record.ButtonMark) === ' ' ? 'N' : record.ButtonMark)}</ButtonMark>`;
        xmlDetails += `<OperatedBy>${escapeXml(safeValue(params.OperatedBy))}</OperatedBy>`;
      });
      xmlDetails += '</dt_LoanUtilization>';

      const formId = 'dbo.p_AddEditLoanUtilization';
      const requestData = {
        OurBranchID: params.OurBranchID,
        AccountID: params.AccountID,
        LoanSeries: parseInt(params.LoanSeries) || 0,
        OperatedBy: params.OperatedBy,
        OperatedOn: params.OperatedOn || '',
        SupervisedBy: params.SupervisedBy || '',
        UpdateCount: parseInt(params.UpdateCount) || 1,
        DetailRecords: xmlDetails
      };

      console.log(`[${SERVICE_NAME}] Calling p_AddEditLoanUtilization with:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Loan utilization saved successfully:`, response);
        return { success: true, message: 'Records saved successfully' };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to save loan utilization:`, response);
        return { success: false, message: response?.message || 'Failed to save loan utilization' };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error saving loan utilization:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Search for officers (VerifiedBy lookup)
   * Calls: exec p_GetSearchResult @TableID, @AdvFilterString, etc.
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Response with search results
   */
  async function searchOfficers(params) {
    try {
      console.log(`[${SERVICE_NAME}] Searching officers:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        WhereStmt: params.WhereStmt || '',
        TableID: params.TableID || 'ActiveOfficerID',
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: params.AdvFilterString || '',
        OperatorID: params.OperatorID,
        ModuleID: 4425,
        OurBranchID: params.OurBranchID,
        SearchKey: params.SearchKey || null,
        LanguageID: 'en'
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Officers search successful:`, response);
        return {
          success: true,
          data: response.data || response.Details || [],
          Details: response.Details || response.data || []
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Officers search failed:`, response);
        return {
          success: false,
          data: [],
          Details: [],
          message: response?.message || 'Search failed'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error searching officers:`, error);
      return { success: false, data: [], Details: [], message: error.message };
    }
  }

  /**
   * Get Code Values (for dropdowns like UtilizeTypeID)
   * Calls: p_GetSearchResult with appropriate filters
   * @param {Object} params - { CodeID, OurBranchID, OperatorID }
   * @returns {Promise<Object>} Response with code values
   */
  async function getCodeValues(params) {
    try {
      console.log(`[${SERVICE_NAME}] Loading code values for:`, params.CodeID);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetSearchResult';
      const requestData = {
        WhereStmt: '',
        TableID: params.CodeID || 'UtilizeTypeID',
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: '',
        OperatorID: params.OperatorID,
        ModuleID: 4425,
        OurBranchID: params.OurBranchID,
        SearchKey: null,
        LanguageID: 'en'
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Code values loaded successfully:`, response);
        return {
          success: true,
          data: response.data || response.Details || [],
          Details: response.Details || response.data || []
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to load code values:`, response);
        return {
          success: false,
          data: [],
          Details: [],
          message: response?.message || 'Failed to load code values'
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error loading code values:`, error);
      return { success: false, data: [], Details: [], message: error.message };
    }
  }

  /**
   * Escape XML special characters
   */
  function escapeXml(value) {
    if (!value) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Delete all Loan Utilization records for a loan
   * Calls: exec p_DeleteLoanUtilization @OurBranchID, @AccountID, @LoanSeries
   * @param {Object} params - { OurBranchID, AccountID, LoanSeries }
   * @returns {Promise<Object>} Response with delete result
   */
  async function deleteLoanUtilization(params) {
    try {
      console.log(`[${SERVICE_NAME}] Deleting loan utilization:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_DeleteLoanUtilization';
      const requestData = {
        OurBranchID: params.OurBranchID,
        AccountID: params.AccountID,
        LoanSeries: String(params.LoanSeries)
      };

      console.log(`[${SERVICE_NAME}] Calling p_DeleteLoanUtilization with:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Loan utilization deleted successfully:`, response);
        return { success: true, message: 'Record deleted successfully' };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to delete loan utilization:`, response);
        return { success: false, message: response?.message || 'Failed to delete loan utilization' };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error deleting loan utilization:`, error);
      return { success: false, message: error.message };
    }
  }

  // Export service to global scope
  global.LoanUtilizationService = {
    getLoanUtilization,
    saveLoanUtilization,
    deleteLoanUtilization,
    searchOfficers,
    getCodeValues
  };

  console.log(`[${SERVICE_NAME}] Service initialized and exported to window.LoanUtilizationService`);

})(window);
