# Client Maintenance - Submodule Parent Context Guide

## Overview

The Client Maintenance module maintains a parent record state that all submodules and tab partials can access. This ensures that submodules always have access to the active client ID for their operations, searches, and data management.

## Architecture

### Parent Module State

The `ClientMaintenanceCore` object maintains the following state:
- `clientId` - The currently selected client ID
- `requestId` - The currently selected workflow request ID (for pipeline applications)
- `moduleId` - The module ID for Client Maintenance
- `useRequestId` - Flag indicating whether to use requestId or clientId as primary
- `workflowId` - The current workflow/client type ID

### Sidebar Integration

The `SidebarManager` tracks whether a main record is loaded:
- Prevents submodule access until a client is loaded
- Shows appropriate warnings when trying to access submodules without a parent record
- Automatically notified when client state changes

## Accessing Parent Context

### For Tab Partials (Address, Relations, Employment, etc.)

Tab partials automatically receive the parent client ID via the `_cmLoadData` function:

```javascript
// In your tab initialization (e.g., client-address.js)
window.initClientMaintenanceAddressTab = function (tabRoot, moduleId) {
    // Auto-load function that receives parent context
    tabRoot._cmLoadData = (requestData) => {
        // requestData contains:
        // - ModuleID
        // - ClientID (from parent)
        // - RequestID (from parent)
        
        refreshAddressTable(requestData);
    };
    
  // In your refresh/load functions, always use parent context:
    const refreshAddressTable = async (requestData) => {
        const clientId = requestData?.ClientID || 
            window.ClientMaintenanceCore?.getSelectedId?.() || 
        window.ClientMaintenanceCore?.clientId || '';
        
        if (!clientId) {
            // No client loaded yet
            return;
        }
        
        // Use clientId in your API call
    const response = await service.get({
    ModuleID: moduleId,
    ClientID: clientId,  // Parent client ID
            RequestID: window.ClientMaintenanceCore?.requestId || ''
        });
    };
};
```

### For Sidebar Submodules (Iframe-based)

Submodules loaded in the sidebar iframe can access parent context in multiple ways:

#### Method 1: Via postMessage (Recommended)

The sidebar automatically sends parent context when the iframe loads:

```javascript
// In your submodule's JavaScript file
window.addEventListener('message', function(event) {
    if (event.data?.type === 'parentContext' || event.data?.action === 'parentContextLoaded') {
     const parentContext = event.data.data;
   
        // parentContext contains:
    // - moduleId
        // - clientId
        // - requestId
        // - useRequestId
        // - selectedId (the currently active ID)
   
        console.log('Parent client ID:', parentContext.clientId);
        
        // Use in your searches and API calls
        loadSubmoduleData(parentContext.clientId);
    }
});
```

#### Method 2: Direct Access (If same-origin)

If your submodule is same-origin, you can directly access:

```javascript
// Access parent context directly
function getParentClientId() {
    try {
        if (window.parent && window.parent !== window) {
            return window.parent.ClientMaintenanceCore?.getParentClientId?.() || '';
        }
    } catch (error) {
   console.warn('Cannot access parent context:', error);
    }
    return '';
}

// Get full parent context
function getParentContext() {
 try {
        if (window.parent && window.parent !== window) {
    return window.parent.ClientMaintenanceCore?.getParentContext?.() || null;
     }
    } catch (error) {
      console.warn('Cannot access parent context:', error);
    }
    return null;
}
```

#### Method 3: Via SidebarManager

```javascript
// Access via SidebarManager (if available in parent)
function getParentContextViaSidebar() {
    try {
      if (window.parent && window.parent !== window) {
          return window.parent.SidebarManager?.getParentContext?.() || null;
        }
    } catch (error) {
        console.warn('Cannot access sidebar context:', error);
    }
    return null;
}
```

## Using Parent Client ID in Searches

### In Tab Partials

```javascript
// Example: Search within the parent client's records
async function searchClientAddresses(searchCriteria) {
    const clientId = window.ClientMaintenanceCore?.getSelectedId?.() || '';
    
    if (!clientId) {
        window.ClientMaintenanceCore.showToast('No client selected', 'warning');
        return;
    }
    
    const response = await service.search({
        ClientID: clientId,  // Parent client as search key
        ...searchCriteria
    });
}
```

### In Sidebar Submodules

