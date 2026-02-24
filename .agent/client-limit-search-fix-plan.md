# Client Limit Search Functionality Fix Plan

## Problem Analysis

### Current Issues
1. **Search buttons are not wired** - No event listeners attached to search buttons (🔍 icons)
2. **SearchService not loaded** - The SearchService is not being loaded in the page initialization
3. **SearchModal not initialized** - The SearchModal class is not being instantiated
4. **No search configuration** - No search field configurations defined for each search type

### Root Causes
- The client-limit.js file does not load SearchService via ServiceLoader
- No SearchModal instance is created
- Search buttons in HTML have no onclick handlers or event listeners
- No search configuration objects defined for different entity types (Client, Currency, Branch, etc.)

## Solution Architecture

### 1. Load Required Services
Add SearchService loading in the initialization:
```javascript
await ServiceLoader.loadSearchService();
```

### 2. Load SearchModal Script
Add the search-modal.js script to the HTML:
```html
<script src="../../../assets/js/shared/search-modal.js"></script>
```

### 3. Initialize SearchModal Instance
Create a SearchModal instance with proper configuration:
```javascript
const searchModal = new SearchModal({
  prefix: 'client-limit',
  moduleID: '1000', // Limits & Collateral module ID
  getOperatorId: () => getCurrentOperatorId(),
  getOurBranchId: () => els.branchId?.value || '0325',
  onError: (err) => showMessage(String(err), 'error')
});
```

### 4. Define Search Configurations
Create search configurations for each entity type:

#### Client Search
```javascript
const clientSearchConfig = {
  tableID: 'Clients',
  whereStmt: '',
  searchFields: [
    { name: 'clientId', label: 'Client ID', column: 'ClientID' },
    { name: 'clientName', label: 'Client Name', column: 'Name' }
  ],
  onSelect: (record) => {
    els.clientId.value = record.ClientID || record.clientid || '';
    els.clientName.value = record.Name || record.name || record.ClientName || '';
  }
};
```

#### Currency Search
```javascript
const currencySearchConfig = {
  tableID: 'Currencies',
  whereStmt: '',
  searchFields: [
    { name: 'currencyId', label: 'Currency ID', column: 'CurrencyID' },
    { name: 'currencyName', label: 'Currency Name', column: 'CurrencyName' }
  ],
  onSelect: (record) => {
    els.currencyId.value = record.CurrencyID || record.currencyid || '';
    els.currencyName.value = record.CurrencyName || record.currencyname || '';
  }
};
```

#### Branch Search
```javascript
const branchSearchConfig = {
  tableID: 'Branches',
  whereStmt: '',
  searchFields: [
    { name: 'branchId', label: 'Branch ID', column: 'BranchID' },
    { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
  ],
  onSelect: (record) => {
    els.branchId.value = record.BranchID || record.branchid || record.OurBranchID || '';
    els.branchName.value = record.BranchName || record.branchname || '';
  }
};
```

#### Limit ID Search
```javascript
const limitSearchConfig = {
  tableID: 'ClientLimits',
  whereStmt: '',
  searchFields: [
    { name: 'limitId', label: 'Limit ID', column: 'LimitID' },
    { name: 'clientId', label: 'Client ID', column: 'ClientID' }
  ],
  onSelect: (record) => {
    els.limitId.value = record.LimitID || record.limitid || '';
    // Optionally populate other fields from the record
    if (record.ClientID) els.clientId.value = record.ClientID;
    if (record.ClientName) els.clientName.value = record.ClientName;
  }
};
```

### 5. Wire Search Buttons
Add event listeners to all search buttons:

```javascript
function wireSearchButtons() {
  // Branch search
  const branchSearchBtn = document.querySelector('#BranchId').parentElement.querySelector('.btn-lookup');
  if (branchSearchBtn) {
    branchSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchModal.open(branchSearchConfig);
    });
  }

  // Limit ID search
  const limitSearchBtn = document.querySelector('#LimitId').parentElement.querySelector('.btn-lookup');
  if (limitSearchBtn) {
    limitSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchModal.open(limitSearchConfig);
    });
  }

  // Client search
  const clientSearchBtn = document.querySelector('#ClientId').parentElement.querySelector('.btn-lookup');
  if (clientSearchBtn) {
    clientSearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchModal.open(clientSearchConfig);
    });
  }

  // Currency search
  const currencySearchBtn = document.querySelector('#CurrencyId').parentElement.querySelector('.btn-lookup');
  if (currencySearchBtn) {
    currencySearchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchModal.open(currencySearchConfig);
    });
  }
}
```

### 6. Call Wiring Function
Add the wiring function call in initialization:
```javascript
wireSearchButtons();
```

## Implementation Checklist

- [ ] Add search-modal.js script to HTML
- [ ] Load SearchService in JavaScript initialization
- [ ] Create SearchModal instance
- [ ] Define search configurations for all entity types
- [ ] Create wireSearchButtons() function
- [ ] Call wireSearchButtons() in initialization
- [ ] Test each search button
- [ ] Verify data population after selection
- [ ] Add validation to ensure selection before Save/View

## Testing Checklist

### Branch Search
- [ ] Click Branch search button
- [ ] Modal opens with search fields
- [ ] Enter search criteria
- [ ] Click Search
- [ ] Results display in table
- [ ] Click a row
- [ ] Branch ID and Name populate correctly
- [ ] Modal closes

### Limit ID Search
- [ ] Click Limit ID search button
- [ ] Modal opens
- [ ] Search works
- [ ] Selection populates Limit ID field
- [ ] Modal closes

### Client Search
- [ ] Click Client search button
- [ ] Modal opens
- [ ] Search works
- [ ] Selection populates Client ID and Name
- [ ] Modal closes

### Currency Search
- [ ] Click Currency search button
- [ ] Modal opens
- [ ] Search works
- [ ] Selection populates Currency ID and Name
- [ ] Modal closes

### Validation
- [ ] Attempt to Save without selecting Client
- [ ] Validation message appears
- [ ] Attempt to View without selecting required fields
- [ ] Validation message appears

## Expected Behavior After Fix

1. **Click Search Button** → Modal opens immediately
2. **Modal Display** → Shows search criteria fields and Search button
3. **Enter Criteria** → User can filter by ID, Name, etc.
4. **Click Search** → API call executes, results display in table
5. **Click Row** → Selected data populates form fields
6. **Modal Closes** → User can continue with form
7. **Validation** → Save/View actions verify required selections

## Technical Notes

- **SearchModal** is a reusable class that handles all search logic
- **SearchService** makes the actual API calls to the backend
- **Search configurations** define table names, columns, and callbacks
- **Event listeners** wire the UI buttons to the search functionality
- **Validation** ensures data integrity before API operations
