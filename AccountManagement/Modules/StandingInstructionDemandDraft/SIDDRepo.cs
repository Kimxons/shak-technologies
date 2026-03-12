using CBS.Entities.Common;
using AccountManagement.Helpers;
using AccountManagement.Modules.AccountMaintenance;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;
using System.Runtime.CompilerServices;
using System.Text.Json;

namespace AccountManagement.Modules.StandingInstructionDemandDraft
{
    /// <summary>Lightweight DTO returned by the SI search query.</summary>
    public class SISearchItem
    {
        public string? OurBranchID    { get; set; } = string.Empty;
        public string? SIID           { get; set; } = string.Empty;
        public string? DebitAccountID { get; set; } = string.Empty;
        public string? AccountName    { get; set; } = string.Empty;
        public string? ReferenceNo    { get; set; } = string.Empty;
    }

    public class SIDDRepo : ISIDDRepo
    {
        private readonly CommonDBCtxt _dal;

        public SIDDRepo(CommonDBCtxt dal)
        {
            _dal = dal;
        }

        /// <summary>Extracts OurBranchID from a request JSON string.</summary>
        private static string ExtractBranchId(string requestJson)
        {
            try
            {
                var el = JsonSerializer.Deserialize<JsonElement>(requestJson);
                return el.TryGetProperty("OurBranchID", out var b) ? (b.GetString() ?? "") : "";
            }
            catch { return ""; }
        }

        private static string ExtractSiId(string requestJson)
        {
            try
            {
                var el = JsonSerializer.Deserialize<JsonElement>(requestJson);
                if (el.TryGetProperty("SIID", out var siId))
                    return siId.GetString() ?? "";

                if (el.TryGetProperty("StandingInstructionID", out var standingInstructionId))
                    return standingInstructionId.GetString() ?? "";

                if (el.TryGetProperty("SearchID", out var searchId))
                    return searchId.GetString() ?? "";

                return "";
            }
            catch { return ""; }
        }

        private static string ExtractOperatorId(string requestJson)
        {
            try
            {
                var el = JsonSerializer.Deserialize<JsonElement>(requestJson);
                return el.TryGetProperty("OperatorID", out var operatorId) ? (operatorId.GetString() ?? "") : "";
            }
            catch { return ""; }
        }

        private static short ExtractDirection(string requestJson)
        {
            try
            {
                var el = JsonSerializer.Deserialize<JsonElement>(requestJson);
                if (!el.TryGetProperty("Direction", out var direction))
                    return 0;

                return direction.ValueKind switch
                {
                    JsonValueKind.Number => direction.TryGetInt16(out var numericDirection) ? numericDirection : (short)0,
                    JsonValueKind.String => short.TryParse(direction.GetString(), out var parsedDirection) ? parsedDirection : (short)0,
                    _ => 0
                };
            }
            catch { return 0; }
        }

        private static byte ExtractReferenceNo(string requestJson)
        {
            try
            {
                var el = JsonSerializer.Deserialize<JsonElement>(requestJson);
                if (!el.TryGetProperty("ReferenceNo", out var referenceNo))
                    return 0;

                return referenceNo.ValueKind switch
                {
                    JsonValueKind.Number => referenceNo.TryGetByte(out var numericReferenceNo) ? numericReferenceNo : (byte)0,
                    JsonValueKind.String => byte.TryParse(referenceNo.GetString(), out var parsedReferenceNo) ? parsedReferenceNo : (byte)0,
                    _ => 0
                };
            }
            catch { return 0; }
        }

        /// <summary>Executes a DD stored procedure that requires both @RequestData and @OurBranchID params.</summary>
        private ResponseDetail<object> ExecDDProc(string procName, string requestJson)
        {
            string branchId = ExtractBranchId(requestJson);
            ResponseDetail<string> respStr = _dal.Data
                .FromSqlInterpolated(FormattableStringFactory.Create(
                    $"EXECUTE {procName} @RequestData={{0}}, @OurBranchID={{1}}", requestJson, branchId))
                .AsEnumerable().FirstOrDefault()!;
            return new ResponseDetail<object>
            {
                Details = string.IsNullOrEmpty(respStr?.Details) ? null : System.Text.Json.JsonDocument.Parse(respStr.Details!),
                ResponseCode = respStr?.ResponseCode ?? string.Empty,
                ResponseMessage = respStr?.ResponseMessage ?? string.Empty
            };
        }

        private static void MergeCurrentRow(DbDataReader reader, IDictionary<string, object?> target)
        {
            for (int i = 0; i < reader.FieldCount; i++)
            {
                object? value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                target[reader.GetName(i)] = value;
            }
        }

        private static void SetAlias(IDictionary<string, object?> record, string sourceKey, string targetKey)
        {
            if (record.ContainsKey(targetKey))
                return;

            if (record.TryGetValue(sourceKey, out var value))
                record[targetKey] = value;
        }

        private static void NormalizeGetRecord(IDictionary<string, object?> record)
        {
            SetAlias(record, "DebitAccountID", "AccountID");
            SetAlias(record, "SIID", "StandingInstructionID");
            SetAlias(record, "SITypeID", "SITransferType");
            SetAlias(record, "TrfCurrencyID", "TransferCurrencyID");
            SetAlias(record, "TrfCurrency", "CurrencyName");
            SetAlias(record, "AmountTypeID", "AmountIn");
            SetAlias(record, "Amount", "FixedAmount");
            SetAlias(record, "IsAccountPayee", "AccountPayee");
            SetAlias(record, "CreditAccountID", "PayeeAccountID");
            SetAlias(record, "TrfFrequencyID", "TransferFrequency");
            SetAlias(record, "NoOfExecutions", "NoOfExecution");
            SetAlias(record, "ChargeTypeID", "ChargeRecovery");
            SetAlias(record, "MailingAddressID", "MailingAddress");
            SetAlias(record, "CityID", "City");
            SetAlias(record, "LastProcessedStatus", "LastRunStatus");
            SetAlias(record, "NoOfFailedExecutions", "NoOfTimesFailed");
        }

