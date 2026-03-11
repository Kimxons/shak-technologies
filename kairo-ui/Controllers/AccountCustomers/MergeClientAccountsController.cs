using kairo_ui.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace kairo_ui.Controllers.AccountCustomers
{
    [Route("AccountCustomers")]
    public class MergeClientAccountsController : Controller
    {
        private const string OldApiClientName = "OldApi";

        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;
        private readonly ILogger<MergeClientAccountsController> _logger;

        public MergeClientAccountsController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<MergeClientAccountsController> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _logger = logger;
        }

        [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
        [HttpGet("MergeClientAccounts")]
        [HttpGet("frmMergeClientAccounts.aspx")]
        public IActionResult Index(string? moduleId = null)
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Merge Client Accounts");
                return RedirectToAction("Index", "Login");
            }

            Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate";
            Response.Headers["Pragma"] = "no-cache";
            Response.Headers["Expires"] = "0";

            ViewData["ModuleId"] = string.IsNullOrWhiteSpace(moduleId)
                ? (Request.Query["ModuleID"].ToString() ?? string.Empty)
                : moduleId;

            return View("~/Views/AccountCustomers/MergeClientAccounts/Index.cshtml");
        }

        [HttpPost("MergeClientAccounts/resolve-branch")]
        public async Task<IActionResult> ResolveBranch([FromBody] MergeBranchLookupRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                if (string.IsNullOrWhiteSpace(requestData?.BranchId))
                {
                    return BadRequest(new { success = false, message = "Branch ID is required." });
                }

                var branch = await FindBranchAsync(requestData.BranchId);
                if (branch is null)
                {
                    return Ok(new { success = false, message = "Branch not found." });
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        branchId = GetString(branch.Value, "BranchID", "OurBranchID", "SubCodeID"),
                        branchName = GetString(branch.Value, "BranchName", "Description", "Name")
                    },
                    message = "Branch resolved."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving branch for merge client accounts");
                return StatusCode(500, new { success = false, message = "Error resolving branch." });
            }
        }

        [HttpPost("MergeClientAccounts/resolve-client")]
        public async Task<IActionResult> ResolveClient([FromBody] MergeClientLookupRequest requestData)
        {
            var inputId = requestData?.ClientId?.Trim();

            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                if (string.IsNullOrWhiteSpace(inputId))
                {
                    return BadRequest(new { success = false, message = "Client/Account ID is required." });
                }

                var branchId = requestData?.OurBranchID ?? ResolveBranchId();
                var resolvedClient = await ResolveClientInputAsync(branchId, inputId);

                if (!resolvedClient.Found)
                {
                    return Ok(new { success = false, message = $"Client/Account {inputId} was not found." });
                }

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        clientId = resolvedClient.ClientId,
                        clientName = resolvedClient.ClientName,
                        matchedBy = resolvedClient.MatchedByAccount ? "account" : "client",
                        matchedAccountId = resolvedClient.AccountId
                    },
                    message = resolvedClient.MatchedByAccount
                        ? $"Resolved client using account {resolvedClient.AccountId ?? inputId}."
                        : "Client resolved."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error resolving client for merge client accounts");
                return Ok(new
                {
                    success = false,
                    message = string.IsNullOrWhiteSpace(inputId)
                        ? "Unable to resolve Client/Account ID."
                        : $"Client/Account {inputId} was not found."
                });
            }
        }

        [HttpPost("MergeClientAccounts/search-clients")]
        public async Task<IActionResult> SearchClients([FromBody] MergeClientSearchRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                var branchId = requestData?.OurBranchID ?? ResolveBranchId();
                var searchKey = requestData?.ClientID?.Trim();

                if (string.IsNullOrWhiteSpace(searchKey))
                {
                    searchKey = requestData?.Name?.Trim();
                }

                if (string.IsNullOrWhiteSpace(searchKey))
                {
                    searchKey = requestData?.IDNumber?.Trim();
                }

                if (string.IsNullOrWhiteSpace(searchKey))
                {
                    searchKey = requestData?.MobileNo?.Trim();
                }

                if (string.IsNullOrWhiteSpace(searchKey))
                {
                    searchKey = requestData?.ClientApplicationID?.Trim();
                }

                if (string.IsNullOrWhiteSpace(searchKey))
                {
                    searchKey = requestData?.AccountID?.Trim();
                }

                if (string.IsNullOrWhiteSpace(searchKey))
                {
                    searchKey = requestData?.MotherName?.Trim();
                }

                var rows = await SearchRowsByTableAsync("ClientID", branchId, searchKey ?? string.Empty);

                return Ok(new
                {
                    success = true,
                    data = rows,
                    message = rows.Count == 0
                        ? "No clients found."
                        : $"Found {rows.Count} client record(s)."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching clients for merge client accounts");
                return StatusCode(500, new { success = false, message = "Error searching clients." });
            }
        }

        [HttpPost("MergeClientAccounts/search-branches")]
        public async Task<IActionResult> SearchBranches([FromBody] MergeBranchSearchRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiClientName,
                    OldApiDBConstants.SEARCH_SYSTEM_BRANCHES,
                    new
                    {
                        BankID = ResolveBankId()
                    });

                var branches = ExtractRows(response).ToList();

                return Ok(new
                {
                    success = true,
                    data = branches,
                    message = branches.Count == 0
                        ? "No branches found."
                        : $"Found {branches.Count} branch record(s)."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching branches for merge client accounts");
                return StatusCode(500, new { success = false, message = "Error searching branches." });
            }
        }

        [HttpPost("MergeClientAccounts/view-accounts")]
        public async Task<IActionResult> ViewAccounts([FromBody] MergeAccountsViewRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                if (requestData is null)
                {
                    return BadRequest(new { success = false, message = "Request data is required." });
                }

                var branchId = requestData.OurBranchID ?? ResolveBranchId();
                var fromInput = requestData.FromClientID?.Trim();
                var toInput = requestData.ToClientID?.Trim();

                if (string.IsNullOrWhiteSpace(fromInput) || string.IsNullOrWhiteSpace(toInput))
                {
                    return BadRequest(new { success = false, message = "Source and target Client/Account IDs are required." });
                }

                var sourceResolved = await ResolveClientInputAsync(branchId, fromInput);
                var targetResolved = await ResolveClientInputAsync(branchId, toInput);

                if (!sourceResolved.Found)
                {
                    return Ok(new { success = false, message = $"Client/Account {fromInput} was not found." });
                }

                if (!targetResolved.Found)
                {
                    return Ok(new { success = false, message = $"Client/Account {toInput} was not found." });
                }

                var fromClientId = sourceResolved.ClientId;
                var toClientId = targetResolved.ClientId;

                if (string.Equals(fromClientId, toClientId, StringComparison.OrdinalIgnoreCase))
                {
                    return Ok(new { success = false, message = "Source and target clients must be different." });
                }

                var branch = await FindBranchAsync(branchId);
                var sourceClient = sourceResolved.ClientRow ?? await FindClientAsync(branchId, fromClientId);
                var targetClient = targetResolved.ClientRow ?? await FindClientAsync(branchId, toClientId);

                var fromAccounts = await GetClientAccountsAsync(branchId, fromClientId);
                var toAccounts = await GetClientAccountsAsync(branchId, toClientId);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        branch = new
                        {
                            branchId = branchId,
                            branchName = branch is null
                                ? (HttpContext.Session.GetString("branch_name") ?? string.Empty)
                                : GetString(branch.Value, "BranchName", "Description", "Name")
                        },
                        sourceClient = new
                        {
                            clientId = fromClientId,
                            clientName = sourceResolved.ClientName,
                            inputId = fromInput,
                            matchedBy = sourceResolved.MatchedByAccount ? "account" : "client",
                            matchedAccountId = sourceResolved.AccountId
                        },
                        targetClient = new
                        {
                            clientId = toClientId,
                            clientName = targetResolved.ClientName,
                            inputId = toInput,
                            matchedBy = targetResolved.MatchedByAccount ? "account" : "client",
                            matchedAccountId = targetResolved.AccountId
                        },
                        fromAccounts,
                        toAccounts
                    },
                    message = $"Loaded {fromAccounts.Count} source account(s) and {toAccounts.Count} target account(s)."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading merge client accounts");
                return StatusCode(500, new { success = false, message = "Error loading client accounts." });
            }
        }

        [HttpPost("MergeClientAccounts/merge")]
        public async Task<IActionResult> Merge([FromBody] MergeAccountsSubmitRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { success = false, message = "Not authenticated" });
                }

                if (requestData is null)
                {
                    return BadRequest(new { success = false, message = "Request data is required." });
                }

                var branchId = requestData.OurBranchID ?? ResolveBranchId();
                var fromClientId = requestData.FromClientID?.Trim();
                var toClientId = requestData.ToClientID?.Trim();
                var selectedAccount = string.IsNullOrWhiteSpace(requestData.SelectedAccount)
                    ? requestData.Accounts?.Trim()
                    : requestData.SelectedAccount.Trim();
                var moduleId = requestData.ModuleID > 0 ? requestData.ModuleID : 0;

                if (string.IsNullOrWhiteSpace(fromClientId) ||
                    string.IsNullOrWhiteSpace(toClientId) ||
                    string.IsNullOrWhiteSpace(selectedAccount))
                {
                    return BadRequest(new { success = false, message = "Source client, target client, and selected accounts are required." });
                }

                if (string.Equals(fromClientId, toClientId, StringComparison.OrdinalIgnoreCase))
                {
                    return Ok(new { success = false, message = "Source and target clients must be different." });
                }

                var response = await _oldApiService.CreateAsync<JsonElement>(
                    OldApiClientName,
                    OldApiDBConstants.MERGE_ACCOUNTS,
                    new
                    {
                        OurBranchID = branchId,
                        ModuleID = moduleId,
                        OperatorID = ResolveOperatorId(),
                        FromClientID = fromClientId,
                        ToClientID = toClientId,
                        SelectedAccount = selectedAccount
                    });

                var success = IsSuccessfulResponse(response);
                var message = ExtractResponseMessage(
                    response,
                    success ? "Merge completed successfully." : "Merge failed.");

                return Ok(new
                {
                    success,
                    message,
                    data = response
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error merging client accounts");
                return StatusCode(500, new { success = false, message = "Error merging client accounts." });
            }
        }

        private async Task<JsonElement?> FindBranchAsync(string? branchId)
        {
            if (string.IsNullOrWhiteSpace(branchId))
            {
                return null;
            }

            var response = await _oldApiService.CreateAsync<JsonElement>(
                OldApiClientName,
                OldApiDBConstants.SEARCH_SYSTEM_BRANCHES,
                new
                {
                    BankID = ResolveBankId(),
                    OperatorID = ResolveOperatorId()
                });

            foreach (var row in ExtractRows(response))
            {
                if (string.Equals(
                    GetString(row, "BranchID", "OurBranchID", "SubCodeID"),
                    branchId,
                    StringComparison.OrdinalIgnoreCase))
                {
                    return row;
                }
            }

            return null;
        }

        private async Task<JsonElement?> FindClientAsync(string? branchId, string clientId)
        {
            var normalizedInput = NormalizeLookupId(clientId);
            foreach (var row in await SearchRowsByTableAsync("ClientID", branchId, clientId))
            {
                if (IsLookupMatch(
                    GetString(row, "ClientID", "ID", "CustomerID", "CustomerCode"),
                    normalizedInput))
                {
                    return row;
                }
            }

            return null;
        }

        private async Task<JsonElement?> FindAccountAsync(string? branchId, string accountId)
        {
            var normalizedInput = NormalizeLookupId(accountId);
            foreach (var row in await SearchRowsByTableAsync("AccountID", branchId, accountId))
            {
                if (IsLookupMatch(
                    GetString(row, "AccountID", "ID", "AccountNo", "AccountNumber", "AccountShortCode", "LegacyAccountID"),
                    normalizedInput))
                {
                    return row;
                }
            }

            return null;
        }

        private async Task<ResolvedClientIdentity> ResolveClientInputAsync(string? branchId, string inputId)
        {
            var normalizedInput = NormalizeLookupId(inputId);

            var client = await TryFindClientAsync(branchId, normalizedInput)
                ?? await TryFindClientAsync(null, normalizedInput);
            if (client is not null)
            {
                return new ResolvedClientIdentity
                {
                    Found = true,
                    ClientId = GetString(client.Value, "ClientID", "ID", "CustomerID", "CustomerCode") ?? normalizedInput,
                    ClientName = GetString(client.Value, "ClientName", "Name", "FullName") ?? string.Empty,
                    ClientRow = client,
                    MatchedByAccount = false,
                    AccountId = null
                };
            }

            var account = await TryFindAccountAsync(branchId, normalizedInput)
                ?? await TryFindAccountAsync(null, normalizedInput);
            if (account is null)
            {
                return new ResolvedClientIdentity { Found = false };
            }

            var accountClientId = GetString(account.Value, "ClientID", "ID", "CustomerID", "CustomerCode");
            if (string.IsNullOrWhiteSpace(accountClientId))
            {
                return new ResolvedClientIdentity { Found = false };
            }

            var accountClient = await TryFindClientAsync(branchId, accountClientId)
                ?? await TryFindClientAsync(null, accountClientId);
            if (accountClient is not null)
            {
                return new ResolvedClientIdentity
                {
                    Found = true,
                    ClientId = GetString(accountClient.Value, "ClientID", "ID") ?? accountClientId,
                    ClientName = GetString(accountClient.Value, "ClientName", "Name", "FullName") ?? string.Empty,
                    ClientRow = accountClient,
                    MatchedByAccount = true,
                    AccountId = GetString(account.Value, "AccountID", "ID", "AccountNo", "AccountNumber")
                };
            }

            return new ResolvedClientIdentity
            {
                Found = true,
                ClientId = accountClientId,
                ClientName = GetString(account.Value, "ClientName", "Name", "FullName") ?? string.Empty,
                ClientRow = null,
                MatchedByAccount = true,
                AccountId = GetString(account.Value, "AccountID", "ID", "AccountNo", "AccountNumber")
            };
        }

        private async Task<List<JsonElement>> SearchRowsByTableAsync(string tableId, string? branchId, string searchKey)
        {
            var response = await _oldApiService.CreateAsync<JsonElement>(
                OldApiClientName,
                OldApiDBConstants.GET_SEARCHRESULT_DBO,
                new
                {
                    TableID = tableId,
                    AdvFilterString = string.Empty,
                    WhereStmt = BuildClientWhereClause(branchId),
                    PrevOrNext = 0,
                    RefID = string.Empty,
                    OperatorID = ResolveOperatorId(),
                    ModuleID = 0,
                    OurBranchID = branchId ?? string.Empty,
                    SearchKey = searchKey,
                    LanguageID = "en"
                });

            return ExtractRows(response);
        }

        private async Task<JsonElement?> TryFindClientAsync(string? branchId, string clientId)
        {
            try
            {
                return await FindClientAsync(branchId, clientId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Client lookup failed for input {ClientId} on branch scope {BranchScope}", clientId, string.IsNullOrWhiteSpace(branchId) ? "global" : branchId);
                return null;
            }
        }

        private async Task<JsonElement?> TryFindAccountAsync(string? branchId, string accountId)
        {
            try
            {
                return await FindAccountAsync(branchId, accountId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Account lookup failed for input {AccountId} on branch scope {BranchScope}", accountId, string.IsNullOrWhiteSpace(branchId) ? "global" : branchId);
                return null;
            }
        }

        private static string NormalizeLookupId(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim().Replace(" ", string.Empty, StringComparison.Ordinal);
        }

        private static bool IsLookupMatch(string? candidate, string normalizedInput)
        {
            if (string.IsNullOrWhiteSpace(normalizedInput) || string.IsNullOrWhiteSpace(candidate))
            {
                return false;
            }

            return string.Equals(
                NormalizeLookupId(candidate),
                normalizedInput,
                StringComparison.OrdinalIgnoreCase);
        }

        private async Task<List<JsonElement>> GetClientAccountsAsync(string? branchId, string clientId)
        {
            var response = await _oldApiService.CreateAsync<JsonElement>(
                OldApiClientName,
                OldApiDBConstants.GET_MERGE_CLIENT_ACCOUNTS,
                new
                {
                    OurBranchID = branchId ?? string.Empty,
                    ClientID = clientId,
                    OperatorID = ResolveOperatorId()
                });

            return ExtractRows(response);
        }

        private static List<JsonElement> ExtractRows(JsonElement response)
        {
            if (response.ValueKind == JsonValueKind.Array)
            {
                return response.EnumerateArray().Select(item => item.Clone()).ToList();
            }

            if (response.ValueKind != JsonValueKind.Object)
            {
                return [];
            }

            foreach (var propertyName in new[] { "Details01", "Details1", "Details", "data", "Data", "Records" })
            {
                if (TryGetPropertyIgnoreCase(response, propertyName, out var propertyValue))
                {
                    var rows = NormalizeRows(propertyValue);
                    if (rows.Count > 0)
                    {
                        return rows;
                    }
                }
            }

            foreach (var property in response.EnumerateObject())
            {
                var rows = NormalizeRows(property.Value);
                if (rows.Count > 0)
                {
                    return rows;
                }
            }

            return [];
        }

        private static List<JsonElement> NormalizeRows(JsonElement value)
        {
            if (value.ValueKind == JsonValueKind.Array)
            {
                return value.EnumerateArray().Select(item => item.Clone()).ToList();
            }

            if (value.ValueKind == JsonValueKind.Object)
            {
                if (TryGetPropertyIgnoreCase(value, "SearchResults", out var searchResults))
                {
                    return NormalizeRows(searchResults);
                }

                if (TryGetPropertyIgnoreCase(value, "Details", out var nestedDetails))
                {
                    return NormalizeRows(nestedDetails);
                }
            }

            return [];
        }

        private static bool IsSuccessfulResponse(JsonElement response)
        {
            if (response.ValueKind != JsonValueKind.Object)
            {
                return false;
            }

            if (TryGetPropertyIgnoreCase(response, "Success", out var successValue))
            {
                if (successValue.ValueKind == JsonValueKind.True)
                {
                    return true;
                }

                if (successValue.ValueKind == JsonValueKind.String &&
                    bool.TryParse(successValue.GetString(), out var parsedSuccess))
                {
                    return parsedSuccess;
                }
            }

            var responseCode = GetString(response, "ResponseCode");
            if (string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            var status = GetString(response, "Status");
            if (string.Equals(status, "Success", StringComparison.OrdinalIgnoreCase)
                || string.Equals(status, "OK", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            // Some procedures return success only inside nested Details rows, e.g. { Details: [{ Success: "00" }] }.
            foreach (var row in ExtractRows(response))
            {
                var rowSuccess = GetString(row, "Success", "ResponseCode", "Code", "Status");
                if (string.IsNullOrWhiteSpace(rowSuccess))
                {
                    continue;
                }

                var normalized = rowSuccess.Trim();
                if (string.Equals(normalized, "00", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(normalized, "0", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(normalized, "000", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(normalized, "Success", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(normalized, "OK", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(normalized, "True", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private static string ExtractResponseMessage(JsonElement response, string fallback)
        {
            return GetString(response, "ResponseMessage", "Message", "ErrorMessage", "message")
                ?? fallback;
        }

        private static string? GetString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (!TryGetPropertyIgnoreCase(element, propertyName, out var propertyValue))
                {
                    continue;
                }

                var value = ConvertElementToString(propertyValue);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }

        private static string? ConvertElementToString(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number => element.ToString(),
                JsonValueKind.True => bool.TrueString,
                JsonValueKind.False => bool.FalseString,
                _ => null
            };
        }

        private static bool TryGetPropertyIgnoreCase(JsonElement element, string propertyName, out JsonElement propertyValue)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        propertyValue = property.Value;
                        return true;
                    }
                }
            }

            propertyValue = default;
            return false;
        }

        private static string BuildClientWhereClause(string? branchId)
        {
            if (string.IsNullOrWhiteSpace(branchId))
            {
                return string.Empty;
            }

            return $"OurBranchID = '{branchId.Replace("'", "''", StringComparison.Ordinal)}'";
        }

        private string ResolveOperatorId()
        {
            return ResolveSessionValue("user_name", "user_id", "OperatorID") ?? "web_portal";
        }

        private string ResolveBranchId()
        {
            return ResolveSessionValue("branch_code", "branch_id", "OurBranchID") ?? string.Empty;
        }

        private string ResolveBankId()
        {
            return ResolveSessionValue("bank_id", "bank_code", "BankID") ?? "00";
        }

        private string? ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return null;
        }
    }

    public class MergeBranchLookupRequest
    {
        public string? BranchId { get; set; }
    }

    public class MergeClientLookupRequest
    {
        public string? ClientId { get; set; }
        public string? OurBranchID { get; set; }
    }

    public class MergeAccountsViewRequest
    {
        public string? OurBranchID { get; set; }
        public string? FromClientID { get; set; }
        public string? ToClientID { get; set; }
    }

    public class MergeClientSearchRequest
    {
        public string? OurBranchID { get; set; }
        public string? ClientID { get; set; }
        public string? Name { get; set; }
        public string? IDNumber { get; set; }
        public string? MobileNo { get; set; }
        public string? ClientApplicationID { get; set; }
        public string? AccountID { get; set; }
        public string? MotherName { get; set; }
    }

    public class MergeBranchSearchRequest
    {
        public string? BranchID { get; set; }
        public string? BranchName { get; set; }
    }

    public class MergeAccountsSubmitRequest
    {
        [JsonPropertyName("ourBranchID")]
        public string? OurBranchID { get; set; }

        [JsonPropertyName("moduleID")]
        public int ModuleID { get; set; }

        [JsonPropertyName("fromClientID")]
        public string? FromClientID { get; set; }

        [JsonPropertyName("toClientID")]
        public string? ToClientID { get; set; }

        [JsonPropertyName("accounts")]
        public string? Accounts { get; set; }

        [JsonPropertyName("selectedAccount")]
        public string? SelectedAccount { get; set; }
    }

    internal sealed class ResolvedClientIdentity
    {
        public bool Found { get; set; }
        public string ClientId { get; set; } = string.Empty;
        public string ClientName { get; set; } = string.Empty;
        public JsonElement? ClientRow { get; set; }
        public bool MatchedByAccount { get; set; }
        public string? AccountId { get; set; }
    }
}
