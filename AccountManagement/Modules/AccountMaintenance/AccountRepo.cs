using CBS.Entities.Common;
using AccountManagement.Helpers;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Reflection;
using System.Runtime.CompilerServices;

namespace AccountManagement.Modules.AccountMaintenance
{
    public class AccountRepo : IAccountRepo
    {
        private readonly CommonDBCtxt _dal;

        private static readonly HashSet<string> AllowedProcedures =
            typeof(DBObjectConstants)
                .GetFields(BindingFlags.Public | BindingFlags.Static | BindingFlags.FlattenHierarchy)
                .Where(f => f.IsLiteral && !f.IsInitOnly && f.FieldType == typeof(string))
                .Select(f => (string)f.GetRawConstantValue()!)
                .Where(name => name != DBObjectConstants.GET_SYSTEMSEARCH && name != DBObjectConstants.GET_SYSTEMCODES)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        public AccountRepo(CommonDBCtxt dal)
        {
            _dal = dal;
        }

        public async Task<ResponseDetail<object>> ExecuteProcedure(string procedureName, string requestJson, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(procedureName))
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = "Procedure is required"
                };
            }

            if (AllowedProcedures.Contains(procedureName) == false)
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "APIEX97",
                    ResponseMessage = "Procedure not allowed"
                };
            }

            ResponseDetail<string>? respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create($"EXECUTE {procedureName} @RequestData={{0}}", requestJson))
                .AsEnumerable()
                .FirstOrDefault();

            if (respStr is null)
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = "Empty response"
                };
            }

            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> CreateAccount(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.CREATE_ACCOUNT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            ResponseDetail<object> respObj = new()
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
            return respObj;
        }

        public async Task<ResponseDetail<object>> GetAccount(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            ResponseDetail<object> respObj = new()
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
            return respObj;
        }

        public async Task<ResponseDetail<object>> UpdateAccount(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            ResponseDetail<object> respObj = new()
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
            return respObj;
        }

        // Account Document operations
        public async Task<ResponseDetail<object>> AddAccountDocument(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountDocument(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountDocument(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountDocument(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Sweeping operations
        public async Task<ResponseDetail<object>> AddAccountSweeping(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_SWEEPING} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountSweeping(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_SWEEPING} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountSweeping(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_SWEEPING} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountSweeping(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_SWEEPING} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Nominee operations
        public async Task<ResponseDetail<object>> AddAccountNominee(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_NOMINEE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountNominee(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_NOMINEE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountNomineeOpening(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_NOMINEE_OPENING} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountNominee(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_NOMINEE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountNominee(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_NOMINEE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Closure operations
        public async Task<ResponseDetail<object>> GetAccountClosingDetails(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_CLOSING_DETAILS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> CloseAccount(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.CLOSE_ACCOUNT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> TransferAccount(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.TRANSFER_ACCOUNT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            ResponseDetail<object> respObj = new()
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
            return respObj;
        }

        // Account Charge Rate operations
        public async Task<ResponseDetail<object>> AddAccountChargeRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_CHARGE_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountChargeRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_CHARGE_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountChargeRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_CHARGE_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountChargeRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_CHARGE_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Blocking/Unblocking operations
        public async Task<ResponseDetail<object>> BlockEntity(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.BLOCK_ENTITY} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UnblockEntity(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UNBLOCK_ENTITY} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetBlockedHistory(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_BLOCKED_HISTORY} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetBlockedDetails(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_BLOCKED_DETAILS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Classification operations
        public async Task<ResponseDetail<object>> AddAccountClassification(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_CLASSIFICATION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountClassification(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_CLASSIFICATION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountClassification(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_CLASSIFICATION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountClassification(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_CLASSIFICATION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Special Conditions operations
        public async Task<ResponseDetail<object>> AddAccountSpecialCondition(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_SPECIAL_CONDITION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountSpecialCondition(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_SPECIAL_CONDITION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountSpecialCondition(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_SPECIAL_CONDITION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountSpecialConditions(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_SPECIAL_CONDITIONS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetSpecialConditionClasses(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_SPECIAL_CONDITION_CLASSES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Interest Rate operations
        public async Task<ResponseDetail<object>> AddAccountInterestRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_INTEREST_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountInterestRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_INTEREST_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountInterestRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_INTEREST_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountInterestRate(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_INTEREST_RATE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Notes operations
        public async Task<ResponseDetail<object>> UpdateNotes(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_NOTES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetNotes(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_NOTES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account freeze operations
        public async Task<ResponseDetail<object>> AddAccountFreeze(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_FREEZE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountFreeze(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_FREEZE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountFreeze(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_FREEZE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> ReleaseAccountFreeze(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.RELEASE_ACCOUNT_FREEZE} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Cheque book operations
        public async Task<ResponseDetail<object>> AddChequeBook(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_CHEQUE_BOOK} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateChequeBook(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_CHEQUE_BOOK} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> AddChequeBookRequest(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_CHEQUE_BOOK_REQUEST} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateChequeBookRequest(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_CHEQUE_BOOK_REQUEST} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> AddChequeBookTransfer(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_CHEQUE_BOOK_TRANSFER} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateChequeBookTransfer(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_CHEQUE_BOOK_TRANSFER} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetChequeBooks(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CHEQUE_BOOKS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetChequeBookRequests(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CHEQUE_BOOK_REQUESTS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetChequeBookTransfers(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CHEQUE_BOOK_TRANSFERS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteChequeBooks(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_CHEQUE_BOOKS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Stop payment operations
        public async Task<ResponseDetail<object>> AddStopPayment(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_STOP_PAYMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateStopPayment(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_STOP_PAYMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> AddCancelStopPayment(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_CANCEL_STOP_PAYMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateCancelStopPayment(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_CANCEL_STOP_PAYMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetStopPayments(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_STOP_PAYMENTS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetCancelStopPayments(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CANCEL_STOP_PAYMENTS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account dormant operations
        public async Task<ResponseDetail<object>> GetAccountDormant(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_DORMANT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> EditAccountDormant(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.EDIT_ACCOUNT_DORMANT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account reminder (notifications) operations
        public async Task<ResponseDetail<object>> AddAccountReminder(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_REMINDER} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountReminder(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_REMINDER} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountReminders(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_REMINDERS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountReminder(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_REMINDER} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account activation operations
        public async Task<ResponseDetail<object>> GetAccountActivation(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_ACTIVATION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountActivation(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_ACTIVATION} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account transfer operations
        public async Task<ResponseDetail<object>> AddAccountTransferDetails(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_TRANSFER_DETAILS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountTransferDetails(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_TRANSFER_DETAILS} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
    }
}
