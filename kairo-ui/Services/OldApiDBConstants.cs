namespace kairo_ui.Services
{
    public static class OldApiDBConstants
    {

        public const string GET_SEARCHRESULT = "p_GetSearchResult";
        public const string GET_GROUP_LOAN_SCHEMES = "p_GetGroupLoanSchemes";
        public const string ADD_EDIT_GROUP_LOAN_SCHEMES = "p_AddEditGroupLoanSchemes";
        public const string DELETE_GROUP_LOAN_SCHEMES = "p_DeleteGroupLoanSchemes";
        public const string GET_GROUP_LOAN_MENU = "p_GetGroupLoanMenu";
        public const string ADD_EDIT_GROUP_LOAN_MENU = "p_AddEditGroupLoanMenu";
        public const string DELETE_GROUP_LOAN_MENU = "p_DeleteGroupLoanMenu";
        public const string GET_INTEREST_MENU_COMBO = "p_getInterestmenucombo";
        public const string GET_GROUP_LOAN_SCHEME_PRODUCTS = "p_GetGroupLoanSchemeProducts";
        public const string ADD_EDIT_GROUP_LOAN_SCHEME_PRODUCTS = "p_AddEditGroupLoanSchemeProducts";
        public const string GETACCOUNTOFFICERDETAILS = "p_GetAccountOfficerDetail";

        // Branch
        public const string GET_BRANCH_LIST = "dbo.p_getBranchList";

        // Client Approval / Workflow
        public const string GET_GROUP_CLIENT_APPROVAL = "p_GetGroupClientApproval";
        public const string GROUP_CLIENT_APPROVAL = "p_GroupClientApproval";
        public const string GROUP_CLIENT_REJECT = "p_GroupClientReject";
        public const string GET_WF_DATA_CHECK_FIELDS = "p_GetWFDataCheckFields";
        public const string ADD_CLIENT_SUPERVISION_DATA = "dbo.p_AddClientSupervisionData";

        public const string GET_CLIENT = "p_V8_GetClientBasicDetails";
        public const string GET_CLIENT_INDIVIDUAL = "p_V8_GetClientIndividual";
        public const string GET_CLIENT_CORPORATE = "p_V8_GetClientCorporate";
        public const string GET_CLIENT_ADDRESS = "p_V8_GetClientAddress";
        public const string GET_CLIENT_EMPLOYMENT = "p_V8_GetClientEmployment";
        public const string GET_CLIENT_INDIVIDUAL_IMAGE = "p_GetClientPhotoIDSignIDBioID";
        public const string GET_CLIENT_IMAGES = "p_V8_GetImages";

        public const string GET_CLIENT_SUPERVISION_PENDING = "p_getclientsupervisionpending";
        public const string APPROVE_CLIENT_SUPERVISION = "p_ClientApproveSupervision";
        public const string REJECT_CLIENT_SUPERVISION = "p_ClientRejectSupervision";

        // Client Maintenance Module Constants
        public const string GET_CLIENT_BANK_ACCOUNTS = "p_GetClientBankAccounts";
        public const string ADD_EDIT_CLIENT_BANK_ACCOUNT = "p_AddEditClientBankAccount";
        public const string DELETE_CLIENT_BANK_ACCOUNT = "p_DeleteClientBankAccount";

        public const string GET_CLIENT_INTRODUCER = "p_GetClientIntroducer";
        public const string ADD_EDIT_CLIENT_INTRODUCER = "p_AddEditClientIntroducer";
        public const string DELETE_CLIENT_INTRODUCER = "p_DeleteClientIntroducer";

        public const string GET_CLIENT_DEMISE_DETAILS = "p_GetClientDemiseDetails";
        public const string ADD_EDIT_CLIENT_DEMISE_DETAILS = "p_AddEditClientDemiseDetails";
        public const string DELETE_CLIENT_DEMISE_DETAILS = "p_DeleteClientDemiseDetails";

        public const string GET_CLIENT_PROFILE_CHANGES = "p_GetClientProfileChanges";
        public const string ADD_EDIT_CLIENT_PROFILE_CHANGE = "p_AddEditClientProfileChange";

        public const string GET_CLIENT_PORTFOLIO = "p_GetClientPortfolio";
        public const string GET_CLIENT_IDENTITY_TYPE = "dbo.p_GetClientIdentityType";
        public const string ADD_EDIT_CLIENT_IDENTITY_TYPES = "dbo.p_AddEditClientIdentityTypes";
        public const string DELETE_CLIENT_IDENTITY_TYPES = "dbo.p_DeleteClientIdentityTypes";

        // ═══════════════════════════════════════════════════════════════════
        // STANDING INSTRUCTION LOAN REPAYMENT
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_STANDING_INSTRUCTION_LOAN_REPAYMENT = "p_GetStandingInstructionLoanRepayment";
        public const string ADD_EDIT_STANDING_INSTRUCTION_LOAN_REPAYMENT = "p_AddEditStandingInstructionLoanRepayment";
        public const string DELETE_STANDING_INSTRUCTION_LOAN_REPAYMENT = "p_DeleteStandingInstructionLoanRepayment";
        public const string STOP_STANDING_INSTRUCTION_LOAN_REPAYMENT = "p_StopStandingInstructionLoanRepayment";

        // ═══════════════════════════════════════════════════════════════════
        // STANDING INSTRUCTION TRANSFER
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_STANDING_INSTRUCTION_TRANSFER = "p_GetStandingInstructionTransfer";
        public const string ADD_EDIT_STANDING_INSTRUCTION_TRANSFER = "p_AddEditStandingInstructionTransfer";
        public const string DELETE_STANDING_INSTRUCTION_TRANSFER = "p_DeleteStandingInstructionTransfer";
        public const string STOP_STANDING_INSTRUCTION_TRANSFER = "p_StopStandingInstructionTransfer";
        public const string GET_ACCOUNT_SIGNATORIES = "p_GetAccountSignatories";

        
        // ═══════════════════════════════════════════════════════════════════
        // CHANGE INSTALLMENT DATE (Module 5095)
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_INSTALLMENT_DATES = "p_GetInstallmentDates";
        public const string CHANGE_INSTALLMENT_DATE = "p_ChangeInstallmentDate";
        public const string VALIDATE_INSTALLMENT_DATE_CHANGE = "p_ValidateInstallmentDateChange";

        // ═══════════════════════════════════════════════════════════════════
        // CHANGE CENTER/GROUP
        // ═══════════════════════════════════════════════════════════════════
        // Constants reused from Group Maintenance block below:
        // GET_GROUP_DETAILS, GET_GROUP_MEMBER_LIST, CHANGE_MEMBER_GROUP_ID

        // ═══════════════════════════════════════════════════════════════════
        // CENTER MEMBER MAINTENANCE
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_GROUP_PRODUCT_DETAILS = "p_GetGroupProductDetails";
        public const string GET_GROUP_MEMBERS = "p_GetGroupMembers";
        public const string ADD_EDIT_GROUP_MEMBERS = "p_AddEditGroupMembers";
        public const string DELETE_GROUP_MEMBERS = "p_DeleteGroupMembers";
        // Validations use p_GetIDDescription with ControlTypeID:
        //   GroupID, SubGroupID, ClientWithoutGroupID, GroupClientID

        // ═══════════════════════════════════════════════════════════════════
        // CENTER MEMBER SCHEME (DataEntry submodule of Center Member Maintenance)
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_GROUP_MEMBER_SCHEME = "p_GetGroupMemberScheme";
        public const string ADD_EDIT_GROUP_MEMBER_SCHEME = "p_AddEditGroupMemberScheme";
        public const string DELETE_GROUP_MEMBER_SCHEME = "p_DeleteGroupMemberScheme";

        // ═══════════════════════════════════════════════════════════════════
        // EXIT PROCESS
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_EXIT_TRX = "p_GetExitTrx";
        public const string GET_ID_DESCRIPTION = "p_GetIDDescription";

        // ═══════════════════════════════════════════════════════════════════
        // FORFEIT RECOVERY
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_FORFEIT_RECOVERY_TRX = "p_GetForfeitRecoveryTrx";
        public const string ADD_FORFEIT_RECOVERY_TRX = "p_AddForfeitRecoveryTrx";
        // Validations use p_GetIDDescription with ControlTypeID:
        //   GroupID, SubGroupID, GroupExitedClientID, ActiveOfficerID

        // ═══════════════════════════════════════════════════════════════════
        // SAVINGS REFUND
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_SAVINGS_REFUND_TRX = "p_GetSavingsRefundTrx";
        public const string ADD_SAVINGS_REFUND_TRX = "p_AddSavingsRefundTrx";
        // Validations use p_GetIDDescription with ControlTypeID:
        //   GroupID, SubGroupID, GroupExitedClientID

        // ═══════════════════════════════════════════════════════════════════
        // CHANGE CENTER/GROUP
        // ═══════════════════════════════════════════════════════════════════
        public const string CHANGE_CENTER_GROUP = "p_ChangeCenterGroup";
        // Also uses: p_GetGroupMembers (defined above in Center Member Maintenance)
        // Validations use p_GetIDDescription with ControlTypeID:
        //   GroupID, SubGroupID

        // ═══════════════════════════════════════════════════════════════════
        // CENTER PENALTY INTEREST WAIVE OFF
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_GLOAN_PEN_INT_WAIVE_OFF = "p_GetGLoanPenIntWaiveOff";

        // ═══════════════════════════════════════════════════════════════════
        // WORKFLOW LOAN - LOAN SANCTION (Module 7065)
        // ═══════════════════════════════════════════════════════════════════
        public const string GETLOANSANCTION = "p_GetWFLoanSanction";
        public const string SAVELOANSANCTION = "p_AddWFLoanSanction";
        public const string DEVIATEAPPLICATION = "p_DeviateWFApplication";

        // Loan Sanction - Disbursement Schedule (Data Entry Submodule)
        public const string GETDISBURSEMENTSCHEDULES = "p_GetWFLoanDisbSchedules";
        public const string SAVEDISBURSEMENTSCHEDULES = "p_AddEditWFLoanDisbSchedules";

        // ═══════════════════════════════════════════════════════════════════
        // WORKFLOW LOAN - LOAN DISBURSEMENT (Module 7097)
        // ═══════════════════════════════════════════════════════════════════
        public const string GETLOANDISBURSEMENT = "p_GetLoanDisbursement";
        public const string SAVELOANDISBURSEMENT = "p_AddLoanDisbursement";
        public const string GETLOANINSTALLMENTS = "p_GetLoanInstallments";
        public const string GETWFCHARGES = "p_GetWFCharges";
        public const string GETTILLDETAILS = "pc_GetTillDetailPerTill";

        public const string ADD_GLOAN_PEN_INT_WAIVE_OFF = "p_AddGLoanPenIntWaiveOff";
        public const string DELETE_GLOAN_PEN_INT_WAIVE_OFF = "p_DeleteGLoanPenIntWaiveOff";
        public const string GET_DEFAULT_ADV_TYPE = "p_GetDefaultAdvType";
        // Validations use p_GetIDDescription with ControlTypeID:
        //   BranchID, GroupID, GroupLoanSchemeID

        // ═══════════════════════════════════════════════════════════════════
        // WORKFLOW LOAN - LOAN APPLICATION SYNDICATE
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_WF_LOAN_BANK_SYNDICATE = "p_GetWFLoanBankSyndicate";
        public const string ADD_EDIT_WF_LOAN_APPLICATIONS = "p_AddEditWFLoanApplications";
        public const string ADD_EDIT_WF_LOAN_BANK_SYNDICATE = "p_AddEditWFLoanBankSyndicate";
        public const string DELETE_WF_LOAN_APPLICATIONS = "p_DeleteWFLoanApplications";
        public const string GET_WF_PRODUCT_DETAILS = "p_GetWFProductDetails";
        public const string GET_CLIENT_MIN_DETAILS = "p_GetClientMinDetails";

        // ═══════════════════════════════════════════════════════════════════
        // GROUP MAINTENANCE MODULE (MicroFinance/GroupMaintenance)
        // ═══════════════════════════════════════════════════════════════════

        // Main Group Operations
        public const string GET_GROUP_DETAILS = "p_GetGroupDetails";
        public const string ADD_EDIT_GROUP_DETAILS = "p_AddEditGroupDetails";
        public const string UPDATE_GROUP = "p_UpdateGroup";
        public const string DELETE_GROUP = "p_DeleteGroup";
        public const string DELETE_GROUP_DETAILS = "p_DeleteGroupDetails";
        public const string GET_GROUP_PRODUCT_MIN_DETAIL = "p_GetGroupProductMinDetail";
        public const string GET_GROUP_LOAN_SCHEME_COMBO = "p_GetGroupLoanSchemeCombo";

        // Sub-Group Operations (DataEntry/GroupDetails)
        public const string GET_SUB_GROUP = "p_GetSubGroup";
        public const string GET_SUB_GROUP_DETAILS = "p_GetSubGroupDetails";
        public const string ADD_EDIT_SUB_GROUP = "p_AddEditSubGroup";
        public const string DELETE_SUB_GROUP = "p_DeleteSubGroup";

        // GRT Operations (DataEntry/GRTDetails)
        public const string GET_GRT_DETAILS = "p_GetGRTDetails";
        public const string ADD_EDIT_GRT_DETAILS = "p_AddEditGRTDetails";
        public const string DELETE_GRT_DETAILS = "p_DeleteGRTDetails";

        // Group Bank Accounts (DataEntry/GroupBankDetails)
        public const string GET_GROUP_BANK_ACCOUNTS = "p_GetGroupBankAccounts";
        public const string ADD_EDIT_GROUP_BANK_ACCOUNTS = "p_AddEditGroupBankAccounts";
        public const string DELETE_GROUP_BANK_ACCOUNTS = "p_DeleteGroupBankAccounts";
        public const string SEARCH_CLEARING_BANKS = "pc_SearchClearingBanks";
        public const string GET_BANK_BRANCHES = "p_rw_GetBranches";

        // User Defined Fields (DataEntry/UserDefinedFields)
        public const string GET_USER_FIELDS_DATA = "p_GetUserFieldsData";

        // Group Members (View/GroupMembers)
        public const string VIEW_GROUP_MEMBERS = "p_ViewGroupMembers";
        public const string GET_GROUP_MEMBER_LIST = "p_GetGroupMemberList";
        public const string CHANGE_MEMBER_GROUP_ID = "p_ChangeMemberGroupID";

        // Supporting Operations
        public const string GET_GROUP_LOAN_INST_DATE_CHANGE = "p_GetGroupLoanInstDateChange";
        public const string GET_SP_CONDITION_CLASS_COMBO = "p_GetSpConditionCalssCombo"; // Note: Typo in DB
        public const string USER_RIGHTS = "p_UserRights";

        // ═══════════════════════════════════════════════════════════════════
        // ACCOUNT MAINTENANCE - ACCOUNT NOTIFICATION (DataEntry)
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_PRODUCT_NOTIFICATION_DETAILS = "p_GetProductNotificationDetails";
        public const string EDIT_ACCOUNT_PRODUCT_NOTIFICATION = "p_EditAccountProductNotification";

        // ═══════════════════════════════════════════════════════════════════
        // ACCOUNT MAINTENANCE VIEW SUBMODULES
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_LOAN_REPAYMENT_DETAILS = "p_SILoanDetailView";
        public const string GET_DEBIT_INTEREST_WORKSHEET = "p_GetDebitInterestWorksheet";
        public const string GET_CREDIT_INTEREST_WORKSHEET = "p_GetCreditInterestWorksheet";
        public const string GET_INTEREST_DATE_OPTIONS = "p_GetInterestDateOptions";
        // public const string GET_SIGNATORY_IMAGE = "p_GetSignatoryImage";
        public const string GET_SIGNATORY_IMAGE = "p_GetSignatoryImage";

        // ═══════════════════════════════════════════════════════════════════
        // DIRECT DEBIT MAINTENANCE
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_DIRECT_DEBIT_MAINTENANCE = "p_GetDirectDebitMaintenance";
        public const string ADD_EDIT_DIRECT_DEBIT_MAINTENANCE = "p_AddEditDirectDebitMaintenance";
        public const string DELETE_DIRECT_DEBIT_MAINTENANCE = "p_DeleteDirectDebitMaintenance";
        public const string STOP_DIRECT_DEBIT_MAINTENANCE = "p_StopDirectDebitMaintenance";

        // ═══════════════════════════════════════════════════════════════════
        // STANDING INSTRUCTION TYPE
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_SI_TYPES = "dbo.p_GetSITypes";
        public const string ADD_EDIT_SI_TYPES = "dbo.p_AddEditSITypes";
        public const string DELETE_SI_TYPES = "dbo.p_DeleteSITypes";
        public const string GET_ELECTRONIC_CARDS_STAGE_WISE = "p_GetElectronicCardsStageWise";
        public const string GET_EDIT_CARD_STATUS = "p_EditCardStatus";

        public const string GET_MERGE_CLIENT_ACCOUNTS = "p_GetCustomerQuery_MergeClientAccount";
        public const string GET_SEARCHRESULT_DBO = "p_GetSearchResult";
        public const string SEARCH_SYSTEM_BRANCHES = "pc_SearchSystemBranches";
        public const string MERGE_ACCOUNTS = "p_MergeAccounts";
        public const string ADD_ACCOUNT_CARD = "p_AddEditElectronicCard";
        public const string UPDATE_ACCOUNT_CARD = "p_AddEditElectronicCard";
        public const string GET_ACCOUNT_CARD = "p_GetAccountElectronicCards";
        public const string DELETE_ACCOUNT_CARD = "p_DeleteElectronicCard";


    }



}