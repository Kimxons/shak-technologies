# DropdownCodeItem - Documentation

## Overview
`DropdownCodeItem` is a POCO (Plain Old CLR Object) class defined in the `CBS.Entities.SystemCore` namespace. It provides a standardized, strongly-typed structure for dropdown/select options throughout the application.

## Location
**Namespace:** `CBS.Entities.SystemCore`  
**File:** `CBS.Entities.SystemCore\DropdownCodeItem.cs`  
**Assembly:** CBS.Entities.SystemCore.dll

## Class Definition

```csharp
namespace CBS.Entities.SystemCore
{
    /// <summary>
    /// Represents a dropdown-ready code item with standardized properties
    /// Used for UI dropdown/select components
    /// </summary>
    public class DropdownCodeItem
    {
        /// <summary>
      /// System code identifier (e.g., "ClientTypeID", "GenderID")
        /// </summary>
        [StringLength(50)]
   public string CodeID { get; set; } = string.Empty;

        /// <summary>
     /// Parent code ID for hierarchical codes (optional)
  /// </summary>
        [StringLength(50)]
        public string? ParentCodeID { get; set; }

  /// <summary>
        /// The value to be used in forms/API calls (SubCodeID)
        /// </summary>
        [StringLength(50)]
        public string Value { get; set; } = string.Empty;

        /// <summary>
        /// The display label for dropdown options (CodeDescription)
        /// </summary>
        [StringLength(300)]
        public string Label { get; set; } = string.Empty;

        /// <summary>
        /// Display order for sorting dropdown options
        /// </summary>
        public int DisplayOrder { get; set; }
    }
}
```

## Properties

### CodeID
- **Type:** `string` (Required)
- **Max Length:** 50 characters
- **Purpose:** Identifies which system code this item belongs to
- **Example Values:** "ClientTypeID", "GenderID", "TitleID", "RelationTypeID"
- **Use Case:** Useful for debugging and logging which dropdown the item came from

### ParentCodeID
- **Type:** `string?` (Nullable)
- **Max Length:** 50 characters
- **Purpose:** References a parent code for hierarchical/cascading dropdowns
- **Example Values:** 
  - "ETH" (for cities in Ethiopia)
  - "AAR" (for regions in Addis Ababa)
  - null (for top-level items)
- **Use Case:** Enables cascading dropdown functionality (e.g., Country ? City ? Region)

### Value
- **Type:** `string` (Required)
- **Max Length:** 50 characters
- **Purpose:** The actual value submitted in forms and used in API calls
- **Mapped From:** `SystemCodeDetail.SubCodeID`
- **Example Values:** "I", "M", "ETH", "Mr", "F"
- **Use Case:** Used as the `value` attribute in HTML `<option>` elements

### Label
- **Type:** `string` (Required)
- **Max Length:** 300 characters
- **Purpose:** Human-readable text displayed in dropdowns
- **Mapped From:** `SystemCodeDetail.CodeDescription` (falls back to `SubCodeID` if null)
- **Example Values:** "Individual", "Male", "Ethiopia", "Mr.", "Female"
- **Use Case:** Used as the display text in HTML `<option>` elements

### DisplayOrder
- **Type:** `int` (Required)
- **Purpose:** Controls the sort order of dropdown options
- **Mapped From:** `SystemCodeDetail.DisplayOrder`
- **Example Values:** 1, 2, 3, 10, 100
- **Use Case:** Ensures dropdown options appear in the correct order

## Mapping from SystemCodeDetail

| DropdownCodeItem Property | SystemCodeDetail Source | Notes |
|---------------------------|-------------------------|-------|
| CodeID | CodeID | Direct copy |
| ParentCodeID | ParentCodeID | Direct copy (nullable) |
| Value | SubCodeID | Direct copy |
| Label | CodeDescription ?? SubCodeID | Falls back to SubCodeID if description is null |
| DisplayOrder | DisplayOrder | Direct copy |

**Not Included from SystemCodeDetail:**
- `IsDefault` - Not needed for basic dropdown rendering
- `IsActive` - Filtered at query level (only active codes returned)

## Usage Patterns

### Pattern 1: Simple Dropdown
```csharp
// Controller
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "TitleID" });
ViewData["Titles"] = dropdowns["TitleID"];

// Razor View
@using CBS.Entities.SystemCore
@{
    var titles = ViewData["Titles"] as List<DropdownCodeItem> ?? new();
}

<select name="titleId" class="form-select">
    <option value="">-- Select --</option>
    @foreach (var item in titles)
    {
        <option value="@item.Value">@item.Label</option>
    }
</select>
```

### Pattern 2: Cascading Dropdown (Parent-Child)
```csharp
// Controller
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] 
{ 
    "CountryID", 
    "CityID" 
});
ViewData["Countries"] = dropdowns["CountryID"];
ViewData["AllCities"] = dropdowns["CityID"];

// Razor View
@using CBS.Entities.SystemCore
@{
    var countries = ViewData["Countries"] as List<DropdownCodeItem> ?? new();
    var allCities = ViewData["AllCities"] as List<DropdownCodeItem> ?? new();
    var citiesJson = System.Text.Json.JsonSerializer.Serialize(allCities);
}

<select id="countryId" name="countryId" class="form-select" onchange="filterCities()">
<option value="">-- Select Country --</option>
    @foreach (var item in countries)
    {
        <option value="@item.Value">@item.Label</option>
    }
</select>

<select id="cityId" name="cityId" class="form-select">
    <option value="">-- Select City --</option>
</select>

<script>
    const allCities = @Html.Raw(citiesJson);
    
    function filterCities() {
        const countryId = document.getElementById('countryId').value;
        const citySelect = document.getElementById('cityId');
        
        citySelect.innerHTML = '<option value="">-- Select City --</option>';
        
    allCities
.filter(c => c.parentCodeID === countryId)
     .forEach(city => {
  const opt = document.createElement('option');
            opt.value = city.value;
  opt.textContent = city.label;
   citySelect.appendChild(opt);
     });
    }
</script>
```

