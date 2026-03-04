# Client Maintenance Auto-Load Implementation

## Overview
All Client Maintenance partial view controllers have been updated to support auto-loading of records when `clientId` and/or `requestId` query parameters are provided.

## Implementation Details

### Updated Controllers

All the following controllers have been updated with the new parameters:

1. **ClientMaintenanceController** (Main view)
2. **ClientAddressController**
3. **ClientPersonalController**
4. **ClientCorporateController**
5. **ClientRelationsController**
6. **ClientDocumentsController**
7. **ClientEmploymentController**
8. **ClientGroupDetailController**
9. **ClientKycController**
10. **ClientOffersController**
11. **ClientPhotoSignatureController**
12. **ClientProductsController**
13. **ClientSubmitController**

### Changes Made

#### Controller Action Signature
Each `Index` action now accepts three optional parameters:

```csharp
[HttpGet]
[Route("Index")]
public async Task<IActionResult> Index(
    string? moduleId = null, 
    string? clientId = null, 
 string? requestId = null)
{
    // Implementation
}
```

#### ViewData Population
Each controller now sets the following ViewData values:

```csharp
ViewData["ModuleId"] = moduleId ?? string.Empty;
ViewData["ClientId"] = clientId ?? string.Empty;
ViewData["RequestId"] = requestId ?? string.Empty;
ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();
```

### Usage Examples

#### URL Format
```
/Identities/ClientMaintenance/Address/Index?moduleId=1234&clientId=CLI001
/Identities/ClientMaintenance/Address/Index?moduleId=1234&requestId=REQ123
/Identities/ClientMaintenance/Address/Index?moduleId=1234&clientId=CLI001&requestId=REQ123
```

#### JavaScript/AJAX Loading
```javascript
// Load Address tab with auto-load
const url = '/Identities/ClientMaintenance/Address/Index';
const params = new URLSearchParams({
    moduleId: '1234',
    clientId: 'CLI001',
    requestId: 'REQ456' // Optional
});

fetch(`${url}?${params}`)
    .then(response => response.text())
    .then(html => {
        // Load partial view into container
     document.getElementById('tabContainer').innerHTML = html;
    });
```

#### From Razor View
```razor
<a href="@Url.Action("Index", "ClientAddress", new { 
    moduleId = "1234", 
    clientId = "CLI001", 
    requestId = "REQ456" 
})">
    Load Address
</a>
```

### ViewData Available in Partial Views

Each partial view now has access to:

| ViewData Key | Type | Description |
|-------------|------|-------------|
| `ModuleId` | string | The module identifier |
| `ClientId` | string | The client identifier to auto-load |
| `RequestId` | string | The request identifier to auto-load |
| `AutoLoad` | string | "true" or "false" - indicates if auto-load should occur |

### JavaScript Implementation Pattern

Each partial view's JavaScript should check for auto-load on initialization:

```javascript
document.addEventListener('DOMContentLoaded', function() {
    // Get ViewData values
    const autoLoad = document.getElementById('autoLoadFlag')?.value === 'true';
    const clientId = document.getElementById('clientIdValue')?.value;
    const requestId = document.getElementById('requestIdValue')?.value;
    
    if (autoLoad && (clientId || requestId)) {
        // Call the respective get/view method
        loadRecords(clientId, requestId);
  }
});

async function loadRecords(clientId, requestId) {
    const requestData = {
        ClientID: clientId,
        RecordID: requestId,
      ModuleID: getModuleId(),
      OperatorID: getOperatorId(),
        OurBranchID: getBranchId(),
  BankID: getBankId()
    };
    
    try {
        const response = await fetch('/Identities/ClientMaintenance/Address/get', {
   method: 'POST',
            headers: {
      'Content-Type': 'application/json'
   },
        body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        
   if (result.success) {
    // Populate form with result data
  populateForm(result.data);
        }
  } catch (error) {
        console.error('Error loading records:', error);
    }
}
```

### Partial View HTML Pattern

Each partial view should include hidden fields for JavaScript access:

```html
@model YourModelType

<!-- Hidden fields for JavaScript access -->
<input type="hidden" id="autoLoadFlag" value="@ViewData["AutoLoad"]" />
<input type="hidden" id="clientIdValue" value="@ViewData["ClientId"]" />
<input type="hidden" id="requestIdValue" value="@ViewData["RequestId"]" />
<input type="hidden" id="moduleIdValue" value="@ViewData["ModuleId"]" />

<!-- Rest of the form -->
<form id="addressForm">
    <!-- Form fields -->
</form>
```

## Benefits

1. **Deep Linking**: Users can bookmark or share URLs that load specific client records
2. **Navigation**: Easy navigation between client records and their related data
3. **Workflow Integration**: Seamless integration with approval and supervision workflows
4. **State Preservation**: Maintain context when navigating between tabs
5. **External Integration**: Other systems can link directly to specific client records

## API Endpoints

Each controller maintains its existing POST endpoints:

- `get` - Retrieve records
- `create` - Create new record
- `update` - Update existing record
- `delete` - Delete record

These endpoints work with the `ClientMaintenanceCrudRequest` model which includes:
- `ClientID`
- `RecordID`
- `ModuleID`
- `OperatorID`
- `OurBranchID`
- `BankID`
- `Payload` (for create/update operations)

## Testing

### Test Scenarios

1. **Load without parameters**: Should display empty form
   ```
   /Identities/ClientMaintenance/Address/Index?moduleId=1234
   ```

2. **Load with clientId**: Should auto-load all records for client
   ```
   /Identities/ClientMaintenance/Address/Index?moduleId=1234&clientId=CLI001
   ```

3. **Load with requestId**: Should auto-load specific record
   ```
   /Identities/ClientMaintenance/Address/Index?moduleId=1234&requestId=REQ123
   ```

4. **Load with both**: Should auto-load based on priority (implementation dependent)
   ```
   /Identities/ClientMaintenance/Address/Index?moduleId=1234&clientId=CLI001&requestId=REQ123
   ```

## Next Steps

1. Update each partial view's JavaScript to implement the auto-load functionality
2. Add hidden fields to each partial view for parameter access
3. Test auto-load functionality for each tab
4. Update documentation with specific examples for each tab
5. Implement error handling for failed auto-load attempts

## Backward Compatibility

- All changes are backward compatible
- Existing code that doesn't pass `clientId` or `requestId` will continue to work
- The `AutoLoad` flag allows JavaScript to determine whether to auto-load

## Notes

- The `AutoLoad` ViewData is a string "true" or "false" (lowercase) for easy JavaScript boolean comparison
- All parameters are nullable, maintaining flexibility
- The implementation follows the existing pattern used in the codebase
- No breaking changes to existing functionality

---

**Implementation Date**: 2025-01-XX  
**Status**: ? Completed - All controllers updated and build successful
