using ClientDocumentApi.Contracts;
using ClientDocumentApi.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Text.Json;

namespace ClientDocumentApi.Services
{
    public class CommonRepository : ICommonRepository
    {
        private readonly DocumentDbContext _context;
        private readonly ILogger<CommonRepository> _logger;

        private sealed record ProcedureResponse(string ResponseCode, string? ResponseMessage, string? Details);

        public CommonRepository(DocumentDbContext context, ILogger<CommonRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<SystemCodeResponse> GetSystemCodesAsync(List<string> codeIds, CancellationToken cancellationToken = default)
        {
            try
            {
                if (codeIds == null || codeIds.Count == 0)
                {
                    return new SystemCodeResponse
                    {
                        ResponseCode = "96",
                        ResponseMessage = "CodeIds list cannot be empty",
                        Details = new List<SystemCodeDetail>()
                    };
                }

                // Convert list to JSON array string
                var jsonCodeIds = JsonSerializer.Serialize(codeIds);

                // Use SqlQueryRaw to execute stored procedure with parameters
                var strategy = _context.Database.CreateExecutionStrategy();
                return await strategy.ExecuteAsync(async () =>
                {
                    var results = await _context.Database.SqlQueryRaw<ProcedureResponse>(
                        "EXEC p_V8_GetSystemCodesList @CodeIDs = @CodeIDs",
                        new SqlParameter("@CodeIDs", SqlDbType.VarChar) { Size = 1000, Value = jsonCodeIds }
                    ).ToListAsync(cancellationToken);

                    var result = results.FirstOrDefault();
                    var responseCode = result?.ResponseCode ?? string.Empty;
                    var responseMessage = result?.ResponseMessage;
                    var detailsJson = result?.Details;

                    if (!string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase))
                    {
                        return new SystemCodeResponse
                        {
                            ResponseCode = responseCode,
                            ResponseMessage = responseMessage,
                            Details = new List<SystemCodeDetail>()
                        };
                    }

                    if (string.IsNullOrWhiteSpace(detailsJson))
                    {
                        return new SystemCodeResponse
                        {
                            ResponseCode = "96",
                            ResponseMessage = "No details returned from stored procedure",
                            Details = new List<SystemCodeDetail>()
                        };
                    }

                    try
                    {
                        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                        var details = JsonSerializer.Deserialize<List<SystemCodeDetail>>(detailsJson, options) 
                            ?? new List<SystemCodeDetail>();

                        return new SystemCodeResponse
                        {
                            ResponseCode = responseCode,
                            ResponseMessage = responseMessage,
                            Details = details
                        };
                    }
                    catch (JsonException jex)
                    {
                        _logger.LogError(jex, "JSON parsing error while reading system codes details");
                        return new SystemCodeResponse
                        {
                            ResponseCode = "96",
                            ResponseMessage = $"JSON parsing error: {jex.Message}",
                            Details = new List<SystemCodeDetail>()
                        };
                    }
                });
            }
            catch (SqlException sqlEx)
            {
                _logger.LogError(sqlEx, "SQL error while fetching system codes");
                return new SystemCodeResponse
                {
                    ResponseCode = "99",
                    ResponseMessage = $"Database error: {sqlEx.Message}",
                    Details = new List<SystemCodeDetail>()
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while fetching system codes");
                return new SystemCodeResponse
                {
                    ResponseCode = "99",
                    ResponseMessage = $"Error: {ex.Message}",
                    Details = new List<SystemCodeDetail>()
                };
            }
        }
    }
}
