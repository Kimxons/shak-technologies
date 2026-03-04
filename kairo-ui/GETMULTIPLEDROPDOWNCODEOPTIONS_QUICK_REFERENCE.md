# GetMultipleDropdownCodeOptionsAsync - Quick Reference

## Complete Example Implementation

### Step 1: Controller Setup
```csharp
using CBS.Entities.SystemCore;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Relations")]
    public class ClientRelationsController : ClientMaintenanceControllerBase
  {
        private readonly IApiCachedService _apiCachedService;

        public ClientRelationsController(
       IAuthService authService, 
 IApiService apiService, 
  IApiCachedService apiCachedService, 
  ILogger<ClientRelationsController> logger)
     : base(authService, apiService, logger)
        {
  _apiCachedService = apiCachedService;
        }

     [HttpGet, Route("Index")]
        public async Task<IActionResult> Index(string? clientId = null)
        {
       // Fetch multiple dropdown options using the new method
            var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
          {
     "RelationTypeID",
    "TitleID",
        "GenderID",
     "RelationID"
 });

   // Extract individual dropdown lists (type-safe)
        dropdowns.TryGetValue("RelationTypeID", out var relationTypes);
            dropdowns.TryGetValue("TitleID", out var titles);
   dropdowns.TryGetValue("GenderID", out var genders);
            dropdowns.TryGetValue("RelationID", out var relations);

      // Pass to view with fallback to empty lists
      ViewData["RelationTypeOptions"] = relationTypes ?? new List<DropdownCodeItem>();
          ViewData["TitleOptions"] = titles ?? new List<DropdownCodeItem>();
     ViewData["GenderOptions"] = genders ?? new List<DropdownCodeItem>();
       ViewData["RelationOptions"] = relations ?? new List<DropdownCodeItem>();

            ViewData["ClientId"] = clientId ?? string.Empty;

            return View();
        }
    }
}
```

### Step 2: Razor View Usage
```cshtml
@using CBS.Entities.SystemCore
@{
var relationTypes = ViewData["RelationTypeOptions"] as List<DropdownCodeItem> ?? new();
    var titles = ViewData["TitleOptions"] as List<DropdownCodeItem> ?? new();
    var genders = ViewData["GenderOptions"] as List<DropdownCodeItem> ?? new();
    var relations = ViewData["RelationOptions"] as List<DropdownCodeItem> ?? new();
}

<div class="row">
    <div class="col-md-3">
        <label class="form-label">Relation Type</label>
  <select name="relationTypeId" class="form-select">
            <option value="">-- Select --</option>
       @foreach (var item in relationTypes)
 {
      <option value="@item.Value">@item.Label</option>
     }
        </select>
    </div>

    <div class="col-md-3">
        <label class="form-label">Title</label>
        <select name="titleId" class="form-select">
        <option value="">-- Select --</option>
     @foreach (var item in titles)
      {
    <option value="@item.Value">@item.Label</option>
    }
        </select>
    </div>

    <div class="col-md-3">
      <label class="form-label">Gender</label>
      <select name="genderId" class="form-select">
         <option value="">-- Select --</option>
         @foreach (var item in genders)
    {
   <option value="@item.Value">@item.Label</option>
            }
        </select>
    </div>

 <div class="col-md-3">
 <label class="form-label">Relation</label>
        <select name="relationId" class="form-select">
    <option value="">-- Select --</option>
            @foreach (var item in relations)
    {
    <option value="@item.Value">@item.Label</option>
            }
        </select>
    </div>
</div>
```

### Step 3: API Endpoint Pattern
```csharp
[HttpGet("api/lookups/client")]
[ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
public async Task<IActionResult> GetClientLookups()
{
    try
    {
        var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
        {
      "ClientTypeID",
   "TitleID",
    "GenderID",
      "MaritalStatusID",
   "LiteracyLevelID",
            "IdentificationTypeID"
        });

        return Ok(new
      {
   responseCode = "00",
            responseMessage = "Client lookups retrieved successfully",
            details = dropdowns
        });
    }
    catch (Exception ex)
    {
        Logger.LogError(ex, "Error fetching client lookups");
        return StatusCode(500, new
{
        responseCode = "99",
            responseMessage = "Failed to fetch lookups",
            details = ex.Message
        });
    }
}
```

## Comparison: Before vs After