        public async Task<ResponseDetail<object>> GetSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
        {
            string branchId = ExtractBranchId(requestJson);
            string siId = ExtractSiId(requestJson);
            string operatorId = ExtractOperatorId(requestJson);
            byte referenceNo = ExtractReferenceNo(requestJson);
            short direction = ExtractDirection(requestJson);

            await using DbConnection connection = _dal.Database.GetDbConnection();
            bool shouldCloseConnection = connection.State != ConnectionState.Open;

            if (shouldCloseConnection)
                await connection.OpenAsync(cancellationToken);

            try
            {
                await using DbCommand command = connection.CreateCommand();
                command.CommandText = DBObjectConstants.GET_SI_DD;
                command.CommandType = CommandType.StoredProcedure;

                DbParameter branchParam = command.CreateParameter();
                branchParam.ParameterName = "@OurBranchID";
                branchParam.Value = branchId;
                command.Parameters.Add(branchParam);

                DbParameter siParam = command.CreateParameter();
                siParam.ParameterName = "@SIID";
                siParam.Value = siId;
                command.Parameters.Add(siParam);

                DbParameter referenceParam = command.CreateParameter();
                referenceParam.ParameterName = "@ReferenceNo";
                referenceParam.Value = referenceNo;
                command.Parameters.Add(referenceParam);

                DbParameter operatorParam = command.CreateParameter();
                operatorParam.ParameterName = "@OperatorID";
                operatorParam.Value = operatorId;
                command.Parameters.Add(operatorParam);

                DbParameter directionParam = command.CreateParameter();
                directionParam.ParameterName = "@Direction";
                directionParam.Value = direction;
                command.Parameters.Add(directionParam);

                Dictionary<string, object?> record = new(StringComparer.OrdinalIgnoreCase);
                bool foundMainRecord = false;

                await using DbDataReader reader = await command.ExecuteReaderAsync(cancellationToken);
                do
                {
                    if (!await reader.ReadAsync(cancellationToken))
                    {
                        continue;
                    }

                    bool isMainRecordResult = false;
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        if (string.Equals(columnName, "SIID", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(columnName, "DebitAccountID", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(columnName, "ReferenceNo", StringComparison.OrdinalIgnoreCase))
                        {
                            isMainRecordResult = true;
                            break;
                        }
                    }

                    MergeCurrentRow(reader, record);
                    if (isMainRecordResult)
                        foundMainRecord = true;
                }
                while (await reader.NextResultAsync(cancellationToken));

                if (!foundMainRecord)
                {
                    return new ResponseDetail<object>
                    {
                        ResponseCode = "01",
                        ResponseMessage = "No records found",
                        Details = null
                    };
                }

                NormalizeGetRecord(record);

                return new ResponseDetail<object>
                {
                    ResponseCode = "00",
                    ResponseMessage = "Success",
                    Details = record
                };
            }
            finally
            {
                if (shouldCloseConnection)
                    await connection.CloseAsync();
            }
        }

        public async Task<ResponseDetail<object>> CreateSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
            => ExecDDProc(DBObjectConstants.ADD_SI_DD, requestJson);

        public async Task<ResponseDetail<object>> UpdateSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
            => ExecDDProc(DBObjectConstants.UPDATE_SI_DD, requestJson);

        public async Task<ResponseDetail<object>> DeleteSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
            => ExecDDProc(DBObjectConstants.DELETE_SI_DD, requestJson);

        public async Task<ResponseDetail<object>> StopSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
            => ExecDDProc(DBObjectConstants.STOP_SI_DD, requestJson);

        public async Task<ResponseDetail<object>> SearchSIDemandDraft(string requestJson, CancellationToken cancellationToken = default)
        {
            var req = JsonSerializer.Deserialize<JsonElement>(requestJson);
            string branchId    = req.TryGetProperty("OurBranchID",     out var b) ? (b.GetString() ?? "") : "";
            string siId        = req.TryGetProperty("SIID",            out var s) ? (s.GetString() ?? "") : "";
            string accountId   = req.TryGetProperty("DebitAccountID",  out var a) ? (a.GetString() ?? "") : "";

            var branchParam  = new SqlParameter("@branchId",  branchId);
            var siParam      = new SqlParameter("@siId",      siId);
            var accountParam = new SqlParameter("@accountId", accountId);

            var items = await _dal.Database
                .SqlQueryRaw<SISearchItem>(
                    @"SELECT TOP 50
                           t.OurBranchID,
                           t.SIID,
                           t.DebitAccountID,
                           ISNULL((SELECT TOP 1 Name FROM t_AccountCustomer WHERE AccountID = t.DebitAccountID), '') AS AccountName,
                           ISNULL(CAST(t.ReferenceNo AS NVARCHAR(50)), '') AS ReferenceNo
                      FROM t_StandingInstruction t
                     WHERE t.OurBranchID = @branchId
                       AND t.ModuleID    = 1920
                       AND (@siId      = '' OR t.SIID          LIKE '%' + @siId      + '%')
                       AND (@accountId = '' OR t.DebitAccountID LIKE '%' + @accountId + '%')",
                    branchParam, siParam, accountParam)
                .ToListAsync(cancellationToken);

            if (items.Count == 0)
                return new ResponseDetail<object> { ResponseCode = "01", ResponseMessage = "No records found", Details = null };

            return new ResponseDetail<object>
            {
                ResponseCode    = "00",
                ResponseMessage = "Success",
                Details         = items
            };
        }
    }
}
