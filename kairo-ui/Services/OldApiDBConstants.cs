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

        public const string GET_CLIENT                 = "p_V8_GetClientBasicDetails";
        public const string GET_CLIENT_INDIVIDUAL      = "p_V8_GetClientIndividual";
        public const string GET_CLIENT_CORPORATE       = "p_V8_GetClientCorporate";
        public const string GET_CLIENT_ADDRESS         = "p_V8_GetClientAddress";
        public const string GET_CLIENT_EMPLOYMENT      = "p_V8_GetClientEmployment";
        public const string GET_CLIENT_INDIVIDUAL_IMAGE = "p_GetClientPhotoIDSignIDBioID";
        public const string GET_CLIENT_IMAGES          = "p_V8_GetImages";

        public const string GET_CLIENT_SUPERVISION_PENDING = "p_getclientsupervisionpending";

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

        // ═══════════════════════════════════════════════════════════════════
        // CHANGE INSTALLMENT DATE (Module 5095)
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_INSTALLMENT_DATES = "p_GetInstallmentDates";
        public const string GET_GROUP_LOAN_INST_DATE_CHANGE = "p_GetGroupLoanInstDateChange";
        public const string CHANGE_INSTALLMENT_DATE = "p_ChangeInstallmentDate";
        public const string VALIDATE_INSTALLMENT_DATE_CHANGE = "p_ValidateInstallmentDateChange";

        // ═══════════════════════════════════════════════════════════════════
        // CHANGE CENTER/GROUP
        // ═══════════════════════════════════════════════════════════════════
        public const string GET_GROUP_DETAILS = "p_GetGroupDetails";
        public const string GET_GROUP_MEMBER_LIST = "p_GetGroupMemberList";
        public const string CHANGE_MEMBER_GROUP_ID = "p_ChangeMemberGroupID";

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
        public const string ADD_GLOAN_PEN_INT_WAIVE_OFF = "p_AddGLoanPenIntWaiveOff";
        public const string DELETE_GLOAN_PEN_INT_WAIVE_OFF = "p_DeleteGLoanPenIntWaiveOff";
        public const string GET_DEFAULT_ADV_TYPE = "p_GetDefaultAdvType";
        // Validations use p_GetIDDescription with ControlTypeID:
        //   BranchID, GroupID, GroupLoanSchemeID

        public const string ADD_ACCOUNT_CARD = "p_AddEditElectronicCard";
        public const string UPDATE_ACCOUNT_CARD = "p_AddEditElectronicCard";
        public const string GET_ACCOUNT_CARD = "p_GetAccountElectronicCards";
        public const string DELETE_ACCOUNT_CARD = "p_DeleteElectronicCard";


    }



}