# Client Limit Search - Code Snippets Reference

## HTML Wiring Fix

### Location: client-limit.html (Line 252)

**BEFORE:**
```html
<script src="../../../assets/js/services/shared/serviceLoader.js"></script>
<script src="client-limit.js"></script>
```

**AFTER:**
```html
<script src="../../../assets/js/services/shared/serviceLoader.js"></script>
<script src="../../../assets/js/shared/search-modal.js"></script>
<script src="client-limit.js"></script>
```

**Explanation**: Added the search-modal.js script to load the SearchModal class.

---

## JavaScript Service Loading Fix

### Location: client-limit.js (Line 100)

**BEFORE:**
```javascript
try {
    await ServiceLoader.loadCore();
    await ServiceLoader.loadLimitsCollateralService();
    // ...
}
```

**AFTER:**
```javascript
try {
    await ServiceLoader.loadCore();
    await ServiceLoader.loadLimitsCollateralService();
    await ServiceLoader.loadSearchService(); // Load search service for search modals
    // ...
}
```

**Explanation**: Added SearchService loading to enable search API calls.

---

## JavaScript Search Modal Initialization

### Location: client-limit.js (After line 921, before wireDatePickerButtons())

**NEW CODE ADDED:**

```javascript
// ═══════════════════════════════════════════════════════════════
// SEARCH MODAL INITIALIZATION
// ═══════════════════════════════════════════════════════════════

let searchModal = null;

// Initialize SearchModal after services are loaded
function initializeSearchModal() {
    if (!window.SearchModal) {
        console.warn('[ClientLimit] SearchModal class not available');
        return;
    }
    
    searchModal = new window.SearchModal({
        prefix: 'client-limit',
        moduleID: '1000', // Limits & Collateral module ID
        getOperatorId: getCurrentOperatorId,
        getOurBranchId: () => els.branchId?.value || '0325',
        onError: (err) => showMessage(String(err), 'error')
    });
    
    console.log('[ClientLimit] SearchModal initialized');
}

// Search Configurations
const searchConfigs = {
    branch: {
        tableID: 'Branches',
        whereStmt: '',
        searchFields: [
            { name: 'branchId', label: 'Branch ID', column: 'BranchID' },
            { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
        ],
        onSelect: (record) => {
            const branchId = record.BranchID || record.branchid || record.OurBranchID || '';
            const branchName = record.BranchName || record.branchname || '';
            setElValue(els.branchId, branchId);
            setElValue(els.branchName, branchName);
            showMessage('Branch selected', 'success');
        }
    },
    
    limit: {
        tableID: 'ClientLimits',
        whereStmt: '',
        searchFields: [
            { name: 'limitId', label: 'Limit ID', column: 'LimitID' },
            { name: 'clientId', label: 'Client ID', column: 'ClientID' }
        ],
        onSelect: (record) => {
            const limitId = record.LimitID || record.limitid || '';
            setElValue(els.limitId, limitId);
            
            // Optionally populate other fields from the record
            if (record.ClientID || record.clientid) {
                setElValue(els.clientId, record.ClientID || record.clientid);
            }
            if (record.ClientName || record.clientname) {
                setElValue(els.clientName, record.ClientName || record.clientname);
            }
            showMessage('Limit selected', 'success');
        }
    },
    
    client: {
        tableID: 'Clients',
        whereStmt: '',
        searchFields: [
            { name: 'clientId', label: 'Client ID', column: 'ClientID' },
            { name: 'clientName', label: 'Client Name', column: 'Name' }
        ],
        onSelect: (record) => {
            const clientId = record.ClientID || record.clientid || '';
            const clientName = record.Name || record.name || record.ClientName || record.clientname || '';
            setElValue(els.clientId, clientId);
            setElValue(els.clientName, clientName);
            showMessage('Client selected', 'success');
        }
    },
    
    currency: {
        tableID: 'Currencies',
        whereStmt: '',
        searchFields: [
            { name: 'currencyId', label: 'Currency ID', column: 'CurrencyID' },
            { name: 'currencyName', label: 'Currency Name', column: 'CurrencyName' }
        ],
        onSelect: (record) => {
            const currencyId = record.CurrencyID || record.currencyid || '';
            const currencyName = record.CurrencyName || record.currencyname || '';
            setElValue(els.currencyId, currencyId);
            setElValue(els.currencyName, currencyName);
            showMessage('Currency selected', 'success');
        }
    }
};

// Wire Search Buttons
function wireSearchButtons() {
    if (!searchModal) {
        console.warn('[ClientLimit] SearchModal not initialized, cannot wire search buttons');
        return;
    }
    
    // Branch search button
    const branchSearchBtn = document.querySelector('#BranchId')?.parentElement?.querySelector('.btn-lookup');
    if (branchSearchBtn) {
        branchSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchModal.open(searchConfigs.branch);
        });
    }
    
    // Limit ID search button
    const limitSearchBtn = document.querySelector('#LimitId')?.parentElement?.querySelector('.btn-lookup');
    if (limitSearchBtn) {
        limitSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchModal.open(searchConfigs.limit);
        });
    }
    
    // Client search button
    const clientSearchBtn = document.querySelector('#ClientId')?.parentElement?.querySelector('.btn-lookup');
    if (clientSearchBtn) {
        clientSearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchModal.open(searchConfigs.client);
        });
    }
    
    // Currency search button
    const currencySearchBtn = document.querySelector('#CurrencyId')?.parentElement?.querySelector('.btn-lookup');
    if (currencySearchBtn) {
        currencySearchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            searchModal.open(searchConfigs.currency);
        });
    }
    
    console.log('[ClientLimit] Search buttons wired');
}

// Initialize search modal and wire buttons after a short delay to ensure DOM is ready
setTimeout(() => {
    initializeSearchModal();
    wireSearchButtons();
}, 100);
```

