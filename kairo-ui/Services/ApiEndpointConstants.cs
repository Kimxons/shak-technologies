namespace kairo_ui.Services
{
    public static class ApiEndpoints
    {
        public const string GET_BRANCHSETTINGS_IAM = "api/BranchSetting";

        public const string GET_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/GetSystemBankSetting";
        public const string CREATE_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/CreateSystemBankSetting";
        public const string UPDATE_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/UpdateSystemBankSetting";
        public const string DELETE_SYSTEMBANKSETTINGS = "api/v1/SystemBankSettings/DeleteSystemBankSetting";

        public const string GET_MAINMODULES = "api/v1/SystemCore/main-modules";
        public const string GET_MODULES = "api/v1/SystemCore/modules";
        public const string GET_DASHBOARDMETRICS = "api/v1/dashboard/metrics";

        public const string ADD_THEME = "api/v1/SystemCore/add-theme";
        public const string GET_EFFECTIVETHEME = "api/v1/SystemCore/effective-theme";


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
    }
}