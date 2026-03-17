using System.Text.Json;
using kairo_ui.Models.StaticData;

namespace kairo_ui.Services.StaticData
{
    public interface IBranchUserCodeService
    {
        Task<JsonElement> GetAsync(BranchUserCodeGetRequest request, CancellationToken cancellationToken = default);
        Task<JsonElement> SaveAsync(BranchUserCodeSaveRequest request, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<BranchUserCodeTypeOption>> GetCodeTypesAsync(string operatorId, string ourBranchId, CancellationToken cancellationToken = default);
    }

    public sealed class BranchUserCodeService : IBranchUserCodeService
    {
        private const string OldApiName = "OldApi";
        private const string GetBranchUserCodeProc = "dbo.p_GetBranchUserCode";
        private const string SaveBranchUserCodeProc = "dbo.p_AddEditBranchUserCodes";
        private const string GetSearchResultProc = "p_GetSearchResult";

        private readonly IOldApiService _oldApiService;

        public BranchUserCodeService(IOldApiService oldApiService)
        {
            _oldApiService = oldApiService;
        }

        public Task<JsonElement> GetAsync(BranchUserCodeGetRequest request, CancellationToken cancellationToken = default)
        {
            var payload = new
            {
                OurBranchID = request.OurBranchID,
                ID = request.ID,
                OperatorID = request.OperatorID
            };

            return _oldApiService.CreateAsync<JsonElement>(OldApiName, GetBranchUserCodeProc, payload);
        }

        public Task<JsonElement> SaveAsync(BranchUserCodeSaveRequest request, CancellationToken cancellationToken = default)
        {
            var payload = new
            {
                OurBranchID = request.OurBranchID,
                ID = request.ID,
                OperatedBy = request.OperatedBy,
                OperatedOn = request.OperatedOn,
                SupervisedBy = request.SupervisedBy,
                DetailRecords = request.DetailRecords ?? string.Empty
            };

            return _oldApiService.CreateAsync<JsonElement>(OldApiName, SaveBranchUserCodeProc, payload);
        }

        public async Task<IReadOnlyList<BranchUserCodeTypeOption>> GetCodeTypesAsync(string operatorId, string ourBranchId, CancellationToken cancellationToken = default)
        {
            var payload = new
            {
                WhereStmt = string.Empty,
                TableID = "SystemSubCodeID",
                RefID = (string?)null,
                PrevOrNext = 0,
                AdvFilterString = "ID = 'BranchUserCodeID'",
                OperatorID = operatorId,
                ModuleID = 2008,
                OurBranchID = ourBranchId,
                SearchKey = (object?)null,
                LanguageID = "en",
                PageSize = 200
            };

            var response = await _oldApiService.CreateAsync<JsonElement>(OldApiName, GetSearchResultProc, payload);
            var rows = ExtractSearchRows(response);

            return rows
                .Select(row => new BranchUserCodeTypeOption
                {
                    ID = ReadString(row, "SubCodeID", "subCodeID", "ID", "Id"),
                    Description = ReadString(row, "Description", "description", "Name", "CodeDescription")
                })
                .Where(item => !string.IsNullOrWhiteSpace(item.ID))
                .OrderBy(item => item.ID)
                .ToList();
        }

        private static IEnumerable<JsonElement> ExtractSearchRows(JsonElement response)
        {
            if (TryGetProperty(response, "Details", out var details) && details.ValueKind == JsonValueKind.Array)
            {
                return details.EnumerateArray();
            }

            if (TryGetProperty(response, "Details01", out var details01) && details01.ValueKind == JsonValueKind.Array)
            {
                return details01.EnumerateArray();
            }

            if (TryGetProperty(response, "data", out var data))
            {
                if (TryGetProperty(data, "Details", out details) && details.ValueKind == JsonValueKind.Array)
                {
                    return details.EnumerateArray();
                }

                if (TryGetProperty(data, "Details01", out details01) && details01.ValueKind == JsonValueKind.Array)
                {
                    return details01.EnumerateArray();
                }
            }

            return Array.Empty<JsonElement>();
        }

        private static bool TryGetProperty(JsonElement element, string propertyName, out JsonElement value)
        {
            if (element.ValueKind == JsonValueKind.Object)
            {
                foreach (var property in element.EnumerateObject())
                {
                    if (string.Equals(property.Name, propertyName, StringComparison.OrdinalIgnoreCase))
                    {
                        value = property.Value;
                        return true;
                    }
                }
            }

            value = default;
            return false;
        }

        private static string ReadString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (TryGetProperty(element, propertyName, out var property))
                {
                    if (property.ValueKind == JsonValueKind.String)
                    {
                        return property.GetString() ?? string.Empty;
                    }

                    if (property.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
                    {
                        return property.ToString();
                    }
                }
            }

            return string.Empty;
        }
    }
}
