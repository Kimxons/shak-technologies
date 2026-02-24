/**
 * Legal Remarks Service
 * Handles all API calls for Loan Legal Remarks functionality
 * Uses stored procedures: p_GetNPALegalRemark, p_AddEditLoanLegalRemark
 */

(function (global) {
  'use strict';

  const SERVICE_NAME = 'LegalRemarksService';
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const ENDPOINT = `${BASE_URL}/api/OldAPI`;

  console.log(`[${SERVICE_NAME}] Initializing service with endpoint:`, ENDPOINT);

  /**
   * Get Legal Remarks for a specific loan
   * Calls: exec p_GetNPALegalRemark @OurbranchID, @AccountID, @LoanSeries
   * @param {Object} params - { OurBranchID, AccountID, LoanSeries }
   * @returns {Promise<Object>} Response with legal remarks data
   */
  async function getLegalRemarks(params) {
    try {
      console.log(`[${SERVICE_NAME}] Getting legal remarks:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_GetNPALegalRemark';
      const requestData = {
        OurbranchID: params.OurBranchID,
        AccountID: params.AccountID,
        LoanSeries: params.LoanSeries
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Legal remarks loaded successfully:`, response);
        return {
          success: true,
          data: response.data || response.Details || [],
          Details: response.Details || response.data || []
        };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to load legal remarks:`, response);
        return { 
          success: false, 
          data: [], 
          Details: [],
          message: response?.message || 'Failed to load legal remarks' 
        };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error loading legal remarks:`, error);
      return { success: false, data: [], Details: [], message: error.message };
    }
  }

  /**
   * Save or Update Legal Remark
   * Calls: exec p_AddEditLoanLegalRemark @OurbranchID, @AccountID, @LoanSeries, @RemarkDate, @Remarks, @CreatedBy, @RowID
   * @param {Object} remarkData - Legal remark data to save
   * @returns {Promise<Object>} Response with save result
   */
  async function saveLegalRemark(remarkData) {
    try {
      console.log(`[${SERVICE_NAME}] Saving legal remark:`, remarkData);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_AddEditLoanLegalRemark';
      const requestData = {
        OurbranchID: remarkData.OurBranchID,
        AccountID: remarkData.AccountID,
        LoanSeries: parseInt(remarkData.LoanSeries) || 0,
        RemarkDate: remarkData.RemarkDate,
        Remarks: remarkData.Remarks,
        CreatedBy: remarkData.OperatorID || remarkData.CreatedBy,
        RowID: remarkData.RowID || 0
      };

      console.log(`[${SERVICE_NAME}] Calling p_AddEditLoanLegalRemark with:`, requestData);

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Legal remark saved successfully:`, response);
        return { success: true, message: 'Record saved successfully' };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to save legal remark:`, response);
        return { success: false, message: response?.message || 'Failed to save legal remark' };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error saving legal remark:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Delete Legal Remark (uses save with empty remark or separate delete proc if available)
   * @param {Object} params - { RowID, OurBranchID, AccountID, LoanSeries }
   * @returns {Promise<Object>} Response with delete result
   */
  async function deleteLegalRemark(params) {
    try {
      console.log(`[${SERVICE_NAME}] Deleting legal remark:`, params);

      if (!CoreApi) {
        throw new Error('CoreApi not available');
      }

      const formId = 'dbo.p_AddEditLoanLegalRemark';
      const requestData = {
        OurbranchID: params.OurBranchID,
        AccountID: params.AccountID,
        LoanSeries: parseInt(params.LoanSeries) || 0,
        RemarkDate: null,
        Remarks: '',
        CreatedBy: params.OperatorID,
        RowID: params.RowID
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(ENDPOINT, envelope);

      if (response && response.success) {
        console.log(`[${SERVICE_NAME}] Legal remark deleted successfully`);
        return { success: true, message: 'Record deleted successfully' };
      } else {
        console.warn(`[${SERVICE_NAME}] Failed to delete legal remark:`, response);
        return { success: false, message: response?.message || 'Failed to delete legal remark' };
      }
    } catch (error) {
      console.error(`[${SERVICE_NAME}] Error deleting legal remark:`, error);
      return { success: false, message: error.message };
    }
  }

  // Export service to global scope
  global.LegalRemarksService = {
    getLegalRemarks,
    saveLegalRemark,
    deleteLegalRemark
  };

  console.log(`[${SERVICE_NAME}] Service initialized and exported to window.LegalRemarksService`);

})(window);
