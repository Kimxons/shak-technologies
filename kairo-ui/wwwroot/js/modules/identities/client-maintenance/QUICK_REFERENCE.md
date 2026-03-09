# Client Maintenance - Quick Reference

## Getting Parent Client ID

### In Tab Partials (Address, Relations, Employment, etc.)
```javascript
const clientId = window.ClientMaintenanceCore?.getSelectedId?.() || '';
```

### In Sidebar Submodules (Iframe)
```javascript
// Via postMessage (automatic)
window.addEventListener('message', (event) => {
    if (event.data?.type === 'parentContext') {
        const clientId = event.data.data.clientId;
    }
});

// Or direct access (if same-origin)
const clientId = window.parent?.ClientMaintenanceCore?.getParentClientId?.() || '';
```

## Building Request Payloads

### Standard Pattern
```javascript
const payload = {
    ModuleID: window.ClientMaintenanceCore?.moduleId || '',
    ClientID: window.ClientMaintenanceCore?.getSelectedId?.() || '',
    RequestID: window.ClientMaintenanceCore?.requestId || '',
    Payload: {
// Your form data here
    }
};
```

### With Search Criteria
```javascript
const searchRequest = {
 ClientID: window.ClientMaintenanceCore?.getSelectedId?.() || '', // Parent client
    SearchCriteria: {
        // Your filters here
 }
};
```

## Checking If Client Is Loaded

```javascript
const clientId = window.ClientMaintenanceCore?.getSelectedId?.();
if (!clientId) {
    window.ClientMaintenanceCore.showToast('No client selected', 'warning');
    return;
}
// Proceed with operation...
```

## Complete Context Object

```javascript
const context = window.ClientMaintenanceCore?.getParentContext?.() || {};
// Returns:
// {
//   moduleId: '2020',
//   clientId: 'CSK00092',
//   requestId: 'REQ12345',
//   useRequestId: false,
//   selectedId: 'CSK00092'  // The active ID (respects useRequestId flag)
// }
```

## Common Patterns

### Pattern 1: Auto-load data when tab opens
```javascript
window.initClientMaintenanceMyTab = function (tabRoot, moduleId) {
    tabRoot._cmLoadData = async (requestData) => {
        const clientId = requestData?.ClientID || 
   window.ClientMaintenanceCore?.getSelectedId?.() || '';
      
        if (clientId) {
     await loadMyTabData(clientId);
    }
    };
};
```

### Pattern 2: Refresh table with parent client
```javascript
const refreshTable = async () => {
    const clientId = window.ClientMaintenanceCore?.getSelectedId?.() || '';
    if (!clientId) {
        renderEmptyTable();
        return;
    }
    
    const response = await service.get({
        ModuleID: window.ClientMaintenanceCore?.moduleId || '',
     ClientID: clientId,
     RequestID: window.ClientMaintenanceCore?.requestId || ''
    });
    
    renderTable(response.data);
};
```

### Pattern 3: Build CRUD payload
```javascript
const buildPayload = () => {
    const formData = {};
  document.querySelectorAll('[data-field]').forEach(field => {
  formData[field.dataset.field] = field.value;
    });
    
    return {
        ModuleID: window.ClientMaintenanceCore?.moduleId || '',
        ClientID: window.ClientMaintenanceCore?.getSelectedId?.() || '',
        RequestID: window.ClientMaintenanceCore?.requestId || '',
        Payload: formData
    };
};
```

### Pattern 4: Submodule in iframe
```javascript
(function() {
    let parentClientId = '';
    
    // Listen for parent context
    window.addEventListener('message', (event) => {
   if (event.data?.type === 'parentContext') {
            parentClientId = event.data.data.clientId;
  initWithClient(parentClientId);
        }
    });
    
    // Use in all operations
    async function searchData(filters) {
        await fetch('/api/search', {
 method: 'POST',
     body: JSON.stringify({
     ClientID: parentClientId,  // Parent client ID
         ...filters
       })
        });
    }
})();
```

## Console Debugging

### Check if client is loaded:
```javascript
window.ClientMaintenanceCore.clientId
// Should return client ID or null
```

### Check sidebar state:
```javascript
window.SidebarManager.getState()
// Returns: { isMainRecordLoaded: true, primaryRecordId: 'CSK00092', ... }
```

### Check parent context:
```javascript
window.ClientMaintenanceCore.getParentContext()
// Returns full context object
```

## Important Notes

? **DO**: Always use `getSelectedId()` - it respects the `useRequestId` flag
? **DO**: Check if client ID exists before operations
? **DO**: Include parent client ID in all search payloads
? **DO**: Use `ClientMaintenanceCore` methods instead of direct property access

? **DON'T**: Directly access `ClientMaintenanceCore.clientId` (use `getSelectedId()`)
? **DON'T**: Assume a client is loaded - always check first
? **DON'T**: Allow users to manually change client ID in submodules
? **DON'T**: Skip parent client ID in search criteria

## Files Modified

- ? `client-maintenance.js` - Added parent context methods and sidebar integration
- ? `sidebar.js` - Enhanced to send parent context to iframes
- ? `client-address.js` - Updated to use parent client ID
- ? `client-relations.js` - Updated to use parent client ID
- ?? Other tabs (Personal, Employment, Corporate, etc.) already working correctly

## Testing Checklist

- [ ] Select a client ? Sidebar items enabled
- [ ] Open Address tab ? Addresses load for selected client
- [ ] Open Relations tab ? Relations load for selected client
- [ ] Try to open sidebar submodule without client ? Shows warning
- [ ] Click Cancel ? Sidebar items disabled
- [ ] Select different client ? New client ID used in all operations
- [ ] Check console logs ? State changes logged correctly

## Support

See `SUBMODULE_CONTEXT_GUIDE.md` for detailed documentation.