### Pattern 3: API Response
```csharp
[HttpGet("api/lookups/relations")]
public async Task<IActionResult> GetRelationLookups()
{
    var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
    {
   "RelationTypeID",
        "RelationID"
    });

    return Ok(new
    {
      responseCode = "00",
        responseMessage = "Success",
        details = dropdowns
    });
}
```

### Pattern 4: LINQ Queries
```csharp
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "ClientTypeID" });

if (dropdowns.TryGetValue("ClientTypeID", out var clientTypes))
{
    // Find default option
    var defaultType = clientTypes.FirstOrDefault(x => x.Value == "I");
    
    // Filter by criteria
    var corporateTypes = clientTypes.Where(x => x.Value.StartsWith("C")).ToList();
    
    // Order by label
    var sorted = clientTypes.OrderBy(x => x.Label).ToList();
    
    // Group by first character (if needed)
    var grouped = clientTypes.GroupBy(x => x.Value[0]).ToList();
}
```

## JSON Serialization

The `DropdownCodeItem` class serializes to JSON with camelCase properties (default ASP.NET Core behavior):

```json
{
    "codeID": "ClientTypeID",
    "parentCodeID": null,
    "value": "I",
    "label": "Individual",
    "displayOrder": 1
}
```

To customize JSON property names, use `[JsonPropertyName]` attributes:
```csharp
using System.Text.Json.Serialization;

public class DropdownCodeItem
{
    [JsonPropertyName("code_id")]
    public string CodeID { get; set; } = string.Empty;
    // ... other properties
}
```

## Advantages Over Anonymous Types

| Feature | DropdownCodeItem | Anonymous Type |
|---------|------------------|----------------|
| Type Safety | ? Compile-time checking | ? Runtime only |
| IntelliSense | ? Full support | ?? Limited |
| Refactoring | ? Easy | ? Difficult |
| Serialization | ? Predictable | ?? Variable |
| Documentation | ? XML comments | ? None |
| Reusability | ? Shared across projects | ? Defined inline |
| Debugging | ? Clear type names | ?? Generic names |

## Common Use Cases

### 1. Standard Dropdown
```csharp
// Single select dropdown (title, gender, status, etc.)
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "TitleID" });
```

### 2. Multi-Select Dropdown
```csharp
// Multi-select with checkboxes
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "LanguageID" });
```

### 3. Radio Button List
```csharp
// Radio buttons for gender selection
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "GenderID" });
var genders = dropdowns["GenderID"];

foreach (var gender in genders)
{
    // <input type="radio" value="@gender.Value"> @gender.Label
}
```

### 4. Cascading Dropdowns
```csharp
// Country ? City ? Region
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] 
{ 
    "CountryID", 
    "CityID", 
    "RegionID" 
});

// Filter by ParentCodeID for cascading behavior
```

### 5. Autocomplete/Typeahead
```csharp
// Load all options for client-side filtering
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "OccupationID" });
var occupations = dropdowns["OccupationID"];

// Pass to JavaScript for autocomplete functionality
```

## Best Practices

1. **Always Check Dictionary Keys**
   ```csharp
   if (dropdowns.TryGetValue("TitleID", out var titles))
   {
       // Use titles safely
   }
   ```

2. **Provide Fallback Values**
   ```csharp
   var titles = dropdowns.GetValueOrDefault("TitleID") ?? new List<DropdownCodeItem>();
   ```

3. **Handle Empty Results**
   ```csharp
   if (dropdowns.ContainsKey("GenderID") && dropdowns["GenderID"].Any())
   {
       // Process items
   }
   ```

4. **Use Type-Safe Views**
   ```csharp
   var titles = ViewData["Titles"] as List<DropdownCodeItem> ?? new List<DropdownCodeItem>();
   ```

5. **Validate Data Before Use**
   ```csharp
   var selectedValue = form["titleId"];
   var isValid = titles.Any(t => t.Value == selectedValue);
   ```

## Migration from Anonymous Types

If you're currently using anonymous types with `List<object>`, migration is straightforward:

**Before:**
```csharp
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "TitleID" });
var titles = ViewData["Titles"] as List<object>; // Unsafe casting

foreach (dynamic title in titles)
{
    var value = title.value; // No compile-time checking
    var label = title.label; // Typos not caught
}
```

**After:**
```csharp
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "TitleID" });
var titles = ViewData["Titles"] as List<DropdownCodeItem>; // Type-safe

foreach (var title in titles)
{
    var value = title.Value; // Compile-time checked
    var label = title.Label; // IntelliSense supported
}
```

## Related Classes

- **SystemCodeDetail**: Source entity from database (t_SystemCodeDetail table)
- **CachePolicy**: Caching configuration used by ApiCachedService
- **ApiCachedService**: Service that creates and returns DropdownCodeItem lists

## Version History

- **v1.0** (2025-01): Initial implementation
  - Created `DropdownCodeItem` POCO
  - Added to `CBS.Entities.SystemCore` project
  - Integrated with `GetMultipleDropdownCodeOptionsAsync` method
  - Replaced anonymous `List<object>` return type

## Support
For questions or issues with `DropdownCodeItem`, contact the development team or refer to:
- `GETMULTIPLEDROPDOWNCODEOPTIONS_USAGE_GUIDE.md`
- `APICACHEDSERVICE_README.md`
- `CBS.Entities.SystemCore\SYSTEMCODEDETAIL_README.md`
