using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace AccountManagement.Helpers
{
    public static class DBObjectConstants
    {
        public const string GET_CLIENT = "p_GetClient_V0";
        public const string UPDATE_CLIENT = "p_UpdateClient_V0";
        public const string CREATE_CLIENT = "p_CreateClient_V0";

        public const string GET_ACCOUNT = "p_SearchAccounts_V0";
        public const string UPDATE_ACCOUNT = "p_UpdateCustomerAccount_V0";
        public const string CREATE_ACCOUNT = "p_CreateCustomerAccount_V0";

        // Account Document procedures
        public const string ADD_ACCOUNT_DOCUMENT = "p_AddAccountDocument_V0";
        public const string UPDATE_ACCOUNT_DOCUMENT = "p_UpdateAccountDocument_V0";
        public const string GET_ACCOUNT_DOCUMENT = "p_GetAccountDocument_V0";
        public const string DELETE_ACCOUNT_DOCUMENT = "p_DeleteAccountDocument_V0";

        // Account Sweeping procedures
        public const string ADD_ACCOUNT_SWEEPING = "p_AddAccountSweeping_V0";
        public const string UPDATE_ACCOUNT_SWEEPING = "p_UpdateAccountSweeping_V0";
        public const string GET_ACCOUNT_SWEEPING = "p_GetAccountSweeping_V0";
        public const string DELETE_ACCOUNT_SWEEPING = "p_DeleteAccountSweeping_V0";

        // Account Nominee procedures
        public const string ADD_ACCOUNT_NOMINEE = "p_AddAccountNominee_V0";
        public const string UPDATE_ACCOUNT_NOMINEE = "p_UpdateAccountNominee_V0";
        public const string GET_ACCOUNT_NOMINEE_OPENING = "p_GetAccountNomineeOpening_V0";
        public const string GET_ACCOUNT_NOMINEE = "p_GetAccountNominee_V0";
        public const string DELETE_ACCOUNT_NOMINEE = "p_DeleteAccountNominee_V0";

        // Account Closure procedures
        public const string GET_ACCOUNT_CLOSING_DETAILS = "p_GetAccountClosingDetails_V0";
        public const string CLOSE_ACCOUNT = "p_CloseAccount_V0";
        public const string TRANSFER_ACCOUNT = "p_TransferAccount_V0";

        // Account Charge Rate procedures
        public const string ADD_ACCOUNT_CHARGE_RATE = "p_AddAccountChargeRate_V0";
        public const string UPDATE_ACCOUNT_CHARGE_RATE = "p_UpdateAccountChargeRate_V0";
        public const string GET_ACCOUNT_CHARGE_RATE = "p_GetAccountChargeRate_V0";
        public const string DELETE_ACCOUNT_CHARGE_RATE = "p_DeleteAccountChargeRate_V0";

        // Account Blocking/Unblocking procedures
        public const string BLOCK_ENTITY = "p_BlockEntity_V0";
        public const string UNBLOCK_ENTITY = "p_UnblockEntity_V0";
        public const string GET_BLOCKED_HISTORY = "p_GetBlockedHistory_V0";
        public const string GET_BLOCKED_DETAILS = "p_GetBlockedDetails_V0";

        // Account Classification procedures
        public const string ADD_ACCOUNT_CLASSIFICATION = "p_AddAccountClassification_V0";
        public const string UPDATE_ACCOUNT_CLASSIFICATION = "p_UpdateAccountClassification_V0";
        public const string GET_ACCOUNT_CLASSIFICATION = "p_GetAccountClassification_V0";
        public const string DELETE_ACCOUNT_CLASSIFICATION = "p_DeleteAccountClassification_V0";

        // Account Special Conditions procedures
        public const string ADD_ACCOUNT_SPECIAL_CONDITION = "p_AddAccountSpecialCondition_V0";
        public const string UPDATE_ACCOUNT_SPECIAL_CONDITION = "p_UpdateAccountSpecialCondition_V0";
        public const string DELETE_ACCOUNT_SPECIAL_CONDITION = "p_DeleteAccountSpecialCondition_V0";
        public const string GET_ACCOUNT_SPECIAL_CONDITIONS = "p_GetAccountSpecialConditions_V0";
        public const string GET_SPECIAL_CONDITION_CLASSES = "p_GetSpecialConditionClasses_V0";

        // Account Interest Rate procedures
        public const string ADD_ACCOUNT_INTEREST_RATE = "p_AddAccountInterestRate_V0";
        public const string UPDATE_ACCOUNT_INTEREST_RATE = "p_UpdateAccountInterestRate_V0";
        public const string GET_ACCOUNT_INTEREST_RATE = "p_GetAccountInterestRate_V0";
        public const string DELETE_ACCOUNT_INTEREST_RATE = "p_DeleteAccountInterestRate_V0";

        // Notes procedures
        public const string UPDATE_NOTES = "p_UpdateNotes_V0";
        public const string GET_NOTES = "p_GetNotes_V0";

        // Account Freezing procedures
        public const string ADD_ACCOUNT_FREEZE = "p_AddAccountFreeze_V0";
        public const string UPDATE_ACCOUNT_FREEZE = "p_UpdateAccountFreeze_V0";
        public const string GET_ACCOUNT_FREEZE = "p_GetAccountFreeze_V0";
        public const string RELEASE_ACCOUNT_FREEZE = "p_ReleaseAccountFreeze_V0";

        // Cheque Book procedures
        public const string ADD_CHEQUE_BOOK = "p_AddChequeBook_V0";
        public const string UPDATE_CHEQUE_BOOK = "p_UpdateChequeBook_V0";
        public const string ADD_CHEQUE_BOOK_REQUEST = "p_AddChequeBookRequest_V0";
        public const string UPDATE_CHEQUE_BOOK_REQUEST = "p_UpdateChequeBookRequest_V0";
        public const string ADD_CHEQUE_BOOK_TRANSFER = "p_AddChequeBookTransfer_V0";
        public const string UPDATE_CHEQUE_BOOK_TRANSFER = "p_UpdateChequeBookTransfer_V0";
        public const string GET_CHEQUE_BOOKS = "p_GetChequeBooks_V0";
        public const string GET_CHEQUE_BOOK_REQUESTS = "p_GetChequeBookRequests_V0";
        public const string GET_CHEQUE_BOOK_TRANSFERS = "p_GetChequeBookTransfers_V0";
        public const string DELETE_CHEQUE_BOOKS = "p_DeleteChequeBooks_V0";

        // Stop Payment procedures
        public const string ADD_STOP_PAYMENT = "p_AddStopPayment_V0";
        public const string UPDATE_STOP_PAYMENT = "p_UpdateStopPayment_V0";
        public const string ADD_CANCEL_STOP_PAYMENT = "p_AddCancelStopPayment_V0";
        public const string UPDATE_CANCEL_STOP_PAYMENT = "p_UpdateCancelStopPayment_V0";
        public const string GET_STOP_PAYMENTS = "p_GetStopPayments_V0";
        public const string GET_CANCEL_STOP_PAYMENTS = "p_GetCancelStopPayments_V0";

        // Account Dormant procedures
        public const string GET_ACCOUNT_DORMANT = "p_GetAccountDormant_V0";
        public const string EDIT_ACCOUNT_DORMANT = "p_UpdateAccountDormant_V0";

        // Account Reminder (Notifications) procedures
        public const string ADD_ACCOUNT_REMINDER = "p_AddAccountReminder_V0";
        public const string UPDATE_ACCOUNT_REMINDER = "p_UpdateAccountReminder_V0";
        public const string GET_ACCOUNT_REMINDERS = "p_GetAccountReminders_V0";
        public const string DELETE_ACCOUNT_REMINDER = "p_DeleteAccountReminder_V0";

        // Account Activation procedures
        public const string GET_ACCOUNT_ACTIVATION = "p_GetAccountActivation_V0";
        public const string UPDATE_ACCOUNT_ACTIVATION = "p_UpdateAccountActivation_V0";

        // Account Transfer procedures
        public const string ADD_ACCOUNT_TRANSFER_DETAILS = "p_AddAcTransferDetails_V0";
        public const string GET_ACCOUNT_TRANSFER_DETAILS = "p_GetAcTransferDetails_V0";

        public const string GET_SYSTEMSEARCH = "p_GetSystemSearch_V0";
        public const string GET_SYSTEMSEARCH_RESULT = "p_GetSystemSearchResult_V0";
        public const string GET_SYSTEMCODES = "p_GetSystemCodes_V0";
    }
}
