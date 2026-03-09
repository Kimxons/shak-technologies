using Microsoft.Extensions.Configuration;

namespace kairo_ui.Services
{
    // Static constants for backwards compatibility
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

        // IMAGE RECOGNITION ENDPOINTS:
        public const string DETECT_PHOTO = "detect";
        public const string DETECT_SIGNATURE = "detectsign";

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

        // Signatories
        public const string GET_ACCOUNT_SIGNATORIES = BASEACCOUNTS + "/GetAccountSignatories";
        public const string ADD_EDIT_ACCOUNT_SIGNATORIES = BASEACCOUNTS + "/AddEditAccountSignatories";

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
        public const string GET_SYSTEM_CODES = BASESHARED + "/GetSystemCode";
        public const string GET_ID_DESCRIPTION = BASESHARED + "/GetIDDescription";

        // SHARED STATEMENT ENDPOINTS (ClientManagement API):
        public const string GET_ACCOUNT_TRANSACTIONS = BASESHARED + "/GetAccountTransactions";
        public const string GET_BATCH_TRANSACTIONS = BASESHARED + "/GetBatchTransactionsList";

        // CLIENT 360 ENDPOINT (ClientManagement API):
        public const string GET_CLIENT_360 = BASESHARED + "/GetMember360";

        // CLIENT APPROVAL ENDPOINTS (ClientManagement API):
        private const string BASECLIENTAPPROVAL = "api/ClientApproval";
        public const string GET_PENDING_CLIENT_APPROVALS = BASECLIENTAPPROVAL + "/GetPendingApprovals";
        public const string GET_CLIENT_APPROVAL_DETAILS = BASECLIENTAPPROVAL + "/GetClientApprovalDetails";
        public const string APPROVE_CLIENTS = BASECLIENTAPPROVAL + "/ApproveClients";
        public const string REJECT_CLIENTS = BASECLIENTAPPROVAL + "/RejectClients";

        // CLIENT SUPERVISION ENDPOINTS (ClientManagement API):
        private const string BASECLIENTSUPERVISION = "api/ClientSupervision";
        public const string GET_CLIENT_SUPERVISION_PENDING = BASECLIENTSUPERVISION + "/GetClientSupervisionPending";
        public const string APPROVE_CLIENT_SUPERVISION = BASECLIENTSUPERVISION + "/ApproveClientSupervision";
        public const string REJECT_CLIENT_SUPERVISION = BASECLIENTSUPERVISION + "/RejectClientSupervision";

        // WORKFLOW ENDPOINTS (SystemCore API):
        public const string GET_WORKFLOW_DATA_CHECK_FIELDS = "api/Workflow/GetDataCheckFields";

        // SHARED RECENT ACTIVITIES ENDPOINTS:
        public const string GET_RECENT_ACTIVITIES = BASESHARED + "/GetRecentActivities";
        public const string ADD_RECENT_ACTIVITY = BASESHARED + "/AddRecentActivity";

        // SHARED WORKFLOW ENDPOINTS:
        public const string GET_WORKFLOW_STAGE = BASESHARED + "/GetWorkflowStage";

        // CLIENT MAINTENANCE ENDPOINTS:
        private const string BASECLIENTS = "api/v1/ClientMaintenance";

        // Client Basic Details
        public const string GET_CLIENT_BASIC_DETAILS = BASECLIENTS + "/GetClientBasicDetails";
        public const string CREATE_CLIENT_BASIC_DETAILS = BASECLIENTS + "/CreateClientBasicDetails";
        public const string EDIT_CLIENT_BASIC_DETAILS = BASECLIENTS + "/EditClientBasicDetails";
        public const string DELETE_CLIENT_BASIC_DETAILS = BASECLIENTS + "/DeleteClientBasicDetails";

        // Client Address
        public const string GET_CLIENT_ADDRESS = BASECLIENTS + "/GetClientAddress";
        public const string CREATE_CLIENT_ADDRESS = BASECLIENTS + "/CreateClientAddress";
        public const string EDIT_CLIENT_ADDRESS = BASECLIENTS + "/EditClientAddress";
        public const string DELETE_CLIENT_ADDRESS = BASECLIENTS + "/DeleteClientAddress";

