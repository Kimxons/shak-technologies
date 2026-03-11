using CBS.Entities.Common;
using AccountManagement.Helpers;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using System.Text.Json;
using System.Text.Json.Nodes;
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
            ResponseDetail<string>? respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault();
            if (respStr == null) return new ResponseDetail<object> { ResponseCode = "99", ResponseMessage = "System Error: No response from database." };
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> UpdateAccountDocument(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string>? respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.UPDATE_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault();
            if (respStr == null) return new ResponseDetail<object> { ResponseCode = "99", ResponseMessage = "System Error: No response from database." };
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> GetAccountDocument(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string>? respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault();
            if (respStr == null) return new ResponseDetail<object> { ResponseCode = "01", ResponseMessage = "No record found." };
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> DeleteAccountDocument(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string>? respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_DOCUMENT} @RequestData={requestJson}").AsEnumerable().FirstOrDefault();
            if (respStr == null) return new ResponseDetail<object> { ResponseCode = "99", ResponseMessage = "System Error: No response from database." };
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

        // Account signatory (OperatedBy) operations
        public async Task<ResponseDetail<object>> GetAccountSignatories(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT_SIGNATORIES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }
        public async Task<ResponseDetail<object>> AddAccountSignatories(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.ADD_ACCOUNT_SIGNATORIES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        public async Task<ResponseDetail<object>> EditAccountSignatories(string requestJson, CancellationToken cancellationToken = default)
        {
            ResponseDetail<string> respStr = _dal.Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.EDIT_ACCOUNT_SIGNATORIES} @RequestData={requestJson}").AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr.Details) ? null : JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr.ResponseCode,
                ResponseMessage = respStr.ResponseMessage
            };
        }

        // Account Card Maintenance operations
        public async Task<ResponseDetail<object>> GetAccountCard(string requestJson, CancellationToken cancellationToken = default)
        {
            string? accountId = null;
            try
            {
                using JsonDocument doc = JsonDocument.Parse(requestJson);
                JsonElement root = doc.RootElement;

                static string? ReadStringPropertyCaseInsensitive(JsonElement element, string propertyName)
                {
                    if (element.ValueKind != JsonValueKind.Object) return null;

                    foreach (var property in element.EnumerateObject())
                    {
                        if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase) &&
                            property.Value.ValueKind != JsonValueKind.Null)
                        {
                            return property.Value.ValueKind == JsonValueKind.String
                                ? property.Value.GetString()
                                : property.Value.ToString();
                        }
                    }

                    return null;
                }

                accountId = ReadStringPropertyCaseInsensitive(root, "AccountID");

                if (string.IsNullOrWhiteSpace(accountId))
                {
                    foreach (var property in root.EnumerateObject())
                    {
                        if (!string.Equals(property.Name, "RequestData", StringComparison.OrdinalIgnoreCase))
                            continue;

                        if (property.Value.ValueKind == JsonValueKind.Object)
                        {
                            accountId = ReadStringPropertyCaseInsensitive(property.Value, "AccountID");
                        }
                        else if (property.Value.ValueKind == JsonValueKind.String)
                        {
                            var requestDataJson = property.Value.GetString();
                            if (!string.IsNullOrWhiteSpace(requestDataJson))
                            {
                                using JsonDocument nestedDoc = JsonDocument.Parse(requestDataJson);
                                accountId = ReadStringPropertyCaseInsensitive(nestedDoc.RootElement, "AccountID");
                            }
                        }

                        break;
                    }
                }
            }
            catch
            {
            }

            if (string.IsNullOrWhiteSpace(accountId))
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = "AccountID is required"
                };
            }

            var cards = new List<Dictionary<string, object?>>();

            var conn = _dal.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync(cancellationToken);

            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"EXECUTE {DBObjectConstants.GET_ACCOUNT_CARD} @AccountID";
            cmd.Parameters.Add(new SqlParameter("@AccountID", accountId!.Trim()));

            using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                for (int index = 0; index < reader.FieldCount; index++)
                {
                    var value = reader.IsDBNull(index) ? null : reader.GetValue(index);
                    row[reader.GetName(index)] = value;
                }
                cards.Add(row);
            }

            return new ResponseDetail<object>
            {
                Details = JsonDocument.Parse(JsonSerializer.Serialize(cards)),
                ResponseCode = "00",
                ResponseMessage = cards.Count > 0 ? "Success" : "No record found."
            };
        }

        // ── AddAccountCard ────────────────────────────────────────────────────────────
        public async Task<ResponseDetail<object>> AddAccountCard(string requestJson, CancellationToken cancellationToken = default)
        {
            return await ExecuteCardSP(requestJson, isNew: true, cancellationToken);
        }

        // ── UpdateAccountCard ─────────────────────────────────────────────────────────
        public async Task<ResponseDetail<object>> UpdateAccountCard(string requestJson, CancellationToken cancellationToken = default)
        {
            return await ExecuteCardSP(requestJson, isNew: false, cancellationToken);
        }

        // ── DeleteAccountCard ─────────────────────────────────────────────────────────
        public async Task<ResponseDetail<object>> DeleteAccountCard(string requestJson, CancellationToken cancellationToken = default)
        {
            string? trackingCardId = null;
            string? branchId = null;
            string? accountId = null;

            try
            {
                using JsonDocument doc = JsonDocument.Parse(requestJson);
                JsonElement root = doc.RootElement;

                static JsonElement ResolvePayload(JsonElement sourceRoot)
                {
                    if (sourceRoot.ValueKind != JsonValueKind.Object)
                        return sourceRoot;

                    foreach (var property in sourceRoot.EnumerateObject())
                    {
                        if (!string.Equals(property.Name, "RequestData", StringComparison.OrdinalIgnoreCase))
                            continue;

                        if (property.Value.ValueKind == JsonValueKind.Object)
                            return property.Value;

                        if (property.Value.ValueKind == JsonValueKind.String)
                        {
                            var nestedJson = property.Value.GetString();
                            if (!string.IsNullOrWhiteSpace(nestedJson))
                            {
                                using JsonDocument nestedDoc = JsonDocument.Parse(nestedJson);
                                return nestedDoc.RootElement.Clone();
                            }
                        }
                    }

                    return sourceRoot;
                }

                JsonElement payload = ResolvePayload(root);

                static bool TryGetPropertyIgnoreCase(JsonElement element, string key, out JsonElement value)
                {
                    if (element.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var property in element.EnumerateObject())
                        {
                            if (string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase))
                            {
                                value = property.Value;
                                return true;
                            }
                        }
                    }

                    value = default;
                    return false;
                }

                static string? GetString(JsonElement payloadElement, params string[] keys)
                {
                    foreach (var key in keys)
                    {
                        if (TryGetPropertyIgnoreCase(payloadElement, key, out var v) && v.ValueKind != JsonValueKind.Null)
                            return v.ValueKind == JsonValueKind.String ? v.GetString() : v.ToString();
                    }
                    return null;
                }

                trackingCardId = GetString(payload, "TrackingCardID", "TrackingID")?.Trim();
                branchId = GetString(payload, "OurBranchID", "BranchID")?.Trim();
                accountId = GetString(payload, "AccountID")?.Trim();
            }
            catch
            {
            }

            if (string.IsNullOrWhiteSpace(trackingCardId))
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = "TrackingCardID is required"
                };
            }

            if (string.IsNullOrWhiteSpace(branchId))
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = "BranchID is required"
                };
            }

            if (string.IsNullOrWhiteSpace(accountId))
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "APIEX96",
                    ResponseMessage = "AccountID is required"
                };
            }

            var conn = _dal.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open)
                await conn.OpenAsync(cancellationToken);

            using var cmd = conn.CreateCommand();
            cmd.CommandText = $"EXECUTE {DBObjectConstants.DELETE_ACCOUNT_CARD} @TrackingCardID, @BranchID, @AccountID";
            cmd.Parameters.Add(new SqlParameter("@TrackingCardID", trackingCardId));
            cmd.Parameters.Add(new SqlParameter("@BranchID", branchId));
            cmd.Parameters.Add(new SqlParameter("@AccountID", accountId));

            await cmd.ExecuteNonQueryAsync(cancellationToken);

            return new ResponseDetail<object>
            {
                ResponseCode = "00",
                ResponseMessage = "Card deleted successfully."
            };
        }

        // ── ExecuteCardSP — maps JSON payload → individual SP params ──────────────────
        private async Task<ResponseDetail<object>> ExecuteCardSP(string requestJson, bool isNew, CancellationToken cancellationToken)
        {
            try
            {
                // Parse the incoming JSON — strip the RequestData wrapper if present
                using JsonDocument doc = JsonDocument.Parse(requestJson);
                JsonElement root = doc.RootElement;

                static JsonElement ResolvePayload(JsonElement sourceRoot)
                {
                    if (sourceRoot.ValueKind != JsonValueKind.Object)
                        return sourceRoot;

                    foreach (var property in sourceRoot.EnumerateObject())
                    {
                        if (!string.Equals(property.Name, "RequestData", StringComparison.OrdinalIgnoreCase))
                            continue;

                        if (property.Value.ValueKind == JsonValueKind.Object)
                            return property.Value;

                        if (property.Value.ValueKind == JsonValueKind.String)
                        {
                            var nestedJson = property.Value.GetString();
                            if (!string.IsNullOrWhiteSpace(nestedJson))
                            {
                                using JsonDocument nestedDoc = JsonDocument.Parse(nestedJson);
                                return nestedDoc.RootElement.Clone();
                            }
                        }
                    }

                    return sourceRoot;
                }

                JsonElement payload = ResolvePayload(root);

                static bool TryGetPropertyIgnoreCase(JsonElement element, string key, out JsonElement value)
                {
                    if (element.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var property in element.EnumerateObject())
                        {
                            if (string.Equals(property.Name, key, StringComparison.OrdinalIgnoreCase))
                            {
                                value = property.Value;
                                return true;
                            }
                        }
                    }

                    value = default;
                    return false;
                }

                string? Get(params string[] keys)
                {
                    foreach (var k in keys)
                    {
                        if (TryGetPropertyIgnoreCase(payload, k, out var v) && v.ValueKind != JsonValueKind.Null)
                            return v.ValueKind == JsonValueKind.String ? v.GetString() : v.ToString();
                    }

                    return null;
                }

                bool GetBool(params string[] keys)
                {
                    foreach (var k in keys)
                        if (TryGetPropertyIgnoreCase(payload, k, out var v))
                        {
                            if (v.ValueKind == JsonValueKind.True) return true;
                            if (v.ValueKind == JsonValueKind.False) return false;
                            if (v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var n)) return n != 0;
                            if (v.ValueKind == JsonValueKind.String &&
                                bool.TryParse(v.GetString(), out var b)) return b;
                        }
                    return false;
                }

                // TrackingCardID must be INT — strip leading zeros / non-digits
                string? rawTracking = Get("TrackingCardID", "TrackingID");
                int trackingCardId = 0;
                if (!string.IsNullOrWhiteSpace(rawTracking))
                    int.TryParse(rawTracking.TrimStart('0').PadLeft(1, '0'), out trackingCardId);

                string branchId = Get("OurBranchID", "BranchID") ?? "";
                string accountId = Get("AccountID") ?? "";
                string cardName = Get("CardName", "NameOnCard") ?? "";
                string? cardId = Get("CardID", "ID");
                cardId = string.IsNullOrWhiteSpace(cardId) ? null : cardId;
                string cardProvider = Get("CardProvider", "CardProviderID") ?? "";
                string cardType = Get("CardType", "CardTypeID") ?? "";
                string remarks = Get("CardRemarks", "Remarks") ?? "";
                string createdBy = Get("CreatedBy", "OperatorID") ?? "SYSTEM";
                string modifiedBy = Get("ModifiedBy", "OperatorID") ?? "SYSTEM";
                string blockReason = Get("CardDeactivationReasonID", "Reason") ?? "";
                string reactivationRemarks = Get("ReactivationRemarks") ?? "";

                bool isApproved = GetBool("IsApproved");
                bool isExported = GetBool("IsExported", "IsCardExported");
                bool isActive = GetBool("IsActive");
                bool isCollected = GetBool("Collected", "IsCollected");

                DateTime? ParseDate(params string[] keys)
                {
                    foreach (var k in keys)
                        if (TryGetPropertyIgnoreCase(payload, k, out var v) &&
                            v.ValueKind != JsonValueKind.Null &&
                            DateTime.TryParse(v.GetString(), out var dt))
                            return dt;
                    return null;
                }

                DateTime? approvalDate = ParseDate("ApprovedDate", "ApprovalDate", "approvedDate", "approvalDate", "ApprovedOn", "approvedOn");
                DateTime? activationDate = ParseDate("ActivatedDate", "ActvationDate", "activatedDate", "actvationDate", "ActivatedOn", "activatedOn");
                DateTime? collectionDate = ParseDate("CollectionDate", "collectionDate");
                DateTime? exportedDate = ParseDate("ExportedDate", "CardExportedDate", "exportedDate", "cardExportedDate", "ExportedOn", "exportedOn");
                DateTime? startDate = ParseDate("StartDate", "startDate");
                DateTime? expiryDate = ParseDate("ExpiryDate", "expiryDate");
                DateTime? blockDate = ParseDate("DeactivationDate", "CardBlockDate", "deactivationDate", "cardBlockDate", "DeactivatedOn", "deactivatedOn");
                DateTime? reactivationDate = ParseDate("ReactivationDate", "reactivationDate", "ReactivatedOn", "reactivatedOn");

                string isNewParam = isNew ? "NEW" : "EDIT";

                var now = DateTime.Now;

                var parameters = new[]
                {
                    new SqlParameter("@TrackingCardID", trackingCardId),
                    new SqlParameter("@CardName", (object?)cardName ?? DBNull.Value),
                    new SqlParameter("@CardID", (object?)cardId ?? DBNull.Value),
                    new SqlParameter("@CardProvider", (object?)cardProvider ?? DBNull.Value),
                    new SqlParameter("@CardType", (object?)cardType ?? DBNull.Value),
                    new SqlParameter("@BranchID", (object?)branchId ?? DBNull.Value),
                    new SqlParameter("@AccountID", (object?)accountId ?? DBNull.Value),
                    new SqlParameter("@Remarks", (object?)remarks ?? DBNull.Value),
                    new SqlParameter("@CreatedBy", (object?)createdBy ?? DBNull.Value),
                    new SqlParameter("@CreatedOn", (object?)now),
                    new SqlParameter("@ModifiedBy", (object?)modifiedBy ?? DBNull.Value),
                    new SqlParameter("@ModifiedOn", (object?)now),
                    new SqlParameter("@IsNew", isNewParam),
                    new SqlParameter("@CardBlockReasonID", string.IsNullOrEmpty(blockReason) ? DBNull.Value : blockReason),
                    new SqlParameter("@ReactivationRemarks", string.IsNullOrEmpty(reactivationRemarks) ? DBNull.Value : reactivationRemarks),
                    new SqlParameter("@IsApproved", isApproved),
                    new SqlParameter("@IsClientExported", false),
                    new SqlParameter("@IsAccountExported", false),
                    new SqlParameter("@IsCardExported", isExported),
                    new SqlParameter("@IsActive", isActive),
                    new SqlParameter("@IsCollected", isCollected),
                    new SqlParameter("@ApprovalDate", (object?)approvalDate ?? DBNull.Value),
                    new SqlParameter("@ClientExportedDate", DBNull.Value),
                    new SqlParameter("@AccountExportedDate", DBNull.Value),
                    new SqlParameter("@CardExportedDate", (object?)exportedDate ?? DBNull.Value),
                    new SqlParameter("@ActvationDate", (object?)activationDate ?? DBNull.Value),
                    new SqlParameter("@CollectionDate", (object?)collectionDate ?? DBNull.Value),
                    new SqlParameter("@CardBlockDate", (object?)blockDate ?? DBNull.Value),
                    new SqlParameter("@StartDate", (object?)startDate ?? DBNull.Value),
                    new SqlParameter("@ExpiryDate", (object?)expiryDate ?? DBNull.Value),
                    new SqlParameter("@ReactivationDate", (object?)reactivationDate ?? DBNull.Value),
                };

                // p_AddEditElectronicCard does NOT return a result set — it just runs.
                // Execute non-query and return synthetic success.
                var conn = _dal.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open)
                    await conn.OpenAsync(cancellationToken);

                using var cmd = conn.CreateCommand();
                cmd.CommandText = $"EXECUTE {DBObjectConstants.ADD_ACCOUNT_CARD} " +
                    "@TrackingCardID, @CardName, @CardID, @CardProvider, @CardType, " +
                    "@BranchID, @AccountID, @Remarks, @CreatedBy, @CreatedOn, " +
                    "@ModifiedBy, @ModifiedOn, @IsNew, @CardBlockReasonID, @ReactivationRemarks, " +
                    "@IsApproved, @IsClientExported, @IsAccountExported, @IsCardExported, " +
                    "@IsActive, @IsCollected, @ApprovalDate, @ClientExportedDate, " +
                    "@AccountExportedDate, @CardExportedDate, @ActvationDate, " +
                    "@CollectionDate, @CardBlockDate, @StartDate, @ExpiryDate, @ReactivationDate";

                cmd.Parameters.AddRange(parameters);

                await cmd.ExecuteNonQueryAsync(cancellationToken);

                return new ResponseDetail<object>
                {
                    ResponseCode = "00",
                    ResponseMessage = isNew ? "Card created successfully." : "Card updated successfully."
                };
            }
            catch (SqlException ex) when (ex.Message.StartsWith("BREX"))
            {
                // SP raised a business rule error
                return new ResponseDetail<object>
                {
                    ResponseCode = "99",
                    ResponseMessage = ex.Message
                };
            }
            catch (Exception ex)
            {
                return new ResponseDetail<object>
                {
                    ResponseCode = "99",
                    ResponseMessage = "Error executing card operation: " + ex.Message
                };
            }
        }
    }
}