```javascript
// Example: Initialize search with parent client ID
function initializeSubmoduleSearch(parentClientId) {
  const searchForm = document.getElementById('searchForm');
    
    // Pre-fill client ID field (read-only)
    const clientIdField = document.getElementById('clientId');
    if (clientIdField) {
        clientIdField.value = parentClientId;
        clientIdField.readOnly = true; // Lock to parent client
    }
    
    // Use parent client ID in all searches
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const response = await fetchData({
            ClientID: parentClientId,  // Always use parent client
     // ... other search criteria
    });
    });
}

// Listen for parent context
window.addEventListener('message', function(event) {
    if (event.data?.type === 'parentContext') {
        const parentClientId = event.data.data.clientId;
        initializeSubmoduleSearch(parentClientId);
    }
});
```

## Building Request Payloads

Always include the parent client ID in your request payloads:

```javascript
function buildRequestPayload() {
    // Get parent context
    const clientId = window.ClientMaintenanceCore?.getSelectedId?.() || '';
    const moduleId = window.ClientMaintenanceCore?.moduleId || '';
    const requestId = window.ClientMaintenanceCore?.requestId || '';
    
    // Collect form data
    const formData = {};
    document.querySelectorAll('input, select, textarea').forEach(field => {
        if (field.name) {
        formData[field.name] = field.value;
        }
    });
    
    return {
        ModuleID: moduleId,
        ClientID: clientId,      // Parent client ID
        RequestID: requestId,    // Parent request ID (if applicable)
        Payload: formData
    };
}
```

## State Change Events

The parent module updates the sidebar state automatically when:

1. **Client is selected**: `SidebarManager.setMainRecordLoaded(true, clientId)`
2. **Application is selected**: `SidebarManager.setMainRecordLoaded(true, requestId)`
3. **Workflow is reset**: `SidebarManager.setMainRecordLoaded(false, null)`

Submodules don't need to manage this state - it's handled automatically by the parent.

## Example: Complete Submodule Implementation

```javascript
// submodule.js - Sidebar submodule that needs parent client ID

(function() {
 'use strict';
    
    let parentClientId = null;
    let parentModuleId = null;
    
    // =========================================================================
    // Parent Context Management
    // =========================================================================
    
  /**
     * Listen for parent context from sidebar
     */
    function setupParentContextListener() {
        window.addEventListener('message', function(event) {
   if (event.data?.type === 'parentContext' || 
           event.data?.action === 'parentContextLoaded') {
     
     const context = event.data.data;
       parentClientId = context?.clientId || context?.selectedId || '';
                parentModuleId = context?.moduleId || '';
     
     console.log('Received parent context:', context);
   
      // Initialize with parent context
         if (parentClientId) {
          initializeWithParentClient(parentClientId);
    }
            }
        });
    }
    
    /**
     * Try to get parent context directly (fallback)
     */
    function getParentContextDirect() {
        try {
if (window.parent && window.parent !== window) {
   const context = window.parent.ClientMaintenanceCore?.getParentContext?.();
          if (context) {
      parentClientId = context.clientId || context.selectedId || '';
       parentModuleId = context.moduleId || '';
   return context;
       }
            }
        } catch (error) {
            console.warn('Cannot access parent context directly:', error);
   }
    return null;
    }
    
    // =========================================================================
    // Submodule Logic
    // =========================================================================
    
    function initializeWithParentClient(clientId) {
        console.log('Initializing submodule with client:', clientId);
      
        // Lock client ID field to parent client
        const clientIdField = document.getElementById('clientId');
        if (clientIdField) {
            clientIdField.value = clientId;
     clientIdField.readOnly = true;
         clientIdField.disabled = true;
        }
        
        // Load submodule data for this client
        loadSubmoduleData(clientId);
    }
    
async function loadSubmoduleData(clientId) {
     if (!clientId) return;
        
        try {
            // Always pass parent client ID in searches
   const response = await fetchData({
             ClientID: clientId,
                ModuleID: parentModuleId,
          // ... other parameters
      });
            
            // Process response...
        } catch (error) {
        console.error('Error loading data:', error);
        }
    }
    
 // =========================================================================
    // Initialization
    // =========================================================================
    
    function initialize() {
        // Setup message listener first
     setupParentContextListener();
        
      // Try direct access as fallback
 const context = getParentContextDirect();
        if (context?.clientId) {
   initializeWithParentClient(context.clientId);
        }
        
        // ... rest of initialization
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
 initialize();
    }
    
})();
```

## Best Practices

1. **Always check for client ID before operations**: Never assume a client is loaded
2. **Use getSelectedId() helper**: This respects the `useRequestId` flag
3. **Lock client ID fields in submodules**: Make them read-only to prevent confusion
4. **Handle both postMessage and direct access**: For compatibility
5. **Log context for debugging**: Use console.log to verify context is received
6. **Show appropriate messages**: If no client is loaded, guide the user

## Troubleshooting