**Explanation**: This code:
1. Creates a SearchModal instance
2. Defines search configurations for 4 entity types
3. Wires all search buttons with event listeners
4. Initializes everything after DOM is ready

---

## How to Add More Search Fields

If you need to add search for additional fields (e.g., Limit Type), follow this pattern:

### Step 1: Add Search Configuration

```javascript
const searchConfigs = {
    // ... existing configs ...
    
    limitType: {
        tableID: 'LimitTypes', // Verify table name with backend
        whereStmt: '',
        searchFields: [
            { name: 'limitTypeId', label: 'Limit Type ID', column: 'LimitTypeID' },
            { name: 'limitTypeName', label: 'Limit Type Name', column: 'LimitTypeName' }
        ],
        onSelect: (record) => {
            const limitTypeId = record.LimitTypeID || record.limittypeid || '';
            setDropdownValue(els.limitType, limitTypeId);
            showMessage('Limit Type selected', 'success');
        }
    }
};
```

### Step 2: Wire the Button

Add this inside the `wireSearchButtons()` function:

```javascript
// Limit Type search button
const limitTypeSearchBtn = document.querySelector('#LimitType')?.parentElement?.querySelector('.btn-lookup');
if (limitTypeSearchBtn) {
    limitTypeSearchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        searchModal.open(searchConfigs.limitType);
    });
}
```

### Step 3: Add Search Button to HTML (if not already present)

```html
<div class="lookup-group">
    <select id="LimitType" class="input-full">
        <option value="">--Select--</option>
        <option value="Revolving">Revolving</option>
        <option value="Non Revolving">Non Revolving</option>
    </select>
    <button class="btn-lookup">🔍</button>
</div>
```

---

## Request/Response Mapping

### Search Request Format

The SearchService sends requests in this format:

```javascript
{
    TableID: "Clients",
    WhereStmt: "ClientID LIKE '%123%' AND Name LIKE '%John%'",
    PrevOrNext: "1",
    RefID: "",
    OperatorID: "web_portal",
    ModuleID: "1000",
    OurBranchID: "0325"
}
```

### Search Response Format

The backend returns data in one of these formats:

```javascript
// Format 1
{
    Details: {
        SearchResults: [
            { ClientID: "001", Name: "John Doe", ... },
            { ClientID: "002", Name: "Jane Smith", ... }
        ]
    }
}

// Format 2
{
    Details: [
        { ClientID: "001", Name: "John Doe", ... },
        { ClientID: "002", Name: "Jane Smith", ... }
    ]
}

// Format 3
{
    data: {
        SearchResults: [...]
    }
}
```

The `SearchModal.normalizeResults()` function handles all these formats automatically.

---

## Event Binding Pattern

### Pattern Used

```javascript
const button = document.querySelector('#FieldId')?.parentElement?.querySelector('.btn-lookup');
if (button) {
    button.addEventListener('click', (e) => {
        e.preventDefault();
        searchModal.open(searchConfig);
    });
}
```

### Why This Pattern?

