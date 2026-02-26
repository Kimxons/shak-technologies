# SearchModal Integration Guide

## Overview

SearchModal is a reusable, modern modal component for searching and selecting records from any searchable table in the Kairo system. It features theme-aware styling, key-set based pagination, and seamless integration with the AppCore framework.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Basic Integration](#basic-integration)
3. [Configuration Options](#configuration-options)
4. [Usage Examples](#usage-examples)
5. [Keyboard Shortcuts](#keyboard-shortcuts)
6. [Pagination (Key-Set Based)](#pagination-key-set-based)
7. [API Endpoints](#api-endpoints)
8. [Event Handling](#event-handling)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Imports

Your view/page must include these dependencies:

1. **Bootstrap** - Modal styling foundation
   ```html
   <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.x/dist/css/bootstrap.min.css">
   ```

2. **SearchModal JavaScript** - Core functionality
   ```html
   <script src="/js/modules/shared/searchModal.js"></script>
   ```

3. **SearchModal CSS** - Theme-aware styling
   ```html
   <link rel="stylesheet" href="/css/search-modal.css" />
   ```

4. **app-core.js** - API invocation framework
   ```html
   <script src="/js/core/app-core.js"></script>
   ```

### Layout Approach

Use the `_ApplicationLayout` in kairo-ui to automatically include these dependencies:

```csharp
@{
    Layout = "_ApplicationLayout";
}
```

---

## Basic Integration

### Step 1: Include in Your View/Module

```html
<!-- Your page/view content -->
<button id="btnSearchClients" class="btn btn-primary">
    <i class="bi bi-search"></i> Search Client
</button>

<!-- SearchModal will be injected here -->
<div id="searchModalContainer"></div>

<script src="/js/modules/shared/searchModal.js"></script>
<script>
    // Initialize SearchModal
    const searchModal = new SearchModal(window.AppCore);
    
    // Open on button click
    document.getElementById('btnSearchClients')?.addEventListener('click', async () => {
        const result = await searchModal.open({
            tableID: 'ClientID',
            moduleID: '1000',
            onSelect: (record) => {
                console.log('Selected client:', record);
                // Handle selected record
            }
        });
    });
</script>
```

### Step 2: Handle Modal Close

The modal returns control when the user:
- Clicks **OK** with a row selected → returns selected row data
- Clicks **Close** → returns undefined
- Clicks outside the modal → closes silently

---

## Configuration Options

### open() Configuration Object

```javascript
searchModal.open({
    // Required
    tableID: 'ClientID',           // Table identifier for the backend search
    
    // Optional with defaults
    moduleID: '1000',              // Module ID (default: '1000')
    whereStmt: '',                 // WHERE clause for filtering
    advFilterString: '',           // Advanced filter criteria
    searchKey: '',                 // Initial search criteria (JSON string or empty)
    pageSize: 20,                  // Page size options: 10, 20, 50, 100 (default: 20)
    
    // Callbacks
    onSelect: (row) => {           // Called when user clicks OK with a row selected
        // row contains the selected record data
    }
});
```

### Common tableID Values

| Table ID | Description |
|----------|-------------|
| `ClientID` | Client lookup |
| `AccountID` | Account lookup |
| `ProductID` | Product lookup |
| `BranchID` | Branch lookup |

---

## Usage Examples

### Example 1: Simple Client Search

```javascript
const searchModal = new SearchModal(window.AppCore);

document.getElementById('btnSearchClient')?.addEventListener('click', async () => {
    const result = await searchModal.open({
        tableID: 'ClientID',
        onSelect: (record) => {
            console.log('Client selected:', record);
            // Populate form fields
            document.getElementById('clientId').value = record.ClientID;
            document.getElementById('clientName').value = record.Name;
        }
    });
});
```

### Example 2: Search with Pre-filled Criteria

```javascript
// Open search with filter
searchModal.open({
    tableID: 'ClientID',
    whereStmt: 'Status = "Active"',
    searchKey: 'John%',  // Pre-populated name search
    onSelect: (record) => {
        // Handle selection
    }
});
```

### Example 3: Keyboard Shortcut (F2)

```javascript
const clientIdInput = document.getElementById('clientIdSearch');

clientIdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
        e.preventDefault();
        searchModal.open({
            tableID: 'ClientID',
            onSelect: (record) => {
                clientIdInput.value = record.ClientID;
            }
        });
    }
});
```

### Example 4: Multi-selected Fields

```javascript
searchModal.open({
    tableID: 'ClientID',
    onSelect: (record) => {
        // Extract and populate multiple fields
        document.getElementById('clientId').value = record.ClientID || '';
        document.getElementById('clientName').value = record.Name || '';
        document.getElementById('branchCode').value = record.BranchCode || '';
        document.getElementById('status').value = record.Status || '';
    }
});
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **F2** | Open search modal (when focused on search trigger) |
| **Enter** | Search button / Navigate through results |
| **Double-Click** | Select row immediately (auto-submit) |
| **Single-Click** | Highlight row for selection |
| **Esc** | Close modal |
| **↑ / ↓** | Navigate between rows |

---

## Pagination (Key-Set Based)

SearchModal uses **cursor-based pagination** for efficient data retrieval:

### How It Works

1. **First Search** (default): `PrevOrNext: 0`, `RefID: ""`
   - Backend returns first page of results

2. **Next Page**: `PrevOrNext: 1`, `RefID: <last-row-key-value>`
   - Backend returns next page using the last row's key

3. **Previous Page**: `PrevOrNext: -1`, `RefID: <last-row-key-value>`
   - Backend returns previous page

### Page Size Dropdown

The footer contains a page size selector (10, 20, 50, 100 records):

```javascript
// The page size is automatically read from the dropdown
// When you change it, the next search will use the new page size
const pageSize = document.getElementById('search-page-size')?.value || 20;
```

### Internal State

```javascript
// SearchModal maintains these pagination values:
searchModal.refID = '';           // Last navigation key value
searchModal.prevOrNext = 0;       // Direction: 0 (default), 1 (next), -1 (previous)
searchModal.pageSize = 20;        // Current page size
searchModal.keyForNavigation = ''; // Field name used for cursor navigation
```

---

## API Endpoints

### Backend Integration

SearchModal calls these endpoints:

#### 1. Load Modal HTML
```
GET /api/v1/Shared/GetSystemSearch
?TableID=ClientID
&ModuleID=1000
&WhereStmt=
&AdvFilterString=
&SearchKey=
&PageSize=20
&RefID=
&PrevOrNext=0
```

#### 2. Execute Search
```
POST /api/v1/Shared/GetSystemSearchResult
Body:
{
    "TableID": "ClientID",
    "WhereStmt": "",
    "AdvFilterString": "",
    "SearchKey": "{}",
    "ModuleID": "1000",
    "PageSize": 20,
    "RefID": "",
    "PrevOrNext": 0
}
```

### Required DTO Properties

Both endpoints expect these parameters:

```csharp
public class SearchModalRequestDto
{
    public string TableID { get; set; }
    public string? WhereStmt { get; set; }
    public string? AdvFilterString { get; set; }
    public string? SearchKey { get; set; }
    public string? ModuleID { get; set; }
    public int? PageSize { get; set; }
    public string? RefID { get; set; }              // Last row's navigation key
    public int? PrevOrNext { get; set; }            // 0=default, 1=next, -1=previous
}
```

---

## Event Handling

### Selection Event

```javascript
searchModal.open({
    tableID: 'ClientID',
    onSelect: (record) => {
        // record is a single object with properties from the database
        console.log('Selected row data:', record);
        
        // Access properties dynamically
        Object.keys(record).forEach(key => {
            console.log(`${key}: ${record[key]}`);
        });
    }
});
```

### Error Handling

```javascript
try {
    const result = await searchModal.open({
        tableID: 'ClientID',
        onSelect: (record) => {
            // Handle selection
        }
    });
    
    if (!result) {
        console.log('Modal closed without selection');
    }
} catch (error) {
    console.error('Search modal error:', error);
    // Show error toast
}
```

### Modal Lifecycle

```javascript
// Before opening
searchModal.refID = '';          // Reset pagination
searchModal.prevOrNext = 0;      // Reset direction

// During open
// - Modal loads configuration from backend
// - User can search and paginate
// - Selections filtered through onSelect callback

// After closing
// Modal remains in DOM for reuse
// State is preserved if not reset
```

---

## Troubleshooting

### Issue: "SearchModal is not available"

**Cause:** Script not loaded or loaded after dependent code

**Solution:**
```html
<!-- Ensure correct load order -->
<script src="/js/core/app-core.js"></script>
<script src="/js/modules/shared/searchModal.js"></script>
<script>
    // Now SearchModal is available
    const searchModal = new SearchModal(window.AppCore);
</script>
```

### Issue: No Results Displayed

**Cause:** 
- Invalid `tableID`
- Backend search configuration not found
- Incorrect `whereStmt` or `advFilterString`

**Solution:**
```javascript
// Verify tableID is supported by backend
// Add debugging
searchModal.open({
    tableID: 'ClientID',
    onSelect: (record) => console.log(record)
});

// Check browser console for API errors
// Verify backend endpoint returns valid JSON
```

### Issue: Pagination Not Working

**Cause:** `KeyForNavigation` field not configured or returned empty

**Solution:**
```javascript
// The backend must return the navigation key field in each row
// Verify the field is in the response payload

// Check console logs
console.log('[SearchModal] Updated RefID:', searchModal.refID);
```

### Issue: Theme Colors Not Applied

**Cause:** CSS file not loaded or conflicting styles

**Solution:**
```html
<!-- Ensure CSS is in <head> -->
<link rel="stylesheet" href="/css/search-modal.css" />

<!-- Check for z-index conflicts -->
<!-- Modal uses z-index: 9999 -->
```

### Issue: Modal Appears Behind Other Elements

**Solution:**
```css
/* Increase z-index if needed */
.search-modal-themed {
    z-index: 99999 !important;
}
```

---

## Integration Checklist

- [ ] Include `_ApplicationLayout` or load all dependencies
- [ ] Include SearchModal and CSS in your view/module
- [ ] Initialize SearchModal with `new SearchModal(window.AppCore)`
- [ ] Configure search trigger (button, keyboard, etc.)
- [ ] Implement `onSelect` callback for record handling
- [ ] Test with valid `tableID` value
- [ ] Verify pagination works (test next/previous)
- [ ] Test keyboard shortcuts (F2, Enter, Esc)
- [ ] Test on both light and dark themes
- [ ] Handle edge cases (no results, network errors)

---

## Advanced: Custom Configuration

### Reset Modal State

```javascript
searchModal.refID = '';              // Clear pagination cursor
searchModal.prevOrNext = 0;          // Reset direction
searchModal.pageSize = 20;           // Reset page size
```

### Destroy Modal (Cleanup)

```javascript
searchModal.destroy();               // Remove from DOM and reset state
```

### Access Current Results

```javascript
// After search completes
const results = searchModal.currentResults;
console.log(`Found ${results.length} records`);
```

---

## Best Practices

1. **Always reset pagination before new search:**
   ```javascript
   searchModal.refID = '';
   searchModal.prevOrNext = 0;
   await searchModal.executeSearch();
   ```

2. **Use proper error handling:**
   ```javascript
   try {
       await searchModal.open({ /* config */ });
   } catch (error) {
       showErrorMessage(error.message);
   }
   ```

3. **Provide user feedback:**
   ```javascript
   onSelect: (record) => {
       showSuccessToast(`${record.Name} selected successfully`);
   }
   ```

4. **Validate selected data:**
   ```javascript
   onSelect: (record) => {
       if (!record.ClientID) {
           showErrorMessage('Invalid record selected');
           return;
       }
       // Process record
   }
   ```

5. **Reuse modal instance:**
   ```javascript
   // Initialize once, use multiple times
   const searchModal = new SearchModal(window.AppCore);
   
   document.getElementById('btn1')?.addEventListener('click', () => {
       searchModal.open({ tableID: 'ClientID', /* ... */ });
   });
   
   document.getElementById('btn2')?.addEventListener('click', () => {
       searchModal.open({ tableID: 'AccountID', /* ... */ });
   });
   ```

---

## Examples by Module

### Client360 View

```javascript
searchModal.open({
    tableID: 'ClientID',
    onSelect: (record) => {
        document.getElementById('clientIdSearch').value = record.ClientID;
        document.getElementById('clientNameSearch').value = record.Name;
        // Auto-load if desired
        handleViewClient();
    }
});
```

### Account Management

```javascript
searchModal.open({
    tableID: 'AccountID',
    whereStmt: 'Status = "Active"',
    onSelect: (record) => {
        populateAccountForm(record);
    }
});
```

### Custom Module

```javascript
searchModal.open({
    tableID: 'CustomTableID',
    moduleID: 'CustomModuleID',
    onSelect: (record) => {
        updateUIWithRecord(record);
    }
});
```

---

## Related Documentation

- [Search Modal Component Cheatsheet](SEARCH_IMPLEMENTATION_CHEATSHEET.md)
- [UI Standardization Guide](UI_STANDARDIZATION_CHEATSHEET.md)
- [AppCore Framework Documentation](../README.md)

---

**Last Updated:** February 26, 2026  
**Version:** 1.0  
**Maintainer:** Development Team