### Submodule can't access parent client ID

1. Check if `ClientMaintenanceCore` exists in parent: `window.parent.ClientMaintenanceCore`
2. Verify client is loaded: Check if client search was completed successfully
3. Check sidebar state: `window.parent.SidebarManager.getState()`
4. Look for postMessage in console: Should see "Sent parent context to child iframe"

### Sidebar not preventing submodule access

1. Ensure `SidebarManager.init()` is called with `moduleName`
2. Verify `setMainRecordLoaded()` is called when client is selected
3. Check `requireMainRecord` option is set to `true` (default)

### Context not updating after client change

1. Verify sidebar notification: Look for "Notified sidebar of loaded client" in console
2. Check if `setMainRecordLoaded()` is called with the new client ID
3. Ensure submodule is refreshed or listens for context changes

## API Reference

### ClientMaintenanceCore Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getParentClientId()` | `string` | Returns the active client ID |
| `getParentRequestId()` | `string` | Returns the active request ID |
| `getSelectedId()` | `string` | Returns the primary ID (respects useRequestId flag) |
| `getParentContext()` | `object` | Returns full context with all IDs |

### SidebarManager Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `setMainRecordLoaded(isLoaded, id)` | `boolean, string` | Updates main record state |
| `getState()` | - | Returns current sidebar state |
| `getParentContext()` | - | Returns parent module context |

## Examples by Use Case

### Use Case 1: Search addresses for current client only

```javascript
// In client-address.js or any submodule
async function searchAddresses(filters) {
    const clientId = window.ClientMaintenanceCore?.getSelectedId?.() || '';
    
    const response = await service.search({
     ClientID: clientId,  // Locked to parent client
        AddressType: filters.addressType,
   City: filters.city
      // ClientID is always included as search key
    });
}
```

### Use Case 2: Create new relation for current client

```javascript
// In client-relations.js
async function createRelation(relationData) {
    const context = window.ClientMaintenanceCore?.getParentContext?.() || {};
    
    const payload = {
 ModuleID: context.moduleId,
     ClientID: context.clientId,  // Parent client
        RequestID: context.requestId,
        Payload: {
  RelatedClientID: relationData.relatedClientId,
     RelationID: relationData.relationId,
    // ... other fields
 }
    };
    
    const response = await service.create(payload);
}
```

### Use Case 3: Sidebar submodule with search

```javascript
// In a sidebar submodule (iframe)
(function() {
  let parentClientId = '';
    
    // Listen for parent context
    window.addEventListener('message', (event) => {
        if (event.data?.type === 'parentContext') {
     parentClientId = event.data.data.clientId;
            
            // Lock client ID in UI
     const clientField = document.getElementById('clientId');
     if (clientField) {
           clientField.value = parentClientId;
    clientField.readOnly = true;
          }
            
            // Auto-load data for this client
      loadData(parentClientId);
      }
    });
    
 // Search function always uses parent client
    async function searchRecords(criteria) {
        const response = await fetch('/api/search', {
   method: 'POST',
   body: JSON.stringify({
    ClientID: parentClientId,  // Always parent client
      ...criteria
            })
        });
    }
    
    // Request parent context if not received
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            action: 'requestParentContext' 
        }, '*');
    }
})();
```

## Testing Checklist

- [ ] Client selection updates sidebar state
- [ ] Application selection updates sidebar state  
- [ ] Submodules disabled until client is loaded
- [ ] Tab partials receive client ID automatically
- [ ] Sidebar submodules receive parent context via postMessage
- [ ] All searches include parent client ID as search key
- [ ] CRUD operations include parent client ID
- [ ] Workflow reset clears sidebar state
- [ ] Cancel clears sidebar state
- [ ] Parent context logged in browser console for debugging

## Migration Guide

If migrating existing submodules to use parent context:

### Before (Manual client ID management):
```javascript
function loadData() {
    const clientId = document.getElementById('clientId').value;
 // User had to manually enter client ID
}
```

### After (Automatic parent context):
```javascript
function loadData() {
    const clientId = window.ClientMaintenanceCore?.getSelectedId?.() || '';
    // Automatically uses parent client ID
}
```

### Update Pattern:

1. Replace manual client ID retrieval with `ClientMaintenanceCore.getSelectedId()`
2. Remove user-facing client ID input fields (or make them read-only/display-only)
3. Always include parent client ID in payload building functions
4. Add postMessage listener if submodule is in iframe
5. Test that data loads correctly when client is selected

## Support

For questions or issues, contact the development team or refer to:
- `client-maintenance.js` - Main parent module
- `sidebar.js` - Sidebar manager
- `client-address.js` - Example tab partial implementation
