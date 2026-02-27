# SearchModal Quick Reference & Examples

## Quick Start (30 seconds)

```javascript
// 1. Get reference to SearchModal
const searchModal = new SearchModal(window.AppCore);

// 2. Open it when needed
await searchModal.open({
    tableID: 'ClientID',
    onSelect: (record) => {
        console.log('Selected:', record);
    }
});
```

---

## Copy-Paste Examples

### Example 1: Search Button

```html
<button id="searchBtn" class="btn btn-primary">
    <i class="bi bi-search"></i> Search
</button>

<script>
const searchModal = new SearchModal(window.AppCore);

document.getElementById('searchBtn')?.addEventListener('click', async () => {
    await searchModal.open({
        tableID: 'ClientID',
        onSelect: (record) => {
            console.log('You selected:', record);
        }
    });
});
</script>
```

---

### Example 2: Populate Form Fields

```javascript
const searchModal = new SearchModal(window.AppCore);

await searchModal.open({
    tableID: 'ClientID',
    onSelect: (record) => {
        // Fill form with selected data
        document.getElementById('clientId').value = record.ClientID || '';
        document.getElementById('clientName').value = record.Name || '';
        document.getElementById('phone').value = record.Phone || '';
        document.getElementById('email').value = record.Email || '';
    }
});
```

---

### Example 3: F2 Keyboard Shortcut

```javascript
const searchModal = new SearchModal(window.AppCore);
const clientIdInput = document.getElementById('clientIdSearch');

clientIdInput?.addEventListener('keydown', (e) => {
    if (e.key === 'F2') {
        e.preventDefault();
        searchModal.open({
            tableID: 'ClientID',
            onSelect: (record) => {
                clientIdInput.value = record.ClientID;
                clientIdInput.focus();
            }
        });
    }
});
```

---

### Example 4: Search with Filter

```javascript
const searchModal = new SearchModal(window.AppCore);

await searchModal.open({
    tableID: 'ClientID',
    whereStmt: 'Status = "Active" AND Type = "Individual"',
    onSelect: (record) => {
        console.log('Active Individual selected:', record);
    }
});
```

---

### Example 5: Pre-populate Search Term

```javascript
const searchModal = new SearchModal(window.AppCore);

await searchModal.open({
    tableID: 'ClientID',
    searchKey: 'John%',  // Search for names starting with "John"
    onSelect: (record) => {
        console.log('Found:', record.Name);
    }
});
```

---

### Example 6: Custom Page Size

```javascript
const searchModal = new SearchModal(window.AppCore);

await searchModal.open({
    tableID: 'ClientID',
    pageSize: 50,  // Show 50 records per page (options: 10, 20, 50, 100)
    onSelect: (record) => {
        console.log('Selected from 50-record page:', record);
    }
});
```

---

### Example 7: Multiple Search Buttons (Different Tables)

```javascript
const searchModal = new SearchModal(window.AppCore);

// Search for Client
document.getElementById('searchClient')?.addEventListener('click', () => {
    searchModal.open({
        tableID: 'ClientID',
        onSelect: (record) => {
            document.getElementById('clientId').value = record.ClientID;
        }
    });
});

// Search for Account
document.getElementById('searchAccount')?.addEventListener('click', () => {
    searchModal.open({
        tableID: 'AccountID',
        onSelect: (record) => {
            document.getElementById('accountId').value = record.AccountID;
        }
    });
});
```

---

### Example 8: With Error Handling

```javascript
const searchModal = new SearchModal(window.AppCore);

try {
    await searchModal.open({
        tableID: 'ClientID',
        onSelect: (record) => {
            if (!record.ClientID) {
                alert('Invalid record selected');
                return;
            }
            document.getElementById('clientId').value = record.ClientID;
        }
    });
} catch (error) {
    console.error('Search failed:', error);
    alert('Error opening search: ' + error.message);
}
```

---

### Example 9: Reuse Modal for Multiple Searches

```javascript
// Initialize once, use many times
const searchModal = new SearchModal(window.AppCore);
let lastTableId = '';

async function openSearch(tableID) {
    lastTableId = tableID;
    await searchModal.open({
        tableID: tableID,
        onSelect: (record) => {
            handleSelection(lastTableId, record);
        }
    });
}

function handleSelection(table, record) {
    switch(table) {
        case 'ClientID':
            document.getElementById('clientId').value = record.ClientID;
            break;
        case 'AccountID':
            document.getElementById('accountId').value = record.AccountID;
            break;
        case 'ProductID':
            document.getElementById('productId').value = record.ProductID;
            break;
    }
}

// Usage
document.getElementById('searchBtn1')?.addEventListener('click', () => openSearch('ClientID'));
document.getElementById('searchBtn2')?.addEventListener('click', () => openSearch('AccountID'));
document.getElementById('searchBtn3')?.addEventListener('click', () => openSearch('ProductID'));
```

---

### Example 10: Auto-populate Dependent Fields

```javascript
const searchModal = new SearchModal(window.AppCore);

await searchModal.open({
    tableID: 'ClientID',
    onSelect: (record) => {
        // Populate main field
        document.getElementById('clientId').value = record.ClientID;
        
        // Auto-populate related fields
        document.getElementById('clientName').value = record.Name;
        document.getElementById('classification').value = record.Classification;
        document.getElementById('branchId').value = record.BranchID;
        
        // Trigger validation if needed
        validateClient(record.ClientID);
    }
});
```

---

### Example 11: Search Icon Button (Bootstrap)