### ? Before (Anonymous Objects with List<object>)
```csharp
// Method signature
Task<Dictionary<string, List<object>>> GetMultipleDropdownCodeOptionsAsync(...)

// Usage
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(...);
var titles = ViewData["Titles"] as List<object>; // Unsafe

foreach (dynamic item in titles) // No type safety
{
    var value = item.value; // No IntelliSense, runtime errors possible
    var label = item.label; // Typo not caught at compile time
}
```

### ? After (Strongly-Typed with DropdownCodeItem)
```csharp
// Method signature
Task<Dictionary<string, List<DropdownCodeItem>>> GetMultipleDropdownCodeOptionsAsync(...)

// Usage
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(...);
var titles = ViewData["Titles"] as List<DropdownCodeItem>; // Type-safe

foreach (var item in titles) // Full type safety
{
    var value = item.Value; // IntelliSense support
    var label = item.Label; // Compile-time checking
    var codeId = item.CodeID; // Additional metadata available
    var parentId = item.ParentCodeID; // Hierarchical support
}
```

## Common Scenarios

### Scenario 1: Load All Client Maintenance Dropdowns
```csharp
var clientDropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
    "ClientTypeID",
 "TitleID",
    "GenderID",
    "MaritalStatusID",
    "LiteracyLevelID",
    "IdentificationTypeID",
    "ResidentID",
    "RelationshipManagerID"
});
```

### Scenario 2: Load Account Maintenance Dropdowns
```csharp
var accountDropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
    "AccountTypeID",
    "CurrencyID",
    "OperatingModeID",
    "SignatoryTypeID",
    "AccountStatusID"
});
```

### Scenario 3: Load Location Hierarchies
```csharp
var locationDropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
    "CountryID",
    "CityID",
    "RegionID",
    "SubCityID",
    "AddressTypeID"
});

// Use ParentCodeID for cascading
```

### Scenario 4: Load Employment/Corporate Dropdowns
```csharp
var employmentDropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
    "OccupationID",
    "DesignationID",
    "DepartmentID",
    "SectionID",
    "IndustryID",
    "CompanyTypeID"
});
```

## Performance Tips

1. **Batch Loading**: Load all dropdowns for a page in one call
   ```csharp
   // ? Good: Single call for all dropdowns
   var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] 
   { 
     "TitleID", "GenderID", "MaritalStatusID" 
   });

   // ? Avoid: Multiple separate calls
   var titles = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "TitleID" });
   var genders = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "GenderID" });
   ```

2. **Cache Warming**: Preload common dropdowns at startup
   ```csharp
   // In CacheWarmingService or startup
   await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
   {
       "ClientTypeID", "TitleID", "GenderID", "MaritalStatusID"
 // ... other frequently used codes
   });
   ```

3. **Reuse Results**: Store in ViewBag/ViewData for multiple view components
   ```csharp
   var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(...);
   ViewBag.Dropdowns = dropdowns; // Reuse across partial views
   ```

## Troubleshooting

### Issue: Dropdowns not populated
```csharp
// Check if data was returned
var dropdowns = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[] { "TitleID" });
if (!dropdowns.ContainsKey("TitleID") || !dropdowns["TitleID"].Any())
{
    Logger.LogWarning("No titles found in system codes");
}
```

### Issue: Wrong dropdown shown
```csharp
// Verify CodeID matches
if (dropdowns.TryGetValue("TitleID", out var titles))
{
    foreach (var item in titles)
    {
        // item.CodeID should all be "TitleID"
        if (item.CodeID != "TitleID")
        {
 Logger.LogWarning("Mismatched CodeID: {CodeID}", item.CodeID);
        }
    }
}
```

### Issue: Cascading dropdowns not working
```csharp
// Verify ParentCodeID is populated
var cities = dropdowns["CityID"];
var citiesWithParent = cities.Where(c => !string.IsNullOrEmpty(c.ParentCodeID)).ToList();
Logger.LogInformation("Cities with parent: {Count}/{Total}", citiesWithParent.Count, cities.Count);
```

## See Also
- `GETMULTIPLEDROPDOWNCODEOPTIONS_USAGE_GUIDE.md` - Detailed usage guide
- `CBS.Entities.SystemCore\DROPDOWNCODEITEM_README.md` - POCO documentation
- `APICACHEDSERVICE_README.md` - ApiCachedService overview
- `CACHE_ARCHITECTURE.md` - Caching strategy
