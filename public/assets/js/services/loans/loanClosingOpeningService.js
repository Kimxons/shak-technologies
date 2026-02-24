/**
 * Loan Closing/Opening Service
 * Handles data loading, validation, and persistence for loan closing/opening operations
 */

(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

const loanClosingOpeningService = {
  /**
   * Get loan closing/opening details
   * Calls P_GetLoanAccountDetail stored procedure
   * @param {string} branchID - Branch ID
   * @param {string} accountID - Account ID
   * @param {number} loanSeries - Loan series number
   * @param {string} operatorID - Current operator ID
   */
  getDetails: async function (branchID, accountID, loanSeries, operatorID) {
    try {
      const formId = "dbo.P_GetLoanAccountDetail";
      const requestData = {
        OurBranchID: branchID,
        AccountID: accountID,
        LoanSeries: loanSeries,
        OperatorID: operatorID,
      };
      
      console.log('[Loan Closing/Opening Service] Calling stored procedure:', formId, requestData);
      
      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(LOANS_ENDPOINT, envelope);

      if (response && response.data && response.data.success !== false) {
        const result = response.data.Result || response.data;
        return {
          success: true,
          details: result.Details || [],
          closingDetails: result.Details01 || [],
        };
      }

      return {
        success: false,
        error: response?.data?.message || 'Failed to load closing/opening details',
      };
    } catch (error) {
      console.error('[Loan Closing/Opening Service] getDetails error:', error);
      return {
        success: false,
        error: error.message || 'Service error',
      };
    }
  },

  /**
   * Add/Update loan closing/opening record
   * Calls P_AddLoanAcClosingDetail stored procedure
   * @param {object} payload - Closing/opening data
   * @param {string} payload.branchID - Branch ID
   * @param {string} payload.accountID - Account ID
   * @param {number} payload.loanSeries - Loan series
   * @param {string} payload.remarks - Remarks (max 255 chars)
   * @param {string} payload.operatorID - Current operator ID
   * @param {string} payload.mode - 'EDIT' or 'ADD'
   * @param {string} payload.supervisorRemarks - Supervisor remarks (if supervised)
   * @param {number} payload.updateCount - Update count for versioning
   */
  saveClosingOpening: async function (payload) {
    try {
      // Validation
      if (!payload.remarks || payload.remarks.trim() === '') {
        return {
          success: false,
          error: 'Remarks are mandatory',
        };
      }

      if (payload.remarks.length > 255) {
        return {
          success: false,
          error: 'Remarks cannot exceed 255 characters',
        };
      }

      const formId = "dbo.P_AddLoanAcClosingDetail";
      const requestData = {
        OurBranchID: payload.branchID,
        AccountID: payload.accountID,
        LoanSeries: payload.loanSeries,
        Remarks: payload.remarks,
        OperatedBy: payload.operatorID,
      };

      const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
      const response = await CoreApi.post(LOANS_ENDPOINT, envelope);

      if (response && response.data) {
        const result = response.data.Result || response.data;
        return {
          success: result.success !== false,
          message: result.message || 'Record saved successfully',
          data: result,
        };
      }

      return {
        success: false,
        error: 'Failed to save closing/opening record',
      };
    } catch (error) {
      console.error('[Loan Closing/Opening Service] saveClosingOpening error:', error);
      return {
        success: false,
        error: error.message || 'Service error',
      };
    }
  },

  /**
   * Get user rights for loan closing/opening operations
   * @param {string} branchID - Branch ID
   * @param {string} accountID - Account ID
   * @param {number} loanSeries - Loan series
   * @param {string} mode - Operation mode
   * @param {number} updateCount - Update count
   */
  getUserRights: async function (branchID, accountID, loanSeries, mode, updateCount) {
    try {
      // For now, return default user rights
      // This can be enhanced with actual stored procedure call if needed
      return {
        success: true,
        isSupervised: false,
        data: {},
      };
    } catch (error) {
      console.error('[Loan Closing/Opening Service] getUserRights error:', error);
      return {
        success: false,
        isSupervised: false,
      };
    }
  },
};

  // Export to global scope
  global.loanClosingOpeningService = loanClosingOpeningService;
})(window);

