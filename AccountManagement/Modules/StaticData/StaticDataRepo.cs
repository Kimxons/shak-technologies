using AccountManagement.Modules.AccountMaintenance;
using CBS.Entities.Common;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using System.Text.Json;

namespace AccountManagement.Modules.StaticData
{
    public class StaticDataRepo : IStaticDataRepo
    {
        private readonly CommonDBCtxt _dal;

        public StaticDataRepo(CommonDBCtxt dal)
        {
            _dal = dal;
        }

        /// <summary>
        /// Extracts the inner RequestData object from the InData envelope JSON.
        /// </summary>
        private static JsonElement GetRequestDataElement(string requestJson)
        {
            using var doc = JsonDocument.Parse(requestJson);
            var root = doc.RootElement;

            if (!root.TryGetProperty("RequestData", out var rd))
                return root.Clone();

            if (rd.ValueKind == JsonValueKind.String)
            {
                using var inner = JsonDocument.Parse(rd.GetString()!);
                return inner.RootElement.Clone();
            }

            return rd.Clone();
        }

        private static string GetString(JsonElement el, string propertyName, string fallback = "")
        {
            return el.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String
                ? prop.GetString() ?? fallback
                : fallback;
        }

        private static int GetInt(JsonElement el, string propertyName, int fallback = 0)
        {
            if (!el.TryGetProperty(propertyName, out var prop)) return fallback;
            return prop.ValueKind == JsonValueKind.Number ? prop.GetInt32() : fallback;
        }

        private static bool GetBool(JsonElement el, string propertyName)
        {
            if (!el.TryGetProperty(propertyName, out var prop)) return false;
            return prop.ValueKind switch
            {
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.String => prop.GetString()?.Equals("true", StringComparison.OrdinalIgnoreCase) == true
                    || prop.GetString() == "1",
                JsonValueKind.Number => prop.GetInt32() != 0,
                _ => false
            };
        }

        /// <summary>
        /// Executes a SP using raw ADO.NET and reads whatever columns it returns,
        /// wrapping the result rows into a ResponseDetail envelope.
        /// This handles SPs that return raw data columns instead of Details/ResponseCode/ResponseMessage.
        /// </summary>
        private async Task<ResponseDetail<object>> ExecuteSpRaw(
            string spName,
            SqlParameter[] parameters,
            CancellationToken cancellationToken)
        {
            var connection = _dal.Database.GetDbConnection();
            var wasOpen = connection.State == System.Data.ConnectionState.Open;
            if (!wasOpen) await connection.OpenAsync(cancellationToken);

            try
            {
                using var cmd = connection.CreateCommand();
                cmd.CommandText = spName;
                cmd.CommandType = System.Data.CommandType.StoredProcedure;
                cmd.CommandTimeout = 360;
                cmd.Parameters.AddRange(parameters);

                if (_dal.Database.CurrentTransaction != null)
                    cmd.Transaction = _dal.Database.CurrentTransaction.GetDbTransaction();

                using var reader = await cmd.ExecuteReaderAsync(cancellationToken);

                // Check if result set has the standard envelope columns
                var fieldNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < reader.FieldCount; i++)
                    fieldNames.Add(reader.GetName(i));

                bool hasEnvelope = fieldNames.Contains("ResponseCode") && fieldNames.Contains("ResponseMessage");

                if (hasEnvelope && fieldNames.Contains("Details"))
                {
                    // Standard envelope — read it directly
                    if (await reader.ReadAsync(cancellationToken))
                    {
                        var details = reader["Details"]?.ToString();
                        return new ResponseDetail<object>
                        {
                            ResponseCode = reader["ResponseCode"]?.ToString() ?? "",
                            ResponseMessage = reader["ResponseMessage"]?.ToString() ?? "",
                            Details = string.IsNullOrEmpty(details) ? null : JsonDocument.Parse(details)
                        };
                    }

                    return new ResponseDetail<object> { ResponseCode = "00", ResponseMessage = "No data" };
                }

                // Raw columns — serialize rows to JSON array and wrap
                var rows = new List<Dictionary<string, object?>>();
                while (await reader.ReadAsync(cancellationToken))
                {
                    var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        var name = reader.GetName(i);
                        var value = reader.IsDBNull(i) ? null : reader.GetValue(i);
                        row[name] = value;
                    }
                    rows.Add(row);
                }

                if (rows.Count == 0)
                {
                    // Check if there's a ResponseCode/ResponseMessage without Details
                    return new ResponseDetail<object>
                    {
                        ResponseCode = "01",
                        ResponseMessage = "Record not found"
                    };
                }

