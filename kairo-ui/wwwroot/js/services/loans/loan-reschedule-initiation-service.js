(function (global) {
  const CoreApi = global.CoreApi;
  const SearchService = global.SearchService;
  const Environment = global.Environment || {};

  const BASE_URL = (Environment.baseUrlLoans || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
  const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;

  /**
   * LoanRescheduleInitiationService
   * Service for Loan Reschedule Initiation operations
   * Implements all database calls with field mapping
   */
  const LoanRescheduleInitiationService = {
    
    /**
     * ============ DATABASE CALL #1: SEARCH BY BRANCH ID ============
     * exec dbo.p_GetSearchResult @TableID='BranchID',...
     * Returns: OurBranchID, BranchName, CurrencyID
     * Maps to fields: BranchID, BranchName
     */
    async searchBranchID(branchID, operatorID, moduleID, ourBranchID) {
      try {
        const whereStmt = branchID ? `OurBranchID LIKE '%${branchID}%'` : '';
        const payload = {
          TableID: 'BranchID',
          WhereStmt: whereStmt,
          PrevOrNext: '1',
          RefID: '',
          OperatorID: operatorID || 'web_portal',
          ModuleID: moduleID || '4300',
          OurBranchID: ourBranchID || '',
          AdvFilterString: '',
          SearchKey: ''
        };
        
        const result = await SearchService.search(payload);
        
        // Map response to field values
        if (result && result.data && result.data.length > 0) {
          return result.data.map(item => ({
            BranchID: item.OurBranchID,
            BranchName: item.BranchName,
            CurrencyID: item.CurrencyID
          }));
        }
        return [];
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] searchBranchID failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #2: SEARCH BY CLIENT ID ============
     * exec p_GetSearchResult @TableID='ClientAccountID',...
     * Returns: ClientID, ClientName
     * Maps to fields: ClientID, ClientName
     */
    async searchClientID(clientID, operatorID, moduleID, ourBranchID) {
      try {
        const whereStmt = clientID ? `ClientID LIKE '%${clientID}%'` : '';
        const advFilterString = `ProductTypeID='LN' AND OurBranchID='${ourBranchID}'`;
        
        const payload = {
          TableID: 'ClientAccountID',
          WhereStmt: whereStmt,
          PrevOrNext: '0',
          RefID: '',
          OperatorID: operatorID,
          ModuleID: moduleID || '4400',
          OurBranchID: ourBranchID,
          AdvFilterString: advFilterString,
          SearchKey: '',
          LanguageID: 'en'
        };
        
        const result = await SearchService.search(payload);
        
        // Map response to field values
        if (result && result.data && result.data.length > 0) {
          return result.data.map(item => ({
            ClientID: item.ClientID,
            ClientName: item.ClientName
          }));
        }
        return [];
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] searchClientID failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #3: SEARCH BY ACCOUNT ID ============
     * exec p_GetSearchResult @TableID='LoanID',...
     * Returns: AccountID, Name, LoanSeries, ApplicationID
     * Maps to fields: AccountID, AccountName, LoanSeries
     */
    async searchAccountID(accountID, operatorID, moduleID, ourBranchID) {
      try {
        const whereStmt = accountID ? `AccountID LIKE '%${accountID}%'` : '';
        const advFilterString = `OurBranchID='${ourBranchID}' AND LoanStatusID IN('A','N')`;
        
        const payload = {
          TableID: 'LoanID',
          WhereStmt: whereStmt,
          PrevOrNext: '0',
          RefID: '',
          OperatorID: operatorID,
          ModuleID: moduleID || '4400',
          OurBranchID: ourBranchID,
          AdvFilterString: advFilterString,
          SearchKey: '',
          LanguageID: 'en'
        };
        
        const result = await SearchService.search(payload);
        
        // Map response to field values
        if (result && result.data && result.data.length > 0) {
          return result.data.map(item => ({
            AccountID: item.AccountID,
            AccountName: item.Name,
            LoanSeries: item.LoanSeries,
            ApplicationID: item.ApplicationID
          }));
        }
        return [];
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] searchAccountID failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #4: VIEW/INITIAL LOAD ============
     * exec p_GetLoanRescheduleDetails @OurBranchID, @AccountID, @OperatorID
     * Returns: Details, Details01, Details02, Details03, Details04
     * Maps to all form fields
     */
    async getLoanRescheduleDetails(ourBranchID, accountID, operatorID) {
      try {
        const payload = {
          OurBranchID: ourBranchID,
          AccountID: accountID,
          OperatorID: operatorID
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_GetLoanRescheduleDetails', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        // Map response data to form fields
        const mapped = this.mapLoanRescheduleDetailsResponse(result);
        return mapped;
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] getLoanRescheduleDetails failed:', error);
        throw error;
      }
    },

    /**
     * Map Details response to form fields
     */
    mapLoanRescheduleDetailsResponse(response) {
      const data = response?.data || response;
      
      // Details01: Main reschedule info
      const mainData = (data.Details01 && data.Details01.length > 0) ? data.Details01[0] : {};
      
      // Details02: Loan details
      const loanData = (data.Details02 && data.Details02.length > 0) ? data.Details02[0] : {};
      
      // Details04: Business rules
      const rulesData = (data.Details04 && data.Details04.length > 0) ? data.Details04[0] : {};
      
      return {
        // Top Identifiers
        BranchID: mainData.OurBranchID,
        BranchName: mainData.BranchName,
        ClientID: mainData.ClientID,
        ClientName: mainData.ClientName,
        AccountID: mainData.AccountID,
        AccountName: mainData.AccountName,
        LoanSeries: mainData.LoanSeries,
        
        // Reschedule Parameters
        RescheduleBy: '', // To be set via dropdown
        ChangeTerm: mainData.IsChangeTerm === true || mainData.IsChangeTerm === 1,
        ChangeRate: mainData.IsRateofIntChange === true || mainData.IsRateofIntChange === 1,
        ProposedInterestRate: mainData.ProposedInterestRate,
        FromInstallmentNo: mainData.FromInstNo,
        PostponeOverdue: mainData.IsPostponeDueInst === true || mainData.IsPostponeDueInst === 1,
        RescheduleStartDate: mainData.RescheduleStartDate,
        WithBreakPeriod: mainData.IsBrokenPeriod === true || mainData.IsBrokenPeriod === 1,
        BreakTermMonths: mainData.BrokenTerm,
        CollectInterestDuringBreak: mainData.CollectInterestduringBreakPeriod === true || mainData.CollectInterestduringBreakPeriod === 1,
        RescheduleTermType: mainData.TermExtendReduceID,
        Term: mainData.ExtRedTerm,
        ProposedTerm: mainData.ProposedTerm,
        RepaymentFrequency: mainData.RepaymentFrequencyID,
        PayInterest: false,
        PayPenalty: false,
        
        // Behind The Scene
        LoanAmount: loanData.LoanAmount,
        OutstandingPrincipal: loanData.OutstandingPrincipal,
        TotalTerm: loanData.TotalTerm,
        ProductID: loanData.ProductID,
        OverduePrincipal: loanData.OverDuePrincipal,
        BalanceTerm: loanData.BalanceTerm,
        MaturityDate: loanData.MaturityDate,
        OverdueInterest: loanData.OverDueInterest,
        
        // Business Rules
        CanExtTermOnReschedule: rulesData.CanExtTermOnReschedule,
        MaxExtendableTerm: rulesData.MaxExtendableTerm,
        MaxBreakPeriod: rulesData.MaxBreakPeriod,
        AllowIntWaiver: rulesData.AllowIntWaiver,
        AllowInstPostpone: rulesData.AllowInstPostpone,
        
        // Component data
        componentDetails: data.Details || []
      };
    },

    /**
     * ============ DATABASE CALL #5: PROCEED CLICK ============
     * exec p_GetLoanRescheduleComp @OurBranchID, @AccountID, @LoanSeries, @OperatorID
     * Returns: Details (component list with ActualAmount, ProposedAmount)
     * Maps to: Component Editor grid
     */
    async getLoanRescheduleComponents(ourBranchID, accountID, loanSeries, operatorID) {
      try {
        const payload = {
          OurBranchID: ourBranchID,
          AccountID: accountID,
          LoanSeries: loanSeries,
          OperatorID: operatorID
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_GetLoanRescheduleComp', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        // Map component details
        const components = (result?.data?.Details || result?.Details || []).map(item => ({
          SLNo: item.SLNo,
          ComponentID: item.ComponentID,
          Component: item.Component,
          ActualAmount: item.ActualAmount,
          ProposedAmount: item.ProposedAmount,
          IsEditable: item.IsEditable
        }));
        
        return components;
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] getLoanRescheduleComponents failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #6: INSTALLMENT SCHEDULE ============
     * exec p_GetLoanInstallments @OurBranchID, @AccountID, @LoanSeries
     * Returns: Details (installment schedule array)
     * Maps to: Installment schedule table/modal
     */
    async getLoanInstallments(ourBranchID, accountID, loanSeries) {
      try {
        const payload = {
          OurBranchID: ourBranchID,
          AccountID: accountID,
          LoanSeries: loanSeries
        };
        
        console.log("[getLoanInstallments] Payload:", payload);
        
        const envelope = CoreApi.makeRequestEnvelope('p_GetLoanInstallments', payload);
        console.log("[getLoanInstallments] Envelope:", envelope);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        // Map installment details
        const installments = (result?.data?.Details || result?.Details || []).map(item => ({
          InstallmentNo: item.InstallmentNo,
          InstallmentDueDate: item.InstallmentDueDate,
          LoanBalance: item.LoanBalance,
          PrincipalBalance: item.PrincipalBalance,
          InstallmentAmount: item.InstallmentAmount,
          PrincipalDue: item.PrincipalDue,
          InterestRate: item.InterestRate,
          InterestDue: item.InterestDue,
          ExpectedInterest: item.ExpectedInterest,
          PaidStatus: item.PaidStatus
        }));
        
        return installments;
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] getLoanInstallments failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #7: PAYMENT DETAILS ============
     * exec p_GetLoanRepaymentDetail @OurBranchID, @AccountID, @LoanSeries, @OperatorID
     * Returns: Details (payment details array)
     * Maps to: Payment details modal/table
     */
    async getLoanRepaymentDetail(ourBranchID, accountID, loanSeries, operatorID) {
      try {
        const payload = {
          OurBranchID: ourBranchID,
          AccountID: accountID,
          LoanSeries: loanSeries,
          OperatorID: operatorID
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_GetLoanRepaymentDetail', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        // Return repayment details
        const repaymentDetails = result?.data?.Details || result?.Details || [];
        return repaymentDetails;
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] getLoanRepaymentDetail failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #8: GENERATE NEW SCHEDULE ============
     * exec p_GenerateLoanReschInstallment with multiple parameters
     * Returns: Generated installment schedule
     * Maps to: New schedule preview/confirmation
     */
    async generateLoanRescheduleInstallments(params) {
      try {
        const payload = {
          OurBranchID: params.ourBranchID,
          AccountID: params.accountID,
          LoanSeries: params.loanSeries,
          Amount: params.amount,
          InterestRate: params.interestRate,
          PeriodTypeID: params.periodTypeID || 'M',
          InstallmentFrequencyID: params.installmentFrequencyID || 'Y',
          Term: params.term,
          InstallmentStartDate: params.installmentStartDate,
          CreatedBy: params.operatorID,
          CreatedOn: null,
          LoanDisbDate: params.loanDisbDate,
          StartInstallmentNo: params.startInstallmentNo,
          GracePeriodReschedule: params.gracePeriod || '0',
          CollectInterestDuringBreakPeriod: params.collectInterestDuringBreak || 'false'
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_GenerateLoanReschInstallment', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        return result?.data || result;
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] generateLoanRescheduleInstallments failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #9: SAVE LOAN RESCHEDULE ============
     * exec p_AddEditLoanReschedule with XML detail records
     * Saves complete loan reschedule with all parameters
     */
    async saveLoanReschedule(rescheduleData) {
      try {
        // Build XML for DetailRecords
        const xmlDetails = this.buildDetailRecordsXML(rescheduleData.components || []);
        
        const payload = {
          OurBranchID: rescheduleData.ourBranchID,
          ClientID: rescheduleData.clientID,
          AccountID: rescheduleData.accountID,
          LoanSeries: rescheduleData.loanSeries,
          IsChangeTerm: rescheduleData.isChangeTerm ? 1 : 0,
          IsRateofIntChange: rescheduleData.isRateofIntChange ? 1 : 0,
          ProposedInterestRate: rescheduleData.proposedInterestRate || null,
          FromInstNo: rescheduleData.fromInstNo,
          IsPostponeDueInst: rescheduleData.isPostponeDueInst ? 1 : 0,
          IsBrokenPeriod: rescheduleData.isBrokenPeriod ? 1 : 0,
          BrokenTerm: rescheduleData.brokenTerm || null,
          TermExtendReduceID: rescheduleData.termExtendReduceID,
          ExtRedTerm: rescheduleData.extRedTerm,
          RescheduleStartDate: rescheduleData.rescheduleStartDate,
          ProposedTerm: rescheduleData.proposedTerm,
          RescheduleStatusID: rescheduleData.rescheduleStatusID || 'RP',
          CreatedBy: rescheduleData.operatorID,
          CreatedOn: null,
          ModifiedBy: rescheduleData.modifiedBy || null,
          ModifiedOn: rescheduleData.modifiedOn || null,
          SupervisedBy: rescheduleData.supervisedBy || null,
          SupervisedOn: rescheduleData.supervisedOn || null,
          DetailRecords: xmlDetails,
          UpdateCount: rescheduleData.updateCount || 1,
          CollectInterestduringBreakPeriod: rescheduleData.collectInterestDuringBreak ? 1 : 0,
          RepaymentFrequencyID: rescheduleData.repaymentFrequencyID
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_AddEditLoanReschedule', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        return result;
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] saveLoanReschedule failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #6: GET LOAN INSTALLMENTS ============
     * exec p_GetLoanInstallments @OurBranchID, @AccountID, @LoanSeries
     * Returns: Array of installment schedule records
     */
    async getLoanInstallments(ourBranchID, accountID, loanSeries) {
      try {
        const payload = {
          our_branch_id: ourBranchID,
          account_id: accountID,
          loan_series: parseInt(loanSeries) || 0
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_GetLoanInstallments', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        // Extract Details array from response
        if (result && result.Details && Array.isArray(result.Details)) {
          return result.Details;
        }
        return [];
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] getLoanInstallments failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #7: GET LOAN REPAYMENT DETAIL ============
     * exec p_GetLoanRepaymentDetail @OurBranchID, @AccountID, @LoanSeries, @OperatorID
     * Returns: Array of repayment detail records
     */
    async getLoanRepaymentDetail(ourBranchID, accountID, loanSeries, operatorID) {
      try {
        const payload = {
          our_branch_id: ourBranchID,
          account_id: accountID,
          loan_series: parseInt(loanSeries) || 0,
          operator_id: operatorID || 'web_portal'
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_GetLoanRepaymentDetail', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        // Extract Details array from response
        if (result && result.Details && Array.isArray(result.Details)) {
          return result.Details;
        }
        return [];
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] getLoanRepaymentDetail failed:', error);
        throw error;
      }
    },

    /**
     * ============ DATABASE CALL #8: GENERATE LOAN RESCHEDULE INSTALLMENT ============
     * exec p_GenerateLoanReschInstallment @OurBranchID, @AccountID, @LoanSeries, @Amount, @InterestRate, etc.
     * Returns: Array of generated installment schedule records
     */
    async generateLoanRescheduleInstallment(params) {
      try {
        const payload = {
          OurBranchID: params.ourBranchID,
          AccountID: params.accountID,
          LoanSeries: parseInt(params.loanSeries) || 0,
          Amount: parseFloat(params.amount) || 0,
          InterestRate: parseFloat(params.interestRate) || 0,
          PeriodTypeID: params.periodTypeID || 'M',
          InstallmentFrequencyID: params.installmentFrequencyID || 'M',
          Term: parseInt(params.term) || 0,
          InstallmentStartDate: params.installmentStartDate || null,
          CreatedBy: params.createdBy || 'web_portal',
          CreatedOn: null,
          LoanDisbDate: params.loanDisbDate || null,
          StartInstallmentNo: parseInt(params.startInstallmentNo) || 1,
          GracePeriodReschedule: params.gracePeriodReschedule || '0',
          CollectInterestDuringBreakPeriod: params.collectInterestDuringBreakPeriod || 'false'
        };
        
        const envelope = CoreApi.makeRequestEnvelope('p_GenerateLoanReschInstallment', payload);
        const result = await CoreApi.post(LOANS_ENDPOINT, envelope);
        
        // Extract Details array from response
        if (result && result.Details && Array.isArray(result.Details)) {
          return result.Details;
        }
        return [];
      } catch (error) {
        console.error('[LoanRescheduleInitiationService] generateLoanRescheduleInstallment failed:', error);
        throw error;
      }
    },

    /**
     * Build XML structure for detail records
     */
    buildDetailRecordsXML(components) {
      if (!components || components.length === 0) {
        return `<dt_LoanInitiationGridDetails></dt_LoanInitiationGridDetails>`;
      }
      
      const componentXML = components.map((comp, index) => `
        <dt_LoanInitiationGridDetails>
          <SLNo>${index + 1}</SLNo>
          <ComponentID>${comp.ComponentID || ''}</ComponentID>
          <Component>${comp.Component || ''}</Component>
          <ActualAmount>${comp.ActualAmount || 0}</ActualAmount>
          <ProposedAmount>${comp.ProposedAmount || 0}</ProposedAmount>
          <IsEditable>${comp.IsEditable === true ? 'true' : 'false'}</IsEditable>
          <DS_LoanInitiationDetail_Id>0</DS_LoanInitiationDetail_Id>
        </dt_LoanInitiationGridDetails>
      `).join('');
      
      return `<root>${componentXML}</root>`;
    }
  };

  global.LoanRescheduleInitiationService = LoanRescheduleInitiationService;
})(window);
