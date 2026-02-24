// Loan Approvals Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const LoanApprovalsService = {
    /**
     * Get workflow loan approvals data
     * @param {Object} requestData - Request parameters for fetching loan approval data
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.LogInBranchID - Login Branch ID
     * @param {string} requestData.ApplicationID - Application ID
     * @param {number} requestData.RefNo - Reference number (smallint)
     * @param {string} requestData.OperatorID - Operator ID
     * @param {number} requestData.Direction - Direction (smallint) - 1 for next, -1 for previous
     * @returns {Promise<Object>} Normalized response with loan approval data (Details, Details01, Details02, Details03)
     */
    async getWFLoanApprovals(requestData) {
      console.group('🔵 LoanApprovalsService.getWFLoanAppraisals');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      // Note: SP name is p_GetWFLoanAppraisals (with 's')
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanAppraisals", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Add or Edit workflow loan application
     * @param {Object} requestData - Loan application details with all required fields
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.ApplicationID - Application ID
     * @param {string} requestData.ApplicationDate - Application date (smalldatetime)
     * @param {string} requestData.WFAdvTypeID - Workflow advance type ID
     * @param {boolean} requestData.IsExistingClient - Is existing client (bit)
     * @param {string} requestData.ClientID - Client ID
     * @param {string} requestData.ProductID - Product ID
     * @param {string} requestData.RepaymentAccountID - Repayment account ID
     * @param {string} requestData.PurposeCodeID - Purpose code ID
     * @param {string} requestData.CreditOfficerID - Credit officer ID
     * @param {string} requestData.SalesOfficerID - Sales officer ID
     * @param {number} requestData.LoanAmount - Loan amount
     * @param {number} requestData.LoanTerm - Loan term (smallint)
     * @param {string} requestData.LoanPeriodID - Loan period ID
     * @param {string} requestData.DisbursementDate - Disbursement date (smalldatetime)
     * @param {string} requestData.BusinessLineID - Business line ID
     * @param {string} requestData.AccountClassID - Account class ID
     * @param {string} requestData.FileNumber - File number
     * @param {number} requestData.InterestRate - Interest rate
     * @param {string} requestData.BusinessDetails - Business details
     * @param {number} requestData.CommissionRate - Commission rate
     * @param {number} requestData.TaxRate - Tax rate
     * @param {number} requestData.EffectiveRate - Effective rate
     * @param {number} requestData.Penalty - Penalty amount
     * @param {string} requestData.CreatedBy - Created by operator ID
     * @param {string} requestData.CreatedOn - Created on date (smalldatetime)
     * @param {string} requestData.ModifiedBy - Modified by operator ID
     * @param {string} requestData.ModifiedOn - Modified on date (smalldatetime)
     * @param {string} requestData.LoanTypeID - Loan type ID
     * @param {number} requestData.UpdateCount - Update count (tinyint)
     * @param {number} requestData.ProductEffective - Product effective rate
     * @param {string} requestData.DonorID - Donor ID
     * @param {string} requestData.GroupID - Group ID
     * @param {string} requestData.SubGroupID - Sub group ID
     * @param {string} requestData.LoanSchemeID - Loan scheme ID
     * @param {boolean} requestData.IsOutPutRequired - Is output required (bit)
     * @returns {Promise<Object>} Normalized response
     */
    async addEditLoanApplication(requestData) {
      console.group('🔵 LoanApprovalsService.addEditLoanApplication');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditWFLoanApplications", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Approve a loan application
     * @param {Object} requestData - Approval details
     * @returns {Promise<Object>} Normalized response
     */
    async approveLoanApplication(requestData) {
      console.group('🔵 LoanApprovalsService.approveLoanApplication');
      console.log('📤 Request Data:', requestData);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_ApproveLoanApplication", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Reject a loan application
     * @param {Object} requestData - Rejection details
     * @returns {Promise<Object>} Normalized response
     */
    async rejectLoanApplication(requestData) {
      console.group('🔵 LoanApprovalsService.rejectLoanApplication');
      console.log('📤 Request Data:', requestData);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_RejectLoanApplication", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Edit/Save workflow loan appraisals
     * @param {Object} requestData - Appraisal details
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.ApplicationID - Application ID
     * @param {number} requestData.RefNo - Reference number (smallint)
     * @param {boolean} requestData.CreateNewAccount - Create new account flag (bit)
     * @param {string} requestData.ExistingAccountID - Existing account ID
     * @param {number} requestData.LoanAmount - Loan amount
     * @param {number} requestData.MarkingRate - Marking rate
     * @param {string} requestData.MarkingRateSign - Marking rate sign (+/-)
     * @param {number} requestData.InterestRate - Interest rate
     * @param {number} requestData.Penalty - Penalty rate
     * @param {string} requestData.PenaltySpreadSign - Penalty spread sign (+/-)
     * @param {number} requestData.PenaltySpread - Penalty spread rate
     * @param {number} requestData.GracePeriod - Grace period (smallint)
     * @param {number} requestData.Term - Term (smallint)
     * @param {number} requestData.RepaymentTerm - Repayment term (smallint)
     * @param {string} requestData.RepaymentFrequencyID - Repayment frequency ID
     * @param {string} requestData.AccountClassID - Account class ID
     * @param {string} requestData.Remarks - Remarks
     * @param {string} requestData.AppraisedBy - Appraised by operator ID
     * @param {string} requestData.AppraisedOn - Appraised on date (smalldatetime)
     * @param {number} requestData.AppraisedAmount - Appraised/Approved amount
     * @returns {Promise<Object>} Normalized response
     */
    async editWFLoanAppraisals(requestData) {
      console.group('🔵 LoanApprovalsService.editWFLoanAppraisals');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditWFLoanAppraisals", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    // ========== LOAN APPROVALS SPs (different from Appraisals) ==========

    /**
     * Get workflow loan approvals data (p_GetWFLoanApprovals)
     * @param {Object} requestData - Request parameters
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.LogInBranchID - Login Branch ID
     * @param {string} requestData.ApplicationID - Application ID
     * @param {number} requestData.RefNo - Reference number (smallint)
     * @param {string} requestData.OperatorID - Operator ID
     * @param {number} requestData.Direction - Direction (smallint) - 1 for next, -1 for previous
     * @returns {Promise<Object>} Normalized response
     */
    async getWFLoanApprovalsData(requestData) {
      console.group('🔵 LoanApprovalsService.getWFLoanApprovalsData');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanApprovals", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Edit/Save workflow loan approvals (p_EditWFLoanApprovals)
     * @param {Object} requestData - Approval edit details
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.ApplicationID - Application ID
     * @param {number} requestData.RefNo - Reference number (smallint)
     * @param {boolean} requestData.CreateNewAccount - Create new account flag (bit)
     * @param {string} requestData.ExistingAccountID - Existing account ID
     * @param {number} requestData.LoanAmount - Loan amount
     * @param {number} requestData.MarkingRate - Marking rate
     * @param {string} requestData.MarkingRateSign - Marking rate sign (+/-)
     * @param {number} requestData.InterestRate - Interest rate
     * @param {number} requestData.Penalty - Penalty rate
     * @param {string} requestData.PenaltySpreadSign - Penalty spread sign (+/-)
     * @param {number} requestData.PenaltySpread - Penalty spread rate
     * @param {number} requestData.GracePeriod - Grace period (smallint)
     * @param {number} requestData.Term - Term (smallint)
     * @param {number} requestData.RepaymentTerm - Repayment term (smallint)
     * @param {string} requestData.RepaymentFrequencyID - Repayment frequency ID
     * @param {string} requestData.AccountClassID - Account class ID
     * @param {string} requestData.Remarks - Remarks
     * @param {string} requestData.AppraisedBy - Appraised by operator ID
     * @param {string} requestData.AppraisedOn - Appraised on date (smalldatetime)
     * @param {number} requestData.AppraisedAmount - Appraised/Approved amount
     * @returns {Promise<Object>} Normalized response
     */
    async editWFLoanApprovals(requestData) {
      console.group('🔵 LoanApprovalsService.editWFLoanApprovals');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_EditWFLoanApprovals", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Reject workflow loan approvals (p_RejectWFLoanApprovals)
     * @param {Object} requestData - Rejection details
     * @param {string} requestData.OurBranchID - Branch ID
     * @param {string} requestData.ApplicationID - Application ID
     * @param {string} requestData.ModifiedBy - Modified by operator ID
     * @param {string} requestData.Remarks - Rejection remarks
     * @param {string} requestData.RejectedOn - Rejection date (smalldatetime)
     * @param {boolean} requestData.IsIndividual - Is individual loan (bit)
     * @param {string} requestData.TypeOfApplication - Type of application (char)
     * @param {boolean} requestData.IsReverseFee - Reverse fee flag (bit)
     * @returns {Promise<Object>} Normalized response
     */
    async rejectWFLoanApprovals(requestData) {
      console.group('🔵 LoanApprovalsService.rejectWFLoanApprovals');
      console.log('📤 Request Data:', requestData);
      console.log('🌐 API URL:', `${BASE_URL}/api/OldAPI`);
      
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_RejectWFLoanApprovals", requestData);
      console.log('📦 Request Envelope:', JSON.stringify(envelope, null, 2));
      
      try {
        const result = await CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        console.log('📥 Response:', result);
        console.groupEnd();
        return result;
      } catch (error) {
        console.error('❌ Error:', error);
        console.groupEnd();
        throw error;
      }
    }
  };

  global.LoanApprovalsService = LoanApprovalsService;
})(window);
