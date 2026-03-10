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

    }
}