                var json = JsonSerializer.Serialize(rows);
                return new ResponseDetail<object>
                {
                    ResponseCode = "00",
                    ResponseMessage = "Success",
                    Details = JsonDocument.Parse(json)
                };
            }
            finally
            {
                if (!wasOpen && connection.State == System.Data.ConnectionState.Open)
                    await connection.CloseAsync();
            }
        }

        public async Task<ResponseDetail<object>> GetLocation(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@LocationID", GetString(data, "LocationID")),
                new SqlParameter("@Direction", GetInt(data, "Direction"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.GET_LOCATION, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> AddEditLocation(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@LocationID", GetString(data, "LocationID")),
                new SqlParameter("@LocationName", GetString(data, "LocationName")),
                new SqlParameter("@Building", GetString(data, "Building")),
                new SqlParameter("@RoomOffice", GetString(data, "RoomOffice")),
                new SqlParameter("@Store", GetBool(data, "Store")),
                new SqlParameter("@CreatedBy", GetString(data, "CreatedBy")),
                new SqlParameter("@CreatedOn", GetString(data, "CreatedOn")),
                new SqlParameter("@ModifiedBy", GetString(data, "ModifiedBy")),
                new SqlParameter("@ModifiedOn", GetString(data, "ModifiedOn")),
                new SqlParameter("@NewRecord", GetInt(data, "NewRecord")),
                new SqlParameter("@OperatorID", GetString(data, "OperatorID"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.ADD_EDIT_LOCATION, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> DeleteLocation(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@LocationID", GetString(data, "LocationID")),
                new SqlParameter("@OperatorID", GetString(data, "OperatorID"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.DELETE_LOCATION, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> GetContactPerson(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@ContactPersonID", GetString(data, "ContactPersonID")),
                new SqlParameter("@Direction", GetInt(data, "Direction"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.GET_CONTACT_PERSON, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> AddEditContactPerson(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@ContactPersonID", GetString(data, "ContactPersonID")),
                new SqlParameter("@ContactPersonDesc", GetString(data, "ContactPersonDesc")),
                new SqlParameter("@Title", GetString(data, "Title")),
                new SqlParameter("@Phone", GetString(data, "Phone")),
                new SqlParameter("@Email", GetString(data, "Email")),
                new SqlParameter("@IsActive", GetBool(data, "IsActive")),
                new SqlParameter("@CreatedBy", GetString(data, "CreatedBy")),
                new SqlParameter("@CreatedOn", GetString(data, "CreatedOn")),
                new SqlParameter("@ModifiedBy", GetString(data, "ModifiedBy")),
                new SqlParameter("@ModifiedOn", GetString(data, "ModifiedOn")),
                new SqlParameter("@NewRecord", GetInt(data, "NewRecord")),
                new SqlParameter("@OperatorID", GetString(data, "OperatorID"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.ADD_EDIT_CONTACT_PERSON, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> DeleteContactPerson(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@ContactPersonID", GetString(data, "ContactPersonID")),
                new SqlParameter("@OperatorID", GetString(data, "OperatorID"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.DELETE_CONTACT_PERSON, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> GetCustodian(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@CustodianID", GetString(data, "CustodianID")),
                new SqlParameter("@Direction", GetInt(data, "Direction"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.GET_CUSTODIAN, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> AddEditCustodian(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@CustodianID", GetString(data, "CustodianID")),
                new SqlParameter("@Name", GetString(data, "Name")),
                new SqlParameter("@Department", GetString(data, "Department")),
                new SqlParameter("@Section", GetString(data, "Section")),
                new SqlParameter("@CreatedBy", GetString(data, "CreatedBy")),
                new SqlParameter("@CreatedOn", GetString(data, "CreatedOn")),
                new SqlParameter("@ModifiedBy", GetString(data, "ModifiedBy")),
                new SqlParameter("@ModifiedOn", GetString(data, "ModifiedOn")),
                new SqlParameter("@NewRecord", GetInt(data, "NewRecord"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.ADD_EDIT_CUSTODIAN, parameters, cancellationToken);
        }

        public async Task<ResponseDetail<object>> DeleteCustodian(string requestJson, CancellationToken cancellationToken = default)
        {
            var data = GetRequestDataElement(requestJson);
            var parameters = new[]
            {
                new SqlParameter("@CustodianID", GetString(data, "CustodianID")),
                new SqlParameter("@OperatorID", GetString(data, "OperatorID"))
            };

            return await ExecuteSpRaw(StaticDataDbConstants.DELETE_CUSTODIAN, parameters, cancellationToken);
        }
    }
}