        // Client Documents
        public const string GET_CLIENT_DOCUMENTS = BASECLIENTS + "/GetClientDocuments";
        public const string CREATE_CLIENT_DOCUMENTS = BASECLIENTS + "/CreateClientDocuments";
        public const string EDIT_CLIENT_DOCUMENTS = BASECLIENTS + "/EditClientDocuments";
        public const string DELETE_CLIENT_DOCUMENTS = BASECLIENTS + "/DeleteClientDocuments";

        // Client Relations
        public const string GET_CLIENT_RELATIONS = BASECLIENTS + "/GetClientRelations";
        public const string CREATE_CLIENT_RELATIONS = BASECLIENTS + "/CreateClientRelations";
        public const string EDIT_CLIENT_RELATIONS = BASECLIENTS + "/EditClientRelations";
        public const string DELETE_CLIENT_RELATIONS = BASECLIENTS + "/DeleteClientRelations";

        // Client Employment
        public const string GET_CLIENT_EMPLOYMENT = BASECLIENTS + "/GetClientEmployment";
        public const string CREATE_CLIENT_EMPLOYMENT = BASECLIENTS + "/CreateClientEmployment";
        public const string EDIT_CLIENT_EMPLOYMENT = BASECLIENTS + "/EditClientEmployment";
        public const string DELETE_CLIENT_EMPLOYMENT = BASECLIENTS + "/DeleteClientEmployment";

        // Client Individual
        public const string GET_CLIENT_INDIVIDUAL = BASECLIENTS + "/GetClientIndividual";
        public const string CREATE_CLIENT_INDIVIDUAL = BASECLIENTS + "/CreateClientIndividual";
        public const string EDIT_CLIENT_INDIVIDUAL = BASECLIENTS + "/EditClientIndividual";
        public const string DELETE_CLIENT_INDIVIDUAL = BASECLIENTS + "/DeleteClientIndividual";

        // Client Corporate
        public const string GET_CLIENT_CORPORATE = BASECLIENTS + "/GetClientCorporate";
        public const string CREATE_CLIENT_CORPORATE = BASECLIENTS + "/CreateClientCorporate";
        public const string EDIT_CLIENT_CORPORATE = BASECLIENTS + "/EditClientCorporate";
        public const string DELETE_CLIENT_CORPORATE = BASECLIENTS + "/DeleteClientCorporate";

        // Client Special Offers
        public const string GET_CLIENT_SPECIAL_OFFERS = BASECLIENTS + "/GetClientSpecialOffers";
        public const string CREATE_CLIENT_SPECIAL_OFFERS = BASECLIENTS + "/CreateClientSpecialOffers";
        public const string EDIT_CLIENT_SPECIAL_OFFERS = BASECLIENTS + "/EditClientSpecialOffers";
        public const string DELETE_CLIENT_SPECIAL_OFFERS = BASECLIENTS + "/DeleteClientSpecialOffers";

        // Client Group Detail
        public const string GET_CLIENT_GROUP_DETAIL = BASECLIENTS + "/GetClientGroupDetail";
        public const string CREATE_CLIENT_GROUP_DETAIL = BASECLIENTS + "/CreateClientGroupDetail";
        public const string EDIT_CLIENT_GROUP_DETAIL = BASECLIENTS + "/EditClientGroupDetail";
        public const string DELETE_CLIENT_GROUP_DETAIL = BASECLIENTS + "/DeleteClientGroupDetail";

        // Client KYC / Other Details
        public const string GET_CLIENT_KYC = BASECLIENTS + "/GetClientOtherDetails";
        public const string CREATE_CLIENT_KYC = BASECLIENTS + "/CreateClientOtherDetails";
        public const string EDIT_CLIENT_KYC = BASECLIENTS + "/EditClientOtherDetails";
        public const string DELETE_CLIENT_KYC = BASECLIENTS + "/DeleteClientOtherDetails";

        // Client Products & Services
        public const string GET_CLIENT_PRODUCTS_SERVICES = BASECLIENTS + "/GetClientProductAndServices";
        public const string CREATE_CLIENT_PRODUCTS_SERVICES = BASECLIENTS + "/CreateClientProductAndServices";
        public const string EDIT_CLIENT_PRODUCTS_SERVICES = BASECLIENTS + "/EditClientProductAndServices";
        public const string DELETE_CLIENT_PRODUCTS_SERVICES = BASECLIENTS + "/DeleteClientProductAndServices";

