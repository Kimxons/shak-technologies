# GetMultipleDropdownCodeOptionsAsync - Usage Guide

## Overview
The `GetMultipleDropdownCodeOptionsAsync` method provides a convenient way to fetch multiple system codes formatted as dropdown options. It returns data using the `DropdownCodeItem` POCO with a standardized structure for easy dropdown binding.

## Method Signature
```csharp
Task<Dictionary<string, List<DropdownCodeItem>>> GetMultipleDropdownCodeOptionsAsync(string[] codeIds, bool forceRefresh = false)
```

## Parameters
- **codeIds**: Array of system code identifiers to fetch (e.g., `["ClientTypeID", "GenderID", "TitleID"]`)
- **forceRefresh**: Optional. Set to `true` to bypass cache and fetch fresh data (default: `false`)

## Return Value
Returns a `Dictionary<string, List<DropdownCodeItem>>` where:
- **Key**: The system code identifier (e.g., "ClientTypeID")
- **Value**: List of `DropdownCodeItem` objects with properties:
  - `CodeID`: The system code identifier (e.g., "ClientTypeID")
  - `ParentCodeID`: Parent code ID for hierarchical codes (nullable)
  - `Value`: The SubCodeID (used in forms/API calls)
  - `Label`: The CodeDescription (or SubCodeID if description is null)
  - `DisplayOrder`: The DisplayOrder for sorting

## DropdownCodeItem POCO
```csharp
public class DropdownCodeItem
{
    public string CodeID { get; set; }          // e.g., "ClientTypeID"
    public string? ParentCodeID { get; set; }   // For hierarchical codes
    public string Value { get; set; }    // e.g., "I" (SubCodeID)
    public string Label { get; set; }           // e.g., "Individual" (CodeDescription)
    public int DisplayOrder { get; set; } // For sorting
}
```

## Benefits
- **Type Safety**: Returns strongly-typed `DropdownCodeItem` objects instead of anonymous types
- **Caching**: Utilizes the existing 4-hour cache for system codes
- **Batch Loading**: Fetches multiple system codes in parallel for better performance
- **Standardized Format**: Returns data in a consistent dropdown-ready format
- **Easy Integration**: Can be directly passed to frontend dropdown components
- **Hierarchical Support**: Includes ParentCodeID for cascading dropdowns

## Usage Examples

### Example 1: Basic Usage in Controller
```csharp
public class ClientRelationsController : ClientMaintenanceControllerBase
{
    private readonly IApiCachedService _apiCachedService;

    public async Task<IActionResult> Index()
    {
      // Fetch multiple dropdown options
        var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
        {
     "RelationTypeID",
            "TitleID",
    "GenderID",
            "RelationID"
     });

     // Access individual dropdown options (strongly-typed)
        dropdownOptions.TryGetValue("RelationTypeID", out var relationTypes);
      dropdownOptions.TryGetValue("TitleID", out var titles);
   dropdownOptions.TryGetValue("GenderID", out var genders);
        dropdownOptions.TryGetValue("RelationID", out var relations);

        // Pass to view
        ViewData["RelationTypeOptions"] = relationTypes;
  ViewData["TitleOptions"] = titles;
        ViewData["GenderOptions"] = genders;
      ViewData["RelationOptions"] = relations;

      return View();
    }
}
```

### Example 2: Using in API Endpoint (JSON Response)
```csharp
[HttpGet("dropdowns")]
public async Task<IActionResult> GetDropdowns()
{
    var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
        "ClientTypeID",
        "MaritalStatusID",
        "LiteracyLevelID"
    });

    return Ok(new
    {
  responseCode = "00",
        responseMessage = "Success",
    details = dropdowns
    });
}

// Response format:
// {
//   "responseCode": "00",
//   "responseMessage": "Success",
//   "details": {
//     "ClientTypeID": [
//    { 
//         "codeID": "ClientTypeID",
//       "parentCodeID": null,
//         "value": "I", 
//         "label": "Individual", 
//         "displayOrder": 1 
//       },
//       { 
//         "codeID": "ClientTypeID",
//         "parentCodeID": null,
//    "value": "C", 
//         "label": "Corporate", 
//         "displayOrder": 2 
//       }
//]
//   }
// }
```

### Example 3: Type-Safe Access
```csharp
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "TitleID" });

if (dropdowns.TryGetValue("TitleID", out var titles))
{
    foreach (var item in titles)
    {
        // Strongly-typed access
   Console.WriteLine($"CodeID: {item.CodeID}");
        Console.WriteLine($"Value: {item.Value}");
      Console.WriteLine($"Label: {item.Label}");
        Console.WriteLine($"Order: {item.DisplayOrder}");
        Console.WriteLine($"Parent: {item.ParentCodeID ?? "None"}");
    }
}
```

### Example 4: Using with Force Refresh
```csharp
// Force refresh when system codes have been updated
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(
    new[] { "CountryID", "CityID" },
    forceRefresh: true  // Bypass cache
);
```

