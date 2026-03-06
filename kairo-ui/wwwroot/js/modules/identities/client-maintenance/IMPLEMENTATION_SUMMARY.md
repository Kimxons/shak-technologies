# Client Maintenance - Parent Record State Implementation

## Summary

Implemented a comprehensive parent record state management system for Client Maintenance that:

1. **Tracks when a client record is loaded** - Updates state in `ClientMaintenanceCore` and notifies `SidebarManager`
2. **Enables submodule access control** - Sidebar prevents access to submodules until a client is loaded
3. **Provides parent client ID to submodules** - All tab partials and sidebar submodules can access the active client ID
4. **Passes client ID in all operations** - Submodules automatically use parent client ID in searches and CRUD operations

## Changes Made

### 1. ClientMaintenanceCore Enhancement (`client-maintenance.js`)

#### Added Parent Context Methods:
```javascript
ClientMaintenanceCore.getParentClientId()     // Returns active client ID
ClientMaintenanceCore.getParentRequestId()    // Returns active request ID
ClientMaintenanceCore.getParentContext()      // Returns full context object
```

#### State Updates on Client Selection:
- When client is selected via Client ID search ? Updates `clientId` and notifies sidebar
- When application is selected ? Updates `requestId` and notifies sidebar  
- When workflow is reset ? Clears state and notifies sidebar

#### Sidebar Integration:
- Initializes `SidebarManager` with module name "Client"
- Calls `SidebarManager.setMainRecordLoaded(true, clientId)` when client loads
- Calls `SidebarManager.setMainRecordLoaded(false, null)` when workflow resets

### 2. SidebarManager Enhancement (`sidebar.js`)

#### Added Parent Context Function:
```javascript
getParentModuleContext() 
```
- Queries `ClientMaintenanceCore.getParentContext()` if available
- Falls back to `mainModuleState` 
- Returns context object with clientId, moduleId, requestId, etc.

#### Enhanced openChildForm:
- Sends `parentContext` message to iframe after load
- Child iframes receive parent context automatically via postMessage
- Enables iframe-based submodules to access parent client ID

#### Enhanced Public API:
- Added `getParentContext()` method to public API
- Enhanced state logging for debugging

### 3. Submodule Updates

#### client-address.js:
- `refreshAddressTable()` now uses `ClientMaintenanceCore.getSelectedId()`
- `buildPayload()` always includes parent client ID from `ClientMaintenanceCore`

#### client-relations.js:
- `refreshRelationsTable()` now uses `ClientMaintenanceCore.getSelectedId()`
- `buildPayload()` always includes parent client ID from `ClientMaintenanceCore`

**Note**: Other submodules (Personal, Employment, Corporate, etc.) already use `bindClientMaintenanceCrud` which correctly uses the parent context, so no changes were needed for them.

## How It Works

### Flow Diagram

```
1. User selects Client ID
 ?
2. ClientMaintenanceCore.clientId = selectedClientId
   ?
3. SidebarManager.setMainRecordLoaded(true, clientId)
   ?
4. mainModuleState.isMainRecordLoaded = true
   ?
5. Sidebar items become clickable
   ?
6. User clicks submodule in sidebar
   ?
7. SidebarManager checks if main record loaded
   ?
8. Opens iframe and sends parentContext via postMessage
   ?
9. Submodule receives context and uses clientId
   ?
10. All submodule operations include parent clientId
```

### State Object Structure

```javascript
// ClientMaintenanceCore state
{
    moduleId: '2020',     // Client Maintenance module ID
    clientId: 'CSK00092',       // Selected client ID
  requestId: 'REQ12345',      // Workflow request ID (for pipeline)
  useRequestId: false,        // Whether to use requestId as primary
    workflowId: '1',        // Current workflow/client type
}

// SidebarManager state
{
    isMainRecordLoaded: true,   // Whether main record is loaded
    primaryRecordId: 'CSK00092', // The primary record ID
    moduleName: 'Client',       // Module name for messages
    activeSubmodule: '/path/to/submodule.html' // Currently open submodule
}
```