1. **Selector Chain**: `#FieldId` → `.parentElement` → `.btn-lookup`
   - Finds the input field by ID
   - Gets its parent container
   - Finds the search button within that container

2. **Optional Chaining** (`?.`):
   - Prevents errors if element doesn't exist
   - Safe navigation through DOM

3. **Null Check** (`if (button)`):
   - Only adds listener if button exists
   - Prevents runtime errors

4. **preventDefault()**:
   - Stops default button behavior
   - Prevents form submission

5. **searchModal.open(config)**:
   - Opens modal with specific configuration
   - Passes table name, search fields, and callback

---

## Validation Pattern

### Existing Validation (Already in Code)

```javascript
function validateForm() {
    const requiredFields = [
        { field: els.branchId, name: 'Branch ID' },
        { field: els.clientId, name: 'Client ID' },
        { field: els.currencyId, name: 'Currency ID' },
        { field: els.limitLevel, name: 'Limit Level' },
        { field: els.limitType, name: 'Limit Type' },
        { field: els.sanctionedLimit, name: 'Sanctioned Limit' }
    ];

    let isValid = true;
    let firstInvalidField = null;

    for (const { field, name } of requiredFields) {
        if (!field) continue;

        const value = field.value ? field.value.trim() : '';

        if (!value || value === '' || value === '--Select--') {
            field.classList.add('is-invalid');
            if (!firstInvalidField) {
                firstInvalidField = field;
                showMessage(`${name} is required`, 'error');
            }
            isValid = false;
        } else {
            field.classList.add('is-valid');
        }
    }

    if (firstInvalidField) {
        firstInvalidField.focus();
    }

    return isValid;
}
```

This validation is called before Save operations and ensures all required fields are populated.

---

## Console Debugging Commands

### Check if SearchModal is loaded
```javascript
console.log(window.SearchModal);
// Should output: class SearchModal { ... }
```

### Check if SearchService is loaded
```javascript
console.log(window.SearchService);
// Should output: { search: function, ... }
```

### Check if search modal instance exists
```javascript
console.log(searchModal);
// Should output: SearchModal { prefix: "client-limit", ... }
```

### Manually open a search modal
```javascript
searchModal.open(searchConfigs.client);
```

### Check search configurations
```javascript
console.log(searchConfigs);
// Should output: { branch: {...}, limit: {...}, client: {...}, currency: {...} }
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Hardcode values
```javascript
// BAD
onSelect: (record) => {
    els.clientId.value = "12345"; // Hardcoded!
}
```

### ✅ DO: Use record data
```javascript
// GOOD
onSelect: (record) => {
    els.clientId.value = record.ClientID || '';
}
```

---

### ❌ DON'T: Assume column names
```javascript
// BAD - Will fail if backend uses different case
onSelect: (record) => {
    els.clientId.value = record.ClientID; // What if it's "clientid"?
}
```

### ✅ DO: Use fallback patterns
```javascript
// GOOD - Handles case variations
onSelect: (record) => {
    els.clientId.value = record.ClientID || record.clientid || '';
}
```

---

### ❌ DON'T: Skip null checks
```javascript
// BAD - Will throw error if button doesn't exist
const button = document.querySelector('.btn-lookup');
button.addEventListener('click', ...); // Error if button is null!
```

### ✅ DO: Check for null
```javascript
// GOOD - Safe navigation
const button = document.querySelector('.btn-lookup');
if (button) {
    button.addEventListener('click', ...);
}
```

---

### ❌ DON'T: Create new modals
```javascript
// BAD - Don't create new modal HTML
const modalHTML = '<div class="modal">...</div>';
document.body.innerHTML += modalHTML;
```

### ✅ DO: Reuse SearchModal
```javascript
// GOOD - Reuse existing SearchModal class
searchModal = new window.SearchModal({ ... });
```

---

## Quick Reference: Search Config Structure

```javascript
{
    tableID: 'TableName',           // Backend table to search
    whereStmt: '',                  // Base WHERE clause (usually empty)
    searchFields: [                 // Array of search criteria fields
        {
            name: 'fieldName',      // Unique name for this field
            label: 'Field Label',   // Display label in modal
            column: 'ColumnName'    // Database column name
        }
    ],
    onSelect: (record) => {         // Callback when row is selected
        // Populate form fields from record
        setElValue(els.field, record.Column || '');
        showMessage('Selected', 'success');
    }
}
```

---

**Quick Start**: Copy the code snippets above into your files and test immediately!