### Example 5: Hierarchical Dropdowns (Cascading)
```csharp
// Fetch hierarchical codes
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
    "CountryID",
    "CityID",
    "RegionID"
});

// Get all cities
dropdowns.TryGetValue("CityID", out var allCities);

// Filter cities by parent country (cascading dropdown)
string selectedCountryId = "ETH";
var filteredCities = allCities?
    .Where(c => c.ParentCodeID == selectedCountryId)
    .ToList();
```

### Example 6: Comparison with GetMultipleSystemCodeOptionsAsync

**Old Way (GetMultipleSystemCodeOptionsAsync):**
```csharp
var systemCodes = await _apiCachedService.GetMultipleSystemCodeOptionsAsync(new[]
{
    "TitleID",
    "GenderID"
});

// Manual transformation required for dropdown binding
systemCodes.TryGetValue("TitleID", out var titleCodes);
var titleDropdown = titleCodes
    .OrderBy(c => c.DisplayOrder)
    .Select(c => new 
    {
    value = c.SubCodeID,
      label = c.CodeDescription ?? c.SubCodeID,
        order = c.DisplayOrder
 })
    .ToList();
```

**New Way (GetMultipleDropdownCodeOptionsAsync):**
```csharp
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
    "TitleID",
    "GenderID"
});

// Already formatted as DropdownCodeItem with type safety!
dropdowns.TryGetValue("TitleID", out var titleDropdown);
// titleDropdown is List<DropdownCodeItem>
```

## Frontend Integration

### Razor View Example
```cshtml
@using CBS.Entities.SystemCore
@{
    var titleOptions = ViewData["TitleOptions"] as List<DropdownCodeItem> ?? new List<DropdownCodeItem>();
}

<select class="form-select" name="titleId">
    <option value="">-- Select Title --</option>
    @foreach (var option in titleOptions)
    {
        <option value="@option.Value">@option.Label</option>
    }
</select>
```

### JavaScript Integration Example
```javascript
// Fetch dropdown options via AJAX
async function loadDropdowns() {
    const response = await fetch('/api/dropdowns');
    const data = await response.json();
    
    if (data.responseCode === '00') {
        const dropdowns = data.details;

        // Populate title dropdown
        const titleSelect = document.getElementById('titleId');
        dropdowns.ClientTypeID.forEach(option => {
          const opt = document.createElement('option');
            opt.value = option.value;
       opt.textContent = option.label;
            opt.dataset.codeId = option.codeID;
            opt.dataset.parentCodeId = option.parentCodeID || '';
            opt.dataset.order = option.displayOrder;
            titleSelect.appendChild(opt);
        });
    }
}
```

## Performance Considerations

1. **Caching**: All system codes are cached for 4 hours with high priority
2. **Parallel Fetching**: Multiple code IDs are fetched in parallel for optimal performance
3. **Single Transformation**: Data is transformed once and can be reused across multiple requests
4. **Memory Efficient**: Uses the same cached system codes as `GetMultipleSystemCodeOptionsAsync`
5. **Type Safety**: Strongly-typed `DropdownCodeItem` reduces runtime errors

## When to Use

Use `GetMultipleDropdownCodeOptionsAsync` when:
- ? You need dropdown-formatted data for UI binding
- ? You're loading multiple system codes at once
- ? You want a standardized, strongly-typed dropdown format
- ? You're passing data directly to frontend components
- ? You need hierarchical/cascading dropdown support

Use `GetMultipleSystemCodeOptionsAsync` when:
- ? You need full SystemCodeDetail objects with all properties (IsDefault, IsActive, etc.)
- ? You need to perform additional filtering or transformation beyond dropdown formatting
- ? You need access to entity-specific properties not included in DropdownCodeItem

## Cache Behavior
- **Cache Duration**: 4 hours (inherited from `CachingConstants.SystemCodesPolicy`)
- **Cache Priority**: High (SystemCodesPolicy)
- **Compression**: Enabled for large datasets
- **Cache Key Format**: `SYSCODES:{codeId}` (same as `GetSystemCodeOptionsAsync`)

## Invalidation
To invalidate cached system codes:
```csharp
// Invalidate a specific code
await _apiCachedService.InvalidateSystemCodeOptionsAsync("ClientTypeID");

// Then fetch with force refresh
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(
  new[] { "ClientTypeID" },
    forceRefresh: true
);
```

## DropdownCodeItem vs SystemCodeDetail

| Property | DropdownCodeItem | SystemCodeDetail |
|----------|------------------|------------------|
| CodeID | ? Yes | ? Yes |
| ParentCodeID | ? Yes | ? Yes |
| Value | ? Yes (from SubCodeID) | SubCodeID |
| Label | ? Yes (from CodeDescription) | CodeDescription |
| DisplayOrder | ? Yes | ? Yes |
| IsDefault | ? No | ? Yes |
| IsActive | ? No | ? Yes |

**DropdownCodeItem** is optimized for UI binding with only the essential properties needed for dropdowns.

## Notes
- The method leverages `GetMultipleSystemCodeOptionsAsync` internally, ensuring consistent caching behavior
- Dropdown options are automatically sorted by `DisplayOrder`
- If `CodeDescription` is null, the `SubCodeID` is used as the label
- Empty or null codeIds arrays return an empty dictionary without errors
- All properties are strongly-typed for compile-time safety
- Includes `CodeID` and `ParentCodeID` for advanced dropdown scenarios