## Usage in Different Scenarios

### Scenario 1: Tab Partial (e.g., Address, Relations)

Tab partials automatically receive the parent client ID via `_cmLoadData`:

```javascript
window.initClientMaintenanceAddressTab = function (tabRoot, moduleId) {
    // This function is called automatically when client is loaded
    tabRoot._cmLoadData = async (requestData) => {
        // requestData.ClientID contains the parent client ID
   await loadAddresses(requestData.ClientID);
    };
};
```

All searches and CRUD operations use `ClientMaintenanceCore.getSelectedId()`:

```javascript
const clientId = window.ClientMaintenanceCore.getSelectedId();
await service.get({ ClientID: clientId, ...otherParams });
```

### Scenario 2: Sidebar Submodule (Iframe)

Sidebar submodules receive parent context via postMessage:

```javascript
window.addEventListener('message', (event) => {
    if (event.data?.type === 'parentContext') {
        const clientId = event.data.data.clientId;
        
   // Use in all operations
        loadData(clientId);
        searchRecords({ ClientID: clientId, ...criteria });
    }
});
```

### Scenario 3: Direct Client ID Access

Any component can directly access the parent client ID:

```javascript
const clientId = window.ClientMaintenanceCore.getParentClientId();
const fullContext = window.ClientMaintenanceCore.getParentContext();
```

## Benefits

1. **Consistency**: All submodules always operate on the correct client
2. **Security**: Prevents cross-client data leakage
3. **User Experience**: No need to re-enter client ID in each submodule
4. **Data Integrity**: All searches and operations scoped to parent client
5. **Maintainability**: Centralized state management
6. **Debugging**: Clear console logs for state changes

## Testing

To verify the implementation:

1. **Load a client**:
   - Open Client Maintenance
   - Search and select a client (e.g., "CSK00092")
   - Check console: Should see "Notified sidebar of loaded client: CSK00092"

2. **Try accessing submodule without client**:
   - Refresh page (no client loaded)
   - Click a sidebar item
   - Should see warning: "Please load a Client before accessing this feature"

3. **Access tab partial**:
   - Load a client
   - Click Address tab
   - Address data should load automatically for that client
 - Check network tab: ClientID should match selected client

4. **Access sidebar submodule**:
   - Load a client
   - Click a sidebar item (if configured)
   - Check iframe console: Should receive parentContext message
   - Submodule should use parent client ID in operations

5. **Reset workflow**:
   - Load a client
   - Click Cancel button
   - Sidebar items should become disabled
   - Console should show: "Notified sidebar of cleared client state"

## Console Logs to Monitor

```
[Client Maintenance] Initialized sidebar manager
[Client Maintenance] Notified sidebar of loaded client: CSK00092
[Sidebar] Main record state updated: { isLoaded: true, primaryRecordId: 'CSK00092' }
[Sidebar] Sent parent context to child iframe: { clientId: 'CSK00092', ... }
[Client Maintenance] Notified sidebar of cleared client state
```

## Future Enhancements

Possible improvements for the future:

1. **Event-based updates**: Emit custom events when parent context changes
2. **Context caching**: Cache parent context in submodules to reduce lookups
3. **Multi-client support**: Support for operations across multiple clients
4. **Context validation**: Validate that context matches expected structure
5. **Audit trail**: Log all parent context usage for debugging

## Related Files

- `kairo-ui/wwwroot/js/modules/identities/client-maintenance/client-maintenance.js` - Main controller
- `kairo-ui/wwwroot/js/modules/shared/sidebar.js` - Sidebar manager
- `kairo-ui/wwwroot/js/modules/identities/client-maintenance/client-address.js` - Tab partial example
- `kairo-ui/wwwroot/js/modules/identities/client-maintenance/client-relations.js` - Tab partial example
- `kairo-ui/wwwroot/js/modules/identities/client-maintenance/SUBMODULE_CONTEXT_GUIDE.md` - Developer guide