        // Client Photo & Signature
        public const string GET_CLIENT_PHOTO_SIGNATURE = BASECLIENTS + "/GetClientPhotoSignature";
        public const string CREATE_CLIENT_PHOTO_SIGNATURE = BASECLIENTS + "/CreateClientPhotoSignature";
        public const string EDIT_CLIENT_PHOTO_SIGNATURE = BASECLIENTS + "/EditClientPhotoSignature";
        public const string DELETE_CLIENT_PHOTO_SIGNATURE = BASECLIENTS + "/DeleteClientPhotoSignature";

        // Client Submit / Finalization
        public const string GET_CLIENT_SUBMISSION_SUMMARY = BASECLIENTS + "/GetClientSubmissionSummary";
        public const string CREATE_CLIENT_SUBMISSION = BASECLIENTS + "/CreateClientSubmission";
        public const string EDIT_CLIENT_SUBMISSION = BASECLIENTS + "/EditClientSubmission";
        public const string DELETE_CLIENT_SUBMISSION = BASECLIENTS + "/DeleteClientSubmission";

        // Client Bank Accounts
        public const string GET_CLIENT_BANK_ACCOUNTS = BASECLIENTS + "/GetClientBankAccounts";
        public const string CREATE_CLIENT_BANK_ACCOUNT = BASECLIENTS + "/CreateClientBankAccount";
        public const string EDIT_CLIENT_BANK_ACCOUNT = BASECLIENTS + "/EditClientBankAccount";
        public const string DELETE_CLIENT_BANK_ACCOUNT = BASECLIENTS + "/DeleteClientBankAccount";

        // Client Introducer
        public const string GET_CLIENT_INTRODUCER = BASECLIENTS + "/GetClientIntroducer";
        public const string CREATE_CLIENT_INTRODUCER = BASECLIENTS + "/CreateClientIntroducer";
        public const string EDIT_CLIENT_INTRODUCER = BASECLIENTS + "/EditClientIntroducer";
        public const string DELETE_CLIENT_INTRODUCER = BASECLIENTS + "/DeleteClientIntroducer";

        // Client Profile Change
        public const string GET_CLIENT_PROFILE_CHANGES = BASECLIENTS + "/GetClientProfileChanges";
        public const string CREATE_CLIENT_PROFILE_CHANGE = BASECLIENTS + "/CreateClientProfileChange";

        // Client Demise Details
        public const string GET_CLIENT_DEMISE_DETAILS = BASECLIENTS + "/GetClientDemiseDetails";
        public const string CREATE_CLIENT_DEMISE_DETAILS = BASECLIENTS + "/CreateClientDemiseDetails";
        public const string EDIT_CLIENT_DEMISE_DETAILS = BASECLIENTS + "/EditClientDemiseDetails";
        public const string DELETE_CLIENT_DEMISE_DETAILS = BASECLIENTS + "/DeleteClientDemiseDetails";

        // CLIENT DOCUMENT API ENDPOINTS:

        // Client Documents Controller
        private const string BASECLIENTDOCUMENTS = "api/ClientDocuments";
        public const string UPLOAD_CLIENT_DOCUMENT = BASECLIENTDOCUMENTS;
        public const string GET_CLIENT_DOCUMENT_BY_ID = BASECLIENTDOCUMENTS + "/{0}"; // {id}
        public const string GET_CLIENT_DOCUMENTS_BY_CLIENT = BASECLIENTDOCUMENTS + "/client/{0}"; // {clientId}
        public const string GET_CLIENT_DOCUMENT_BY_CLIENT_AND_DOCUMENT = BASECLIENTDOCUMENTS + "/client/{0}/document/{1}"; // {clientId}/{documentId}
        public const string UPDATE_CLIENT_DOCUMENT = BASECLIENTDOCUMENTS + "/{0}"; // {id}
        public const string REPLACE_CLIENT_DOCUMENT_FILE = BASECLIENTDOCUMENTS + "/{0}/replace-file"; // {id}
        public const string DELETE_CLIENT_DOCUMENT = BASECLIENTDOCUMENTS + "/{0}"; // {id}

        // Account Documents Controller
        private const string BASEACCOUNTDOCUMENTS = "api/AccountDocuments";
        public const string UPLOAD_ACCOUNT_DOCUMENT = BASEACCOUNTDOCUMENTS + "/upload";
        public const string QUICK_UPLOAD_ACCOUNT_DOCUMENT = BASEACCOUNTDOCUMENTS + "/quick-upload";
        public const string GET_ACCOUNT_DOCUMENTS_BY_ACCOUNT = BASEACCOUNTDOCUMENTS + "/by-account/{0}"; // {accountId}

        // Images Controller
        private const string BASEIMAGES = "api/Images";
        public const string UPLOAD_IMAGE = BASEIMAGES;
        public const string GET_IMAGE_BY_ID = BASEIMAGES + "/{0}"; // {imageId}
        public const string GET_IMAGES_BY_CLIENT = BASEIMAGES + "/client/{0}"; // {clientId}
        public const string DOWNLOAD_IMAGE = BASEIMAGES + "/{0}/download"; // {imageId}
        public const string GET_IMAGE_THUMBNAIL = BASEIMAGES + "/{0}/thumbnail"; // {imageId}
        public const string UPDATE_IMAGE = BASEIMAGES + "/{0}"; // {imageId}
        public const string REPLACE_IMAGE = BASEIMAGES + "/{0}/replace"; // {imageId}
        public const string DELETE_IMAGE = BASEIMAGES + "/{0}"; // {imageId}
        public const string APPROVE_IMAGES_BY_CLIENT = BASEIMAGES + "/approve-by-client/{0}"; // {clientId}
        public const string REJECT_IMAGES_BY_CLIENT = BASEIMAGES + "/reject-by-client/{0}"; // {clientId}
        public const string APPROVE_IMAGES_BY_IDS = BASEIMAGES + "/approve-by-ids";
        public const string REJECT_IMAGES_BY_IDS = BASEIMAGES + "/reject-by-ids";

        // Image Accounts Controller
        private const string BASEIMAGEACCOUNTS = "api/ImageAccounts";
        public const string UPLOAD_IMAGE_ACCOUNT = BASEIMAGEACCOUNTS;
        public const string GET_IMAGE_ACCOUNT_BY_ID = BASEIMAGEACCOUNTS + "/{0}"; // {imageId}
        public const string GET_IMAGE_ACCOUNTS_BY_CLIENT = BASEIMAGEACCOUNTS + "/client/{0}"; // {clientId}
        public const string GET_IMAGE_ACCOUNTS_BY_IDS = BASEIMAGEACCOUNTS + "/by-ids";
        public const string DOWNLOAD_IMAGE_ACCOUNT = BASEIMAGEACCOUNTS + "/{0}/download"; // {imageId}
        public const string GET_IMAGE_ACCOUNT_THUMBNAIL = BASEIMAGEACCOUNTS + "/{0}/thumbnail"; // {imageId}
        public const string UPDATE_IMAGE_ACCOUNT = BASEIMAGEACCOUNTS + "/{0}"; // {imageId}
        public const string REPLACE_IMAGE_ACCOUNT = BASEIMAGEACCOUNTS + "/{0}/replace"; // {imageId}
        public const string DELETE_IMAGE_ACCOUNT = BASEIMAGEACCOUNTS + "/{0}"; // {imageId}

        // Temp Images Controller
        private const string BASETEMPIMAGES = "api/TempImages";
        public const string UPLOAD_TEMP_IMAGE = BASETEMPIMAGES;
        public const string GET_TEMP_IMAGE_BY_ID = BASETEMPIMAGES + "/{0}"; // {tempImageId}
        public const string DOWNLOAD_TEMP_IMAGE = BASETEMPIMAGES + "/{0}/download"; // {tempImageId}
        public const string GET_TEMP_IMAGE_THUMBNAIL = BASETEMPIMAGES + "/{0}/thumbnail"; // {tempImageId}
        public const string UPDATE_TEMP_IMAGE = BASETEMPIMAGES + "/{0}"; // {tempImageId}
        public const string REPLACE_TEMP_IMAGE = BASETEMPIMAGES + "/{0}/replace"; // {tempImageId}
        public const string DELETE_TEMP_IMAGE = BASETEMPIMAGES + "/{0}"; // {tempImageId}
        public const string GET_TEMP_IMAGES_BY_TEMP_CLIENT = BASETEMPIMAGES + "/{0}"; // {tempClientId}
        public const string DELETE_TEMP_IMAGES_BY_TEMP_CLIENT = BASETEMPIMAGES + "/{0}"; // {tempClientId}
        public const string GET_TEMP_IMAGES_BY_CLIENT = BASETEMPIMAGES + "/client/{0}"; // {clientId}
        public const string DELETE_TEMP_IMAGES_BY_CLIENT = BASETEMPIMAGES + "/client/{0}"; // {clientId}
        public const string GET_TEMP_IMAGES_BY_ACCOUNT = BASETEMPIMAGES + "/account/{0}"; // {accountId}
        public const string DELETE_TEMP_IMAGES_BY_ACCOUNT = BASETEMPIMAGES + "/account/{0}"; // {accountId}

        // Image Account Pre-Approvals Controller
        private const string BASEIMAGEACCOUNTPREAPPROVALS = "api/ImageAccountPreApprovals";
        public const string UPLOAD_IMAGE_ACCOUNT_PREAPPROVAL = BASEIMAGEACCOUNTPREAPPROVALS;
        public const string GET_IMAGE_ACCOUNT_PREAPPROVAL_BY_ID = BASEIMAGEACCOUNTPREAPPROVALS + "/{0}"; // {imageId}
        public const string GET_IMAGE_ACCOUNT_PREAPPROVALS_BY_CLIENT = BASEIMAGEACCOUNTPREAPPROVALS + "/client/{0}"; // {clientId}
        public const string DOWNLOAD_IMAGE_ACCOUNT_PREAPPROVAL = BASEIMAGEACCOUNTPREAPPROVALS + "/{0}/download"; // {imageId}
        public const string GET_IMAGE_ACCOUNT_PREAPPROVAL_THUMBNAIL = BASEIMAGEACCOUNTPREAPPROVALS + "/{0}/thumbnail"; // {imageId}
        public const string UPDATE_IMAGE_ACCOUNT_PREAPPROVAL = BASEIMAGEACCOUNTPREAPPROVALS + "/{0}"; // {imageId}
        public const string REPLACE_IMAGE_ACCOUNT_PREAPPROVAL = BASEIMAGEACCOUNTPREAPPROVALS + "/{0}/replace"; // {imageId}
        public const string DELETE_IMAGE_ACCOUNT_PREAPPROVAL = BASEIMAGEACCOUNTPREAPPROVALS + "/{0}"; // {imageId}

        // WF Advance Documents Controller
        private const string BASEWFADVDOCUMENTS = "api/WFAdvDocuments";
        public const string UPLOAD_WFADV_DOCUMENT = BASEWFADVDOCUMENTS;
        public const string GET_WFADV_DOCUMENT_BY_KEY = BASEWFADVDOCUMENTS + "/{0}/{1}/{2}"; // {branchId}/{applicationId}/{documentId}
        public const string GET_WFADV_DOCUMENTS_BY_APPLICATION = BASEWFADVDOCUMENTS + "/application/{0}"; // {applicationId}
        public const string GET_WFADV_DOCUMENTS_BY_BRANCH = BASEWFADVDOCUMENTS + "/branch/{0}"; // {branchId}
        public const string UPDATE_WFADV_DOCUMENT = BASEWFADVDOCUMENTS + "/{0}/{1}/{2}"; // {branchId}/{applicationId}/{documentId}
        public const string REPLACE_WFADV_DOCUMENT_FILE = BASEWFADVDOCUMENTS + "/{0}/{1}/{2}/replace-file"; // {branchId}/{applicationId}/{documentId}
        public const string DELETE_WFADV_DOCUMENT = BASEWFADVDOCUMENTS + "/{0}/{1}/{2}"; // {branchId}/{applicationId}/{documentId}
    }
}