using CBS.Entities.Common;

namespace AccountManagement.Modules.AccountMaintenance
{
    public interface IAccountRepo
    {
        public Task<ResponseDetail<object>> GetAccount(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CreateAccount(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccount(string requestJson, CancellationToken cancellationToken = default);

        // Account document operations
        public Task<ResponseDetail<object>> AddAccountDocument(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountDocument(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountDocument(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountDocument(string requestJson, CancellationToken cancellationToken = default);

        // Account sweeping operations
        public Task<ResponseDetail<object>> AddAccountSweeping(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountSweeping(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountSweeping(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountSweeping(string requestJson, CancellationToken cancellationToken = default);

        // Account nominee operations
        public Task<ResponseDetail<object>> AddAccountNominee(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountNominee(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountNomineeOpening(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountNominee(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountNominee(string requestJson, CancellationToken cancellationToken = default);

        // Account closure operations
        public Task<ResponseDetail<object>> GetAccountClosingDetails(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> CloseAccount(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> TransferAccount(string requestJson, CancellationToken cancellationToken = default);

        // Account charge rate operations
        public Task<ResponseDetail<object>> AddAccountChargeRate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountChargeRate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountChargeRate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountChargeRate(string requestJson, CancellationToken cancellationToken = default);

        // Account blocking/unblocking operations
        public Task<ResponseDetail<object>> BlockEntity(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UnblockEntity(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetBlockedHistory(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetBlockedDetails(string requestJson, CancellationToken cancellationToken = default);

        // Account classification operations
        public Task<ResponseDetail<object>> AddAccountClassification(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountClassification(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountClassification(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountClassification(string requestJson, CancellationToken cancellationToken = default);

        // Account special conditions operations
        public Task<ResponseDetail<object>> AddAccountSpecialCondition(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountSpecialCondition(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountSpecialCondition(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountSpecialConditions(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetSpecialConditionClasses(string requestJson, CancellationToken cancellationToken = default);

        // Account interest rate operations
        public Task<ResponseDetail<object>> AddAccountInterestRate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountInterestRate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountInterestRate(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountInterestRate(string requestJson, CancellationToken cancellationToken = default);

        // Notes operations
        public Task<ResponseDetail<object>> UpdateNotes(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetNotes(string requestJson, CancellationToken cancellationToken = default);

        // Account freeze operations
        public Task<ResponseDetail<object>> AddAccountFreeze(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountFreeze(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountFreeze(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> ReleaseAccountFreeze(string requestJson, CancellationToken cancellationToken = default);

        // Cheque book operations
        public Task<ResponseDetail<object>> AddChequeBook(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateChequeBook(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> AddChequeBookRequest(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateChequeBookRequest(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> AddChequeBookTransfer(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateChequeBookTransfer(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetChequeBooks(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetChequeBookRequests(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetChequeBookTransfers(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteChequeBooks(string requestJson, CancellationToken cancellationToken = default);

        // Stop payment operations
        public Task<ResponseDetail<object>> AddStopPayment(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateStopPayment(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> AddCancelStopPayment(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateCancelStopPayment(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetStopPayments(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetCancelStopPayments(string requestJson, CancellationToken cancellationToken = default);

        // Account dormant operations
        public Task<ResponseDetail<object>> GetAccountDormant(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> EditAccountDormant(string requestJson, CancellationToken cancellationToken = default);

        // Account reminder (notifications) operations
        public Task<ResponseDetail<object>> AddAccountReminder(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountReminder(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountReminders(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountReminder(string requestJson, CancellationToken cancellationToken = default);

        // Account activation operations
        public Task<ResponseDetail<object>> GetAccountActivation(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountActivation(string requestJson, CancellationToken cancellationToken = default);

        // Account transfer operations
        public Task<ResponseDetail<object>> AddAccountTransferDetails(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> GetAccountTransferDetails(string requestJson, CancellationToken cancellationToken = default);

        // Account signatory (OperatedBy) operations
        public Task<ResponseDetail<object>> GetAccountSignatories(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> AddAccountSignatories(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> EditAccountSignatories(string requestJson, CancellationToken cancellationToken = default);
        
        // Account card maintenance operations
        public Task<ResponseDetail<object>> GetAccountCard(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> AddAccountCard(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> UpdateAccountCard(string requestJson, CancellationToken cancellationToken = default);
        public Task<ResponseDetail<object>> DeleteAccountCard(string requestJson, CancellationToken cancellationToken = default);


        // Generic routed execution (whitelisted procedures only)
        public Task<ResponseDetail<object>> ExecuteProcedure(string procedureName, string requestJson, CancellationToken cancellationToken = default);
    }
}