```html
<div class="input-group mb-3">
    <input type="text" id="clientId" class="form-control" placeholder="Client ID">
    <button class="btn btn-outline-secondary" id="searchBtn" type="button">
        <i class="bi bi-search"></i>
    </button>
</div>

<script>
const searchModal = new SearchModal(window.AppCore);

document.getElementById('searchBtn')?.addEventListener('click', async () => {
    await searchModal.open({
        tableID: 'ClientID',
        onSelect: (record) => {
            document.getElementById('clientId').value = record.ClientID;
            document.getElementById('clientId').focus();
        }
    });
});
</script>
```

---

### Example 12: Search with Advanced Filter

```javascript
const searchModal = new SearchModal(window.AppCore);

await searchModal.open({
    tableID: 'ClientID',
    advFilterString: 'Classification=1 AND Status=Active',
    onSelect: (record) => {
        console.log('Filtered selection:', record);
    }
});
```

---

### Example 13: Clear and Re-search

```javascript
const searchModal = new SearchModal(window.AppCore);
let selectedRecord = null;

async function searchAndSelect() {
    const record = await searchModal.open({
        tableID: 'ClientID',
        onSelect: (record) => {
            selectedRecord = record;
        }
    });
}

// Get the selected record
function getSelected() {
    return selectedRecord;
}

// Clear selection
function clearSelection() {
    selectedRecord = null;
    searchModal.refID = '';
    searchModal.prevOrNext = 0;
}
```

---

### Example 14: Dynamic Table Based on Context

```javascript
const searchModal = new SearchModal(window.AppCore);

// Determine which table to search based on user role or context
function getTableID() {
    const userRole = document.body.getAttribute('data-role');
    
    if (userRole === 'admin') return 'ClientID';
    if (userRole === 'accountant') return 'AccountID';
    return 'ProductID';
}

await searchModal.open({
    tableID: getTableID(),
    onSelect: (record) => {
        console.log('Context-based search result:', record);
    }
});
```

---

### Example 15: Async Validation After Selection

```javascript
const searchModal = new SearchModal(window.AppCore);

await searchModal.open({
    tableID: 'ClientID',
    onSelect: async (record) => {
        // Validate selection asynchronously
        const isValid = await validateClientAsync(record.ClientID);
        
        if (isValid) {
            document.getElementById('clientId').value = record.ClientID;
            showSuccess('Client validated successfully');
        } else {
            showError('Client validation failed');
        }
    }
});

async function validateClientAsync(clientId) {
    // Call your validation endpoint
    const response = await fetch(`/api/clients/${clientId}/validate`);
    const result = await response.json();
    return result.isValid;
}
```

---

## Configuration Cheat Sheet

```javascript
searchModal.open({
    // Required
    tableID: 'ClientID',                    // What table to search
    
    // Optional
    moduleID: '1000',                       // Module context (default: 1000)
    whereStmt: 'Status="Active"',          // WHERE clause filter
    advFilterString: '',                    // Advanced filter
    searchKey: '',                          // Pre-fill search term
    pageSize: 20,                           // Page size: 10, 20, 50, 100
    
    // Essential
    onSelect: (record) => { }               // Handle selected row
});
```

---

## Common tableID Values

| Value | Description |
|-------|-------------|
| `ClientID` | Client lookup |
| `AccountID` | Account/Product lookup |
| `ProductID` | Product details |
| `BranchID` | Branch/Location lookup |
| `EmployeeID` | Staff/Employee lookup |

---

## Pagination Control

```javascript
// Next page
searchModal.nextPage();

// Previous page  
searchModal.prevPage();

// Reset pagination
searchModal.refID = '';
searchModal.prevOrNext = 0;
```

---

## Event: When Modal Opens

```javascript
const searchModal = new SearchModal(window.AppCore);

// Override loadModel to customize on open
const originalLoadModal = searchModal.loadModel;
searchModal.loadModel = function(config) {
    console.log('Modal loading with config:', config);
    return originalLoadModal.call(this, config);
};
```

---

## Debug/Log Current State

```javascript
// Check current search state
console.log('Ref ID:', searchModal.refID);
console.log('Page Size:', searchModal.pageSize);
console.log('Direction:', searchModal.prevOrNext);
console.log('Key Field:', searchModal.keyForNavigation);
```

---

## Quick Tips

✅ **Reuse the instance** - Initialize once, call open() multiple times
```javascript
const searchModal = new SearchModal(window.AppCore);
// Can call searchModal.open() as many times as needed
```

✅ **Chain with other actions** - Use async/await
```javascript
await searchModal.open({...});
// Code continues after modal closes
```

✅ **Handle cancellation** - onSelect won't fire if user closes
```javascript
onSelect: (record) => {
    // Only runs if user selects a row
}
```

✅ **Validate before using** - Check record properties
```javascript
onSelect: (record) => {
    if (record && record.ClientID) {
        // Safe to use
    }
}
```

---

## Mini Reference Card

```
INITIALIZATION:
    const sm = new SearchModal(window.AppCore);

OPEN MODAL:
    await sm.open({ tableID: 'ClientID', onSelect: handler });

SELECT HANDLER:
    onSelect: (record) => { /* use record data */ }

PAGINATION:
    sm.nextPage()  /  sm.prevPage()  /  reset refID & prevOrNext

CLEANUP:
    sm.refID = ''
    sm.prevOrNext = 0
    sm.pageSize = 20
```

---

**Need the full integration guide?** See [SEARCHMODAL_INTEGRATION_GUIDE.md](SEARCHMODAL_INTEGRATION_GUIDE.md)
