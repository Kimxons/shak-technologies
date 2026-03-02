namespace kairo_ui.Services
{
    public static class ApiEndpoints
    {
        public const string GET_BRANCHSETTINGS_IAM = "api/BranchSetting";

        // SYSTEM BANK SETTINGS ENDPOINTS:
        private const string BASESYSTEMBANKSETTING = "api/v1/SystemBankSettings";
        public const string GET_SYSTEMBANKSETTINGS = BASESYSTEMBANKSETTING + "/GetSystemBankSetting";
        public const string CREATE_SYSTEMBANKSETTINGS = BASESYSTEMBANKSETTING + "/CreateSystemBankSetting";
        public const string UPDATE_SYSTEMBANKSETTINGS = BASESYSTEMBANKSETTING + "/UpdateSystemBankSetting";
        public const string DELETE_SYSTEMBANKSETTINGS = BASESYSTEMBANKSETTING + "/DeleteSystemBankSetting";

        //SYSTEM CORE ENDPOINTS:
        public const string BASESYSTEMCORE = "api/v1/SystemCore";
        public const string GET_MAINMODULES = BASESYSTEMCORE + "/main-modules";
        public const string GET_MODULES = BASESYSTEMCORE + "/modules";
        public const string ADD_THEME = BASESYSTEMCORE + "/add-theme";
        public const string GET_EFFECTIVETHEME = BASESYSTEMCORE + "/effective-theme";

        public const string GET_DASHBOARDMETRICS = "api/v1/dashboard/metrics";


        // ACCOUNTS ENDPOINTS:

        private const string BASEACCOUNTS = "api/v1/AccountMaintenance";

        // Core Account
        public const string GET_ACCOUNT = BASEACCOUNTS + "/GetAccount";
        public const string CREATE_ACCOUNT = BASEACCOUNTS + "/CreateAccount";
        public const string EDIT_ACCOUNT = BASEACCOUNTS + "/EditAccount";

        // Account Documents
        public const string ADD_ACCOUNT_DOCUMENT = BASEACCOUNTS + "/AddAccountDocument";
        public const string UPDATE_ACCOUNT_DOCUMENT = BASEACCOUNTS + "/UpdateAccountDocument";
        public const string GET_ACCOUNT_DOCUMENT = BASEACCOUNTS + "/GetAccountDocument";
        public const string DELETE_ACCOUNT_DOCUMENT = BASEACCOUNTS + "/DeleteAccountDocument";

        // Account Sweeping
        public const string ADD_ACCOUNT_SWEEPING = BASEACCOUNTS + "/AddAccountSweeping";
        public const string UPDATE_ACCOUNT_SWEEPING = BASEACCOUNTS + "/UpdateAccountSweeping";
        public const string GET_ACCOUNT_SWEEPING = BASEACCOUNTS + "/GetAccountSweeping";
        public const string DELETE_ACCOUNT_SWEEPING = BASEACCOUNTS + "/DeleteAccountSweeping";

        // Account Nominee
        public const string ADD_ACCOUNT_NOMINEE = BASEACCOUNTS + "/AddAccountNominee";
        public const string UPDATE_ACCOUNT_NOMINEE = BASEACCOUNTS + "/UpdateAccountNominee";
        public const string CHECK_ACCOUNT_NOMINEE_OPENING = BASEACCOUNTS + "/CheckAccountNomineeOpening";
        public const string GET_ACCOUNT_NOMINEE = BASEACCOUNTS + "/GetAccountNominee";
        public const string DELETE_ACCOUNT_NOMINEE = BASEACCOUNTS + "/DeleteAccountNominee";

        // Account Closing
        public const string GET_ACCOUNT_CLOSING_DETAILS = BASEACCOUNTS + "/GetAccountClosingDetails";
        public const string CLOSE_ACCOUNT = BASEACCOUNTS + "/CloseAccount";
        public const string TRANSFER_ACCOUNT = BASEACCOUNTS + "/TransferAccount";

        // Account Charge Rate
        public const string ADD_ACCOUNT_CHARGE_RATE = BASEACCOUNTS + "/AddAccountChargeRate";
        public const string UPDATE_ACCOUNT_CHARGE_RATE = BASEACCOUNTS + "/UpdateAccountChargeRate";
        public const string GET_ACCOUNT_CHARGE_RATE = BASEACCOUNTS + "/GetAccountChargeRate";
        public const string DELETE_ACCOUNT_CHARGE_RATE = BASEACCOUNTS + "/DeleteAccountChargeRate";

        // Blocking / Unblocking
        public const string BLOCK_ENTITY = BASEACCOUNTS + "/BlockEntity";
        public const string UNBLOCK_ENTITY = BASEACCOUNTS + "/UnblockEntity";
        public const string GET_BLOCKED_HISTORY = BASEACCOUNTS + "/GetBlockedHistory";
        public const string GET_BLOCKED_DETAILS = BASEACCOUNTS + "/GetBlockedDetails";

        // Account Classification
        public const string ADD_ACCOUNT_CLASSIFICATION = BASEACCOUNTS + "/AddAccountClassification";
        public const string UPDATE_ACCOUNT_CLASSIFICATION = BASEACCOUNTS + "/UpdateAccountClassification";
        public const string GET_ACCOUNT_CLASSIFICATION = BASEACCOUNTS + "/GetAccountClassification";
        public const string DELETE_ACCOUNT_CLASSIFICATION = BASEACCOUNTS + "/DeleteAccountClassification";

        // Special Conditions
        public const string ADD_ACCOUNT_SPECIAL_CONDITION = BASEACCOUNTS + "/AddAccountSpecialCondition";
        public const string UPDATE_ACCOUNT_SPECIAL_CONDITION = BASEACCOUNTS + "/UpdateAccountSpecialCondition";
        public const string DELETE_ACCOUNT_SPECIAL_CONDITION = BASEACCOUNTS + "/DeleteAccountSpecialCondition";
        public const string GET_ACCOUNT_SPECIAL_CONDITIONS = BASEACCOUNTS + "/GetAccountSpecialConditions";
        public const string GET_SPECIAL_CONDITION_CLASSES = BASEACCOUNTS + "/GetSpecialConditionClasses";

        // Interest Rate
        public const string ADD_ACCOUNT_INTEREST_RATE = BASEACCOUNTS + "/AddAccountInterestRate";
        public const string UPDATE_ACCOUNT_INTEREST_RATE = BASEACCOUNTS + "/UpdateAccountInterestRate";
        public const string GET_ACCOUNT_INTEREST_RATE = BASEACCOUNTS + "/GetAccountInterestRate";
        public const string DELETE_ACCOUNT_INTEREST_RATE = BASEACCOUNTS + "/DeleteAccountInterestRate";

        // Notes
        public const string UPDATE_NOTES = BASEACCOUNTS + "/UpdateNotes";
        public const string GET_NOTES = BASEACCOUNTS + "/GetNotes";

        // Account Freeze
        public const string ADD_ACCOUNT_FREEZE = BASEACCOUNTS + "/AddAccountFreeze";
        public const string UPDATE_ACCOUNT_FREEZE = BASEACCOUNTS + "/UpdateAccountFreeze";
        public const string GET_ACCOUNT_FREEZE = BASEACCOUNTS + "/GetAccountFreeze";
        public const string RELEASE_ACCOUNT_FREEZE = BASEACCOUNTS + "/ReleaseAccountFreeze";

        // Cheque Book
        public const string ADD_CHEQUE_BOOK = BASEACCOUNTS + "/AddChequeBook";
        public const string UPDATE_CHEQUE_BOOK = BASEACCOUNTS + "/UpdateChequeBook";
        public const string ADD_CHEQUE_BOOK_REQUEST = BASEACCOUNTS + "/AddChequeBookRequest";
        public const string UPDATE_CHEQUE_BOOK_REQUEST = BASEACCOUNTS + "/UpdateChequeBookRequest";
        public const string ADD_CHEQUE_BOOK_TRANSFER = BASEACCOUNTS + "/AddChequeBookTransfer";
        public const string UPDATE_CHEQUE_BOOK_TRANSFER = BASEACCOUNTS + "/UpdateChequeBookTransfer";
        public const string GET_CHEQUE_BOOKS = BASEACCOUNTS + "/GetChequeBooks";
        public const string GET_CHEQUE_BOOK_REQUESTS = BASEACCOUNTS + "/GetChequeBookRequests";
        public const string GET_CHEQUE_BOOK_TRANSFERS = BASEACCOUNTS + "/GetChequeBookTransfers";
        public const string DELETE_CHEQUE_BOOKS = BASEACCOUNTS + "/DeleteChequeBooks";

        // Stop Payment
        public const string ADD_STOP_PAYMENT = BASEACCOUNTS + "/AddStopPayment";
        public const string UPDATE_STOP_PAYMENT = BASEACCOUNTS + "/UpdateStopPayment";
        public const string ADD_CANCEL_STOP_PAYMENT = BASEACCOUNTS + "/AddCancelStopPayment";
        public const string UPDATE_CANCEL_STOP_PAYMENT = BASEACCOUNTS + "/UpdateCancelStopPayment";
        public const string GET_STOP_PAYMENTS = BASEACCOUNTS + "/GetStopPayments";
        public const string GET_CANCEL_STOP_PAYMENTS = BASEACCOUNTS + "/GetCancelStopPayments";

        // Dormant Account
        public const string GET_ACCOUNT_DORMANT = BASEACCOUNTS + "/GetAccountDormant";
        public const string EDIT_ACCOUNT_DORMANT = BASEACCOUNTS + "/EditAccountDormant";

        // Account Reminder
        public const string ADD_ACCOUNT_REMINDER = BASEACCOUNTS + "/AddAccountReminder";
        public const string UPDATE_ACCOUNT_REMINDER = BASEACCOUNTS + "/UpdateAccountReminder";
        public const string GET_ACCOUNT_REMINDERS = BASEACCOUNTS + "/GetAccountReminders";
        public const string DELETE_ACCOUNT_REMINDER = BASEACCOUNTS + "/DeleteAccountReminder";

        // Account Activation
        public const string GET_ACCOUNT_ACTIVATION = BASEACCOUNTS + "/GetAccountActivation";
        public const string UPDATE_ACCOUNT_ACTIVATION = BASEACCOUNTS + "/UpdateAccountActivation";

        // Account Transfer Details
        public const string ADD_ACCOUNT_TRANSFER_DETAILS = BASEACCOUNTS + "/AddAccountTransferDetails";
        public const string GET_ACCOUNT_TRANSFER_DETAILS = BASEACCOUNTS + "/GetAccountTransferDetails";

        // SHARED SEARCH MODAL ENDPOINTS:
        private const string BASESHARED = "api/v1/Shared";

        public const string GET_SYSTEM_SEARCH = BASESHARED + "/GetSystemSearch";
        public const string GET_SYSTEM_SEARCH_RESULT = BASESHARED + "/GetSystemSearchResult";
        public const string GET_ID_DESCRIPTION = BASESHARED + "/GetIDDescription";

        // SHARED STATEMENT ENDPOINTS (ClientManagement API):
        public const string GET_ACCOUNT_TRANSACTIONS = BASESHARED + "/GetAccountTransactions";
        public const string GET_BATCH_TRANSACTIONS = BASESHARED + "/GetBatchTransactionsList";

        // CLIENT 360 ENDPOINT (ClientManagement API):
        public const string GET_CLIENT_360 = BASESHARED + "/GetMember360";

        // CLIENT MAINTENANCE ENDPOINTS:
        private const string BASECLIENTS = "api/v1/ClientMaintenance";

        // Client Basic Details
        public const string GET_CLIENT_BASIC_DETAILS = BASECLIENTS + "/GetClientBasicDetails";
        public const string CREATE_CLIENT_BASIC_DETAILS = BASECLIENTS + "/CreateClientBasicDetails";
        public const string EDIT_CLIENT_BASIC_DETAILS = BASECLIENTS + "/EditClientBasicDetails";

        // Client Address
        public const string GET_CLIENT_ADDRESS = BASECLIENTS + "/GetClientAddress";
        public const string CREATE_CLIENT_ADDRESS = BASECLIENTS + "/CreateClientAddress";
        public const string EDIT_CLIENT_ADDRESS = BASECLIENTS + "/EditClientAddress";

        // Client Documents
        public const string GET_CLIENT_DOCUMENTS = BASECLIENTS + "/GetClientDocuments";
        public const string CREATE_CLIENT_DOCUMENTS = BASECLIENTS + "/CreateClientDocuments";
        public const string EDIT_CLIENT_DOCUMENTS = BASECLIENTS + "/EditClientDocuments";

        // Client Relations
        public const string GET_CLIENT_RELATIONS = BASECLIENTS + "/GetClientRelations";
        public const string CREATE_CLIENT_RELATIONS = BASECLIENTS + "/CreateClientRelations";
        public const string EDIT_CLIENT_RELATIONS = BASECLIENTS + "/EditClientRelations";

        // Client Employment
        public const string GET_CLIENT_EMPLOYMENT = BASECLIENTS + "/GetClientEmployment";
        public const string CREATE_CLIENT_EMPLOYMENT = BASECLIENTS + "/CreateClientEmployment";
        public const string EDIT_CLIENT_EMPLOYMENT = BASECLIENTS + "/EditClientEmployment";

        // Client Individual
        public const string GET_CLIENT_INDIVIDUAL = BASECLIENTS + "/GetClientIndividual";
        public const string CREATE_CLIENT_INDIVIDUAL = BASECLIENTS + "/CreateClientIndividual";
        public const string EDIT_CLIENT_INDIVIDUAL = BASECLIENTS + "/EditClientIndividual";

        // Client Corporate
        public const string GET_CLIENT_CORPORATE = BASECLIENTS + "/GetClientCorporate";
        public const string CREATE_CLIENT_CORPORATE = BASECLIENTS + "/CreateClientCorporate";
        public const string EDIT_CLIENT_CORPORATE = BASECLIENTS + "/EditClientCorporate";
    }
}