using System.Globalization;
using System.Security;
using System.Text.Json;
using kairo_ui.Models.StaticData.ChangeOfficerPortfolio;

namespace kairo_ui.Features.StaticData.ChangeOfficerPortfolio
{
    public sealed class ChangeOfficerPortfolioService
    {
        private readonly ChangeOfficerPortfolioRepository _repository;

        public ChangeOfficerPortfolioService(ChangeOfficerPortfolioRepository repository)
        {
            _repository = repository;
        }

        public async Task<ChangeOfficerPortfolioOfficerSummary?> GetOfficerSummaryAsync(
            ChangeOfficerPortfolioOfficerRequest request,
            ChangeOfficerPortfolioContext context)
        {
            var response = await _repository.GetOfficerDetailsAsync(
                request.OfficerID,
                string.IsNullOrWhiteSpace(request.BranchID) ? context.BranchID : request.BranchID,
                string.IsNullOrWhiteSpace(request.BankID) ? context.BankID : request.BankID,
                context.OperatorID,
                context.AppName);

            var row = ExtractOfficerDetailRow(response);
            if (row is null)
            {
                return null;
            }

            return new ChangeOfficerPortfolioOfficerSummary
            {
                BankID = GetString(row.Value, "BankID", "BankId"),
                OfficerID = GetString(row.Value, "OfficerID", "OfficerId", "ID", "Code", "EmpID"),
                OfficerName = GetString(row.Value, "OfficerName", "Name", "Description", "EmployeeName", "FullName"),
                OfficerTypeID = GetString(row.Value, "OfficerTypeID", "OfficerTypeId", "DesignationID", "DesignationId"),
                Designation = FirstNonEmpty(
                    GetString(row.Value, "Designation", "DesignationName", "PositionName", "Title", "OfficerTitle"),
                    GetString(row.Value, "OfficerTypeID", "OfficerTypeId", "DesignationID", "DesignationId")),
                AssignedBranchID = GetString(row.Value, "AssignedBranchID", "AssignedBranchId", "OurBranchID", "BranchID"),
                BranchName = GetString(row.Value, "BranchName", "AssignedBranchName"),
                RestrictedPeriodID = GetString(row.Value, "RestrictedPeriodID", "RestrictedPeriodId"),
                RestrictedPeriod = GetString(row.Value, "RestrictedPeriod"),
                NumberOfLoans = GetString(row.Value, "NoOFLoans", "NoOfLoans", "NumberOfLoans"),
                RestrictedAmount = GetString(row.Value, "RestrictedAmount"),
                IsAllowToDelete = GetString(row.Value, "IsAllowToDelete"),
                ErrorMessage = GetString(row.Value, "ErrorMessage", "ResponseMessage", "Message"),
                IsBaseBranch = GetString(row.Value, "IsBaseBranch"),
                IsDisbursementRestriction = GetString(row.Value, "IsDisbursementRestriction"),
                CreatedBy = GetString(row.Value, "CreatedBy"),
                CreatedOn = GetString(row.Value, "CreatedOn"),
                ModifiedBy = GetString(row.Value, "ModifiedBY", "ModifiedBy"),
                ModifiedOn = GetString(row.Value, "ModifiedOn"),
                SupervisedBy = GetString(row.Value, "SupervisedBY", "SupervisedBy"),
                SupervisedOn = GetString(row.Value, "SupervisedOn"),
                UpdateCount = GetString(row.Value, "UpdateCount")
            };
        }

        public async Task<ChangeOfficerPortfolioPortfolioResult> GetPortfolioAsync(
            ChangeOfficerPortfolioPortfolioRequest request,
            ChangeOfficerPortfolioContext context)
        {
            await Task.CompletedTask;

            var result = new ChangeOfficerPortfolioPortfolioResult();
            var distinctCenters = request.Centers
                .Where(center => !string.IsNullOrWhiteSpace(center.CenterID))
                .GroupBy(center => center.CenterID.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(group =>
                {
                    var center = group.First();
                    return new ChangeOfficerPortfolioCenterSelection
                    {
                        CenterID = center.CenterID.Trim(),
                        CenterName = center.CenterName?.Trim() ?? string.Empty,
                        UpdateCount = center.UpdateCount
                    };
                })
                .ToList();

            result.Centers.AddRange(distinctCenters);

            return result;
        }

        public async Task<ChangeOfficerPortfolioTransferResult> TransferAsync(
            ChangeOfficerPortfolioTransferRequest request,
            ChangeOfficerPortfolioContext context)
        {
            var result = new ChangeOfficerPortfolioTransferResult();
            var distinctCenters = request.Centers
                .Where(center => !string.IsNullOrWhiteSpace(center.CenterID))
                .GroupBy(center => center.CenterID.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(group => group.First())
                .ToList();

            if (distinctCenters.Count == 0)
            {
                result.ErrorCount++;
                result.Errors.Add("No centers were selected for transfer.");
                return result;
            }

            try
            {
                var payload = BuildChangePortfolioPayload(distinctCenters, request, context);
                var response = await _repository.ChangePortfolioAsync(payload, context.AppName);
                var errorMessage = ExtractErrorMessage(response);

                if (!string.IsNullOrWhiteSpace(errorMessage))
                {
                    result.ErrorCount = distinctCenters.Count;
                    result.Errors.Add(errorMessage);
                    return result;
                }

                result.SuccessCount = distinctCenters.Count;
                return result;
            }
            catch (Exception ex)
            {
                result.ErrorCount = distinctCenters.Count;
                result.Errors.Add(ex.Message);
                return result;
            }
        }

        private static Dictionary<string, object?> BuildChangePortfolioPayload(
            IEnumerable<ChangeOfficerPortfolioCenterSelection> centers,
            ChangeOfficerPortfolioTransferRequest request,
            ChangeOfficerPortfolioContext context)
        {
            // Legacy p_ChangePortfolio transfer saves do not accept DesignationID.
            return new Dictionary<string, object?>
            {
                ["OurBranchID"] = request.BranchID,
                ["OfficerID"] = request.OfficerID,
                ["PortfolioTypeID"] = NormalizePortfolioType(request.PortfolioType),
                ["ReplaceOfficerID"] = request.SignInOfficerID,
                ["IDDetails"] = BuildIdDetailsXml(centers),
                ["EffectiveDate"] = NormalizeDate(request.EffectiveDate),
                ["ModifiedBy"] = context.OperatorID,
                ["ModifiedOn"] = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss", CultureInfo.InvariantCulture),
                ["SupervisedBy"] = context.OperatorID
            };
        }

        private static JsonElement? ExtractFirstRow(JsonElement response)
        {
            foreach (var propertyName in new[] { "Details", "Details01", "Details02", "details", "details01", "details02" })
            {
                var row = ExtractDetailRow(response, propertyName);
                if (row is not null)
                {
                    return row;
                }
            }

            return null;
        }

        private static JsonElement? ExtractOfficerDetailRow(JsonElement response)
        {
            foreach (var propertyName in new[] { "Details", "Details01", "Details02", "details", "details01", "details02" })
            {
                var row = ExtractDetailRow(response, propertyName);
                if (row is null)
                {
                    continue;
                }

                var officerId = GetString(row.Value, "OfficerID", "OfficerId", "ID", "Code", "EmpID");
                if (!string.IsNullOrWhiteSpace(officerId))
                {
                    return row;
                }
            }

            return null;
        }

        private static JsonElement? ExtractDetailRow(JsonElement response, string propertyName)
        {
            if (TryGetProperty(response, propertyName, out var detailsElement) &&
                detailsElement.ValueKind == JsonValueKind.Array &&
                detailsElement.GetArrayLength() > 0)
            {
                return detailsElement[0];
            }

            if (TryGetProperty(response, "data", out var dataElement) &&
                TryGetProperty(dataElement, propertyName, out detailsElement) &&
                detailsElement.ValueKind == JsonValueKind.Array &&
                detailsElement.GetArrayLength() > 0)
            {
                return detailsElement[0];
            }

            return null;
        }

        private static string ExtractErrorMessage(JsonElement response)
        {
            var responseCode = GetString(response, "ResponseCode");
            if (string.Equals(responseCode, "00", StringComparison.OrdinalIgnoreCase))
            {
                return string.Empty;
            }

            var nestedData = TryGetProperty(response, "data", out var dataElement) ? dataElement : default;
            var nestedResponseCode = nestedData.ValueKind == JsonValueKind.Undefined ? string.Empty : GetString(nestedData, "ResponseCode");
            if (string.Equals(nestedResponseCode, "00", StringComparison.OrdinalIgnoreCase))
            {
                return string.Empty;
            }

            return GetString(response, "ResponseMessage", "ErrorMessage", "message", "error")
                ?? (nestedData.ValueKind == JsonValueKind.Undefined
                    ? string.Empty
                    : GetString(nestedData, "ResponseMessage", "ErrorMessage", "message", "error"));
        }

        private static string FirstNonEmpty(params string[] values)
        {
            foreach (var value in values)
            {
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return string.Empty;
        }

        private static string BuildIdDetailsXml(IEnumerable<ChangeOfficerPortfolioCenterSelection> centers)
        {
            return string.Concat(
                centers
                    .Select(center => center.CenterID?.Trim())
                    .Where(centerId => !string.IsNullOrWhiteSpace(centerId))
                    .Select(centerId => $"<dt_ChangeOfficerPortfolio><ID>{EscapeXml(centerId)}</ID></dt_ChangeOfficerPortfolio>"));
        }

        private static string EscapeXml(string? value)
        {
            return SecurityElement.Escape(value ?? string.Empty) ?? string.Empty;
        }

        private static string NormalizePortfolioType(string? rawValue)
        {
            var value = string.IsNullOrWhiteSpace(rawValue)
                ? "G"
                : rawValue.Trim().ToUpperInvariant();

            return value switch
            {
                "GROUP" => "G",
                "G" => "G",
                "PRODUCT" => "P",
                "P" => "P",
                "ACCOUNT" => "A",
                "A" => "A",
                _ => throw new InvalidOperationException($"Unsupported portfolio type '{rawValue}'.")
            };
        }

        private static bool OfficerMatches(JsonElement details02, string requestedOfficerId)
        {
            var candidateOfficerIds = new[]
            {
                GetString(details02, "CreditOfficerID", "CreditOfficerId"),
                GetString(details02, "ActiveOfficerID", "ActiveOfficerId"),
                GetString(details02, "OfficerID", "OfficerId"),
                GetString(details02, "CenterOfficerID", "CenterOfficerId"),
                GetString(details02, "GroupOfficerID", "GroupOfficerId")
            };

            return candidateOfficerIds.Any(candidateOfficerId => AreEquivalentIdentifiers(candidateOfficerId, requestedOfficerId));
        }

        private static bool AreEquivalentIdentifiers(string? left, string? right)
        {
            var leftTrimmed = NormalizeIdentifier(left);
            var rightTrimmed = NormalizeIdentifier(right);

            if (string.IsNullOrWhiteSpace(leftTrimmed) || string.IsNullOrWhiteSpace(rightTrimmed))
            {
                return false;
            }

            if (string.Equals(leftTrimmed, rightTrimmed, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            return string.Equals(
                TrimLeadingZeros(leftTrimmed),
                TrimLeadingZeros(rightTrimmed),
                StringComparison.OrdinalIgnoreCase);
        }

        private static string NormalizeIdentifier(string? value)
        {
            return string.IsNullOrWhiteSpace(value)
                ? string.Empty
                : value.Trim();
        }

        private static string TrimLeadingZeros(string value)
        {
            var trimmed = value.TrimStart('0');
            return string.IsNullOrEmpty(trimmed) ? "0" : trimmed;
        }

        private static string NormalizeDate(string? rawValue, string? fallbackValue = null)
        {
            var candidate = string.IsNullOrWhiteSpace(rawValue) ? fallbackValue : rawValue;
            if (string.IsNullOrWhiteSpace(candidate))
            {
                return DateTime.UtcNow.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            }

            if (DateTime.TryParse(candidate, CultureInfo.InvariantCulture, DateTimeStyles.AllowWhiteSpaces, out var parsed))
            {
                return parsed.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            }

            return candidate;
        }

        private static int ParseInteger(string? rawValue)
        {
            return int.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsed)
                ? parsed
                : 0;
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

        private static string GetString(JsonElement element, params string[] propertyNames)
        {
            foreach (var propertyName in propertyNames)
            {
                if (TryGetProperty(element, propertyName, out var value))
                {
                    if (value.ValueKind == JsonValueKind.String)
                    {
                        return value.GetString() ?? string.Empty;
                    }

                    if (value.ValueKind is JsonValueKind.Number or JsonValueKind.True or JsonValueKind.False)
                    {
                        return value.ToString();
                    }
                }
            }

            return string.Empty;
        }
    }
}