# Search Logic Implementation Cheat Sheet
**End-to-End Guide for Nimble 1.0 System**

---

## 📋 Overview
This guide covers complete search functionality implementation from HTML to database, following established patterns in the Loan Maintenance module.

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────┐
│  1. HTML Modal (UI Layer)              │
├─────────────────────────────────────────┤
│  2. JavaScript Event Handlers          │
├─────────────────────────────────────────┤
│  3. Service Layer (API Integration)    │
├─────────────────────────────────────────┤
│  4. Backend API (CoreApi.makeRequest)  │
├─────────────────────────────────────────┤
│  5. Database (Stored Procedures)       │
└─────────────────────────────────────────┘
```

---

## 1️⃣ HTML MODAL STRUCTURE

### **Step 1.1: Create Modal Container**
```html
<!-- Place before closing </body> tag -->
<div class="modal fade" id="yourEntityLookupModal" tabindex="-1" 
     aria-labelledby="yourEntityLookupModalLabel" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-scrollable">
    <div class="modal-content cm-lookup">
      <!-- Header, Body, Footer sections below -->
    </div>
  </div>
</div>
```

### **Step 1.2: Modal Header**
```html
<div class="modal-header cm-lookup__header">
  <div>
    <p class="cm-lookup__eyebrow">Data Search</p>
    <h5 class="modal-title" id="yourEntityLookupModalLabel">Find [Entity Name]</h5>
  </div>
  <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
</div>
```

### **Step 1.3: Modal Body - Search Filters**
```html
<div class="modal-body cm-lookup__body">
  <!-- Filter Form -->
  <form class="cm-lookup__filters row g-3 align-items-end" data-lookup-form>
    
    <!-- Filter Field Template (repeat for each search field) -->
    <div class="col-md-4">
      <label class="form-label">Field Label</label>
      <div class="input-group input-group-sm">
        <!-- Mode Selector: Contains vs Exact -->
        <select class="form-select" data-lookup-mode="FieldName" 
                aria-label="Field Filter Type" title="Field Filter Type">
          <option value="Like">Contains</option>
          <option value="Exact">Exact</option>
        </select>
        <!-- Input Field -->
        <input type="text" class="form-control" data-lookup-field="FieldName" 
               placeholder="e.g. CSK00092" title="Field Search Term" />
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="col-md-4 text-md-end cm-lookup__actions">
      <button type="button" class="btn btn-outline-secondary" data-lookup-reset>Reset</button>
      <button type="submit" class="btn btn-primary" data-lookup-submit>
        <i class="bi bi-search"></i> Search
      </button>
    </div>
  </form>

  <!-- Results Section -->
  <div class="cm-lookup__results card-surface mt-3">
    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle mb-0 cm-lookup__table">
        <thead>
          <tr>
            <th scope="col">Column 1</th>
            <th scope="col">Column 2</th>
            <th scope="col">Column 3</th>
            <th scope="col" class="text-end">Action</th>
          </tr>
        </thead>
        <tbody data-lookup-results></tbody>
      </table>
    </div>
    
    <!-- Empty State -->
    <div class="cm-lookup__empty" data-lookup-empty>
      Enter at least one filter above and click Search.
    </div>
    
    <!-- Loading State -->
    <div class="cm-lookup__loading d-none" data-lookup-loading>
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </div>
</div>
```

### **Step 1.4: Modal Footer**
```html
<div class="modal-footer cm-lookup__footer">
  <small class="text-muted me-auto">Results from Core Banking.</small>
  <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
</div>
```

### **Step 1.5: Search Button in Form**
```html
<!-- In your main form, add search button next to field -->
<div class="cbs-field">
  <label class="cbs-label required" for="EntityID">Entity ID</label>
  <div class="input-group">
    <input type="text" class="form-control" id="EntityID" name="EntityID" title="Entity ID" />
    <button class="btn btn-outline-primary" type="button" 
            aria-label="Search entity" title="Search entity"
            data-open-search="entity">
      <i class="bi bi-search"></i>
    </button>
  </div>
</div>
```

---

## 2️⃣ JAVASCRIPT EVENT HANDLERS

### **Step 2.1: Initialize Modal and Variables**
```javascript
// At top of your JavaScript file
const entityLookupModal = new bootstrap.Modal(document.getElementById('yourEntityLookupModal'));
const lookupForm = document.querySelector('[data-lookup-form]');
const lookupSubmitBtn = document.querySelector('[data-lookup-submit]');
const lookupResetBtn = document.querySelector('[data-lookup-reset]');
const lookupResults = document.querySelector('[data-lookup-results]');
const lookupEmpty = document.querySelector('[data-lookup-empty]');
const lookupLoading = document.querySelector('[data-lookup-loading]');
```

### **Step 2.2: Open Modal Event**
```javascript
// Attach to search button click
document.querySelectorAll('[data-open-search="entity"]').forEach(btn => {
  btn.addEventListener('click', function() {
    // Clear previous results
    clearSearchResults();
    // Show modal
    entityLookupModal.show();
  });
});
```

### **Step 2.3: Form Submit Handler**
```javascript
lookupForm.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  // 1. Collect filter values
  const filters = collectFilters();
  
  // 2. Validate at least one filter is provided
  if (!hasAtLeastOneFilter(filters)) {
    showToast('Please enter at least one search criteria', 'warning');
    return;
  }
  
  // 3. Execute search
  await performSearch(filters);
});

function collectFilters() {
  const filters = {};
  
  // Get all filter fields
  document.querySelectorAll('[data-lookup-field]').forEach(input => {
    const fieldName = input.getAttribute('data-lookup-field');
    const value = input.value.trim();
    const modeSelect = document.querySelector(`[data-lookup-mode="${fieldName}"]`);
    const mode = modeSelect ? modeSelect.value : 'Like';
    
    if (value) {
      filters[fieldName] = {
        value: value,
        mode: mode // 'Like' or 'Exact'
      };
    }
  });
  
  return filters;
}

function hasAtLeastOneFilter(filters) {
  return Object.keys(filters).length > 0;
}
```

### **Step 2.4: Search Execution**
```javascript
async function performSearch(filters) {
  try {
    // Show loading state
    showLoading(true);
    hideEmptyState();
    clearSearchResults();
    
    // Call service layer
    const results = await YourEntityService.search(filters);
    
    // Render results
    if (results && results.length > 0) {
      renderSearchResults(results);
    } else {
      showEmptyResults();
    }
    
  } catch (error) {
    console.error('Search error:', error);
    showToast('Search failed: ' + error.message, 'danger');
    showEmptyResults();
  } finally {
    showLoading(false);
  }
}
```

### **Step 2.5: Results Rendering**
```javascript
function renderSearchResults(results) {
  lookupResults.innerHTML = '';
  
  results.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${escapeHtml(item.Field1 || '')}</td>
      <td>${escapeHtml(item.Field2 || '')}</td>
      <td>${escapeHtml(item.Field3 || '')}</td>
      <td class="text-end">
        <button type="button" class="btn btn-sm btn-primary" 
                data-select-item='${JSON.stringify(item)}'>
          Select
        </button>
      </td>
    `;
    lookupResults.appendChild(row);
  });
  
  // Attach select handlers
  attachSelectHandlers();
}

function attachSelectHandlers() {
  document.querySelectorAll('[data-select-item]').forEach(btn => {
    btn.addEventListener('click', function() {
      const item = JSON.parse(this.getAttribute('data-select-item'));
      selectItem(item);
      entityLookupModal.hide();
    });
  });
}

function selectItem(item) {
  // Populate form fields with selected item
  document.getElementById('EntityID').value = item.EntityID || '';
  document.getElementById('EntityName').value = item.EntityName || '';
  // ... populate other fields
  
  // Trigger any validation or change events
  document.getElementById('EntityID').dispatchEvent(new Event('change'));
}
```

### **Step 2.6: Helper Functions**
```javascript
function showLoading(show) {
  if (show) {
    lookupLoading.classList.remove('d-none');
  } else {
    lookupLoading.classList.add('d-none');
  }
}

function hideEmptyState() {
  lookupEmpty.style.display = 'none';
}

function showEmptyResults() {
  lookupEmpty.innerHTML = 'No records found matching your search criteria.';
  lookupEmpty.style.display = 'block';
}

function clearSearchResults() {
  lookupResults.innerHTML = '';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Reset button handler
lookupResetBtn.addEventListener('click', function() {
  lookupForm.reset();
  clearSearchResults();
  lookupEmpty.innerHTML = 'Enter at least one filter above and click Search.';
  lookupEmpty.style.display = 'block';
});
```

---

## 3️⃣ SERVICE LAYER

### **Step 3.1: Create Service File**
**Location:** `assets/js/services/[module]/your-entity-service.js`

```javascript
class YourEntityService {
  /**
   * Search for entities based on filters
   * @param {Object} filters - Search filters with value and mode
   * @returns {Promise<Array>} - Array of matching entities
   */
  static async search(filters) {
    try {
      // Build search criteria array
      const searchCriteria = this.buildSearchCriteria(filters);
      
      // Prepare request payload
      const payload = {
        ProcedureName: 'p_SearchYourEntity',
        Parameters: searchCriteria
      };
      
      // Make API call
      const response = await CoreApi.makeRequestEnvelope(
        window.Environment.apiBaseUrl,
        payload
      );
      
      // Validate response
      if (!response) {
        throw new Error('No response from server');
      }
      
      if (response.Status === 'error') {
        throw new Error(response.Message || 'Search failed');
      }
      
      // Return results (usually in Data property)
      return response.Data || [];
      
    } catch (error) {
      console.error('YourEntityService.search error:', error);
      throw error;
    }
  }
  
  /**
   * Build search criteria for stored procedure
   * @param {Object} filters - Filter object with field names and values
   * @returns {Array} - Array of parameter objects
   */
  static buildSearchCriteria(filters) {
    const criteria = [];
    
    // Convert filters to parameter array
    Object.keys(filters).forEach(fieldName => {
      const filter = filters[fieldName];
      
      // Add search value parameter
      criteria.push({
        Name: fieldName,
        Value: filter.mode === 'Like' ? `%${filter.value}%` : filter.value
      });
      
      // Optionally add mode parameter if backend needs it
      criteria.push({
        Name: `${fieldName}Mode`,
        Value: filter.mode
      });
    });
    
    return criteria;
  }
  
  /**
   * Check if user has rights to perform search
   * @param {number} moduleId - Module ID for rights check
   * @returns {Promise<boolean>}
   */
  static async checkSearchRights(moduleId) {
    try {
      const userRights = await AuthService.checkUserRights(moduleId);
      return userRights && userRights.CanView;
    } catch (error) {
      console.error('Error checking search rights:', error);
      return false;
    }
  }
}

// Make service globally available
window.YourEntityService = YourEntityService;
```

---

## 4️⃣ BACKEND API INTEGRATION

### **Step 4.1: CoreApi Pattern**
The system uses `CoreApi.makeRequestEnvelope()` for all API calls:

```javascript
// Standard pattern used throughout the system
const response = await CoreApi.makeRequestEnvelope(
  window.Environment.apiBaseUrl,  // Base URL from environment.js
  {
    ProcedureName: 'p_StoredProcedureName',
    Parameters: [
      { Name: 'ParamName1', Value: paramValue1 },
      { Name: 'ParamName2', Value: paramValue2 }
    ]
  }
);
```

### **Step 4.2: Response Handling**
```javascript
// Response structure:
{
  Status: 'success' | 'error',
  Message: 'Operation message',
  Data: [ /* array of results */ ]
}

// Always check Status before accessing Data
if (response.Status === 'error') {
  throw new Error(response.Message);
}

const results = response.Data || [];
```

---

## 5️⃣ DATABASE STORED PROCEDURE

### **Step 5.1: Stored Procedure Pattern**
```sql
CREATE PROCEDURE [dbo].[p_SearchYourEntity]
    @Field1 NVARCHAR(100) = NULL,
    @Field1Mode NVARCHAR(10) = 'Like',
    @Field2 NVARCHAR(100) = NULL,
    @Field2Mode NVARCHAR(10) = 'Like',
    @Field3 NVARCHAR(100) = NULL,
    @Field3Mode NVARCHAR(10) = 'Like'
AS
BEGIN
    SET NOCOUNT ON;
    
    SELECT 
        Field1,
        Field2,
        Field3,
        -- ... other fields
    FROM YourTable
    WHERE 
        (@Field1 IS NULL OR 
         (@Field1Mode = 'Exact' AND Field1 = @Field1) OR
         (@Field1Mode = 'Like' AND Field1 LIKE @Field1))
    AND
        (@Field2 IS NULL OR 
         (@Field2Mode = 'Exact' AND Field2 = @Field2) OR
         (@Field2Mode = 'Like' AND Field2 LIKE @Field2))
    AND
        (@Field3 IS NULL OR 
         (@Field3Mode = 'Exact' AND Field3 = @Field3) OR
         (@Field3Mode = 'Like' AND Field3 LIKE @Field3))
    ORDER BY Field1;
END
```

---

## 6️⃣ SCRIPT DEPENDENCIES

### **Step 6.1: Required Script Order in HTML**
```html
<!-- Core Dependencies (MUST BE FIRST) -->
<script src="../../../assets/js/environment.js"></script>
<script src="../../../assets/js/config.js"></script>
<script src="../../../assets/js/services/shared/coreApi.js"></script>

<!-- Shared Services -->
<script src="../../../assets/js/services/shared/lookupService.js"></script>
<script src="../../../assets/js/services/shared/searchService.js"></script>
<script src="../../../assets/js/shared/search-modal.js"></script>

<!-- Auth (Required for rights checking) -->
<script src="../../../assets/js/auth/auth.config.js"></script>
<script src="../../../assets/js/auth/auth.service.js"></script>
<script src="../../../assets/js/app.js"></script>

<!-- Your Entity Service -->
<script src="../../../assets/js/services/[module]/your-entity-service.js"></script>

<!-- Your Page Script -->
<script src="../../../assets/js/pages/[module]/your-page.js"></script>
```

---

## 7️⃣ COMPLETE EXAMPLE: ACCOUNT SEARCH

### **HTML Modal**
```html
<div class="modal fade" id="accountLookupModal" tabindex="-1">
  <div class="modal-dialog modal-xl modal-dialog-scrollable">
    <div class="modal-content cm-lookup">
      <div class="modal-header cm-lookup__header">
        <div>
          <p class="cm-lookup__eyebrow">Account Search</p>
          <h5 class="modal-title">Find Account</h5>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
      </div>
      
      <div class="modal-body cm-lookup__body">
        <form class="cm-lookup__filters row g-3 align-items-end" data-lookup-form>
          <div class="col-md-4">
            <label class="form-label">Account ID</label>
            <div class="input-group input-group-sm">
              <select class="form-select" data-lookup-mode="AccountID">
                <option value="Like">Contains</option>
                <option value="Exact">Exact</option>
              </select>
              <input type="text" class="form-control" data-lookup-field="AccountID" />
            </div>
          </div>
          
          <div class="col-md-4">
            <label class="form-label">Account Name</label>
            <div class="input-group input-group-sm">
              <select class="form-select" data-lookup-mode="AccountName">
                <option value="Like">Contains</option>
                <option value="Exact">Exact</option>
              </select>
              <input type="text" class="form-control" data-lookup-field="AccountName" />
            </div>
          </div>
          
          <div class="col-md-4 text-md-end cm-lookup__actions">
            <button type="button" class="btn btn-outline-secondary" data-lookup-reset>Reset</button>
            <button type="submit" class="btn btn-primary" data-lookup-submit>
              <i class="bi bi-search"></i> Search
            </button>
          </div>
        </form>
        
        <div class="cm-lookup__results card-surface mt-3">
          <div class="table-responsive">
            <table class="table table-sm table-hover mb-0 cm-lookup__table">
              <thead>
                <tr>
                  <th>Account ID</th>
                  <th>Account Name</th>
                  <th>Branch</th>
                  <th class="text-end">Action</th>
                </tr>
              </thead>
              <tbody data-lookup-results></tbody>
            </table>
          </div>
          <div class="cm-lookup__empty" data-lookup-empty>
            Enter search criteria above and click Search.
          </div>
          <div class="cm-lookup__loading d-none" data-lookup-loading>
            <div class="spinner-border text-primary"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

### **JavaScript Implementation**
```javascript
class AccountSearchHandler {
  constructor() {
    this.modal = new bootstrap.Modal(document.getElementById('accountLookupModal'));
    this.init();
  }
  
  init() {
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    // Open modal
    document.querySelectorAll('[data-open-search="account"]').forEach(btn => {
      btn.addEventListener('click', () => this.openModal());
    });
    
    // Submit search
    document.querySelector('[data-lookup-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSearch();
    });
    
    // Reset
    document.querySelector('[data-lookup-reset]').addEventListener('click', () => {
      this.reset();
    });
  }
  
  openModal() {
    this.reset();
    this.modal.show();
  }
  
  async handleSearch() {
    const filters = this.collectFilters();
    
    if (Object.keys(filters).length === 0) {
      showToast('Enter at least one search criteria', 'warning');
      return;
    }
    
    try {
      this.showLoading(true);
      const results = await AccountService.search(filters);
      this.renderResults(results);
    } catch (error) {
      showToast('Search failed: ' + error.message, 'danger');
    } finally {
      this.showLoading(false);
    }
  }
  
  collectFilters() {
    const filters = {};
    document.querySelectorAll('[data-lookup-field]').forEach(input => {
      const fieldName = input.getAttribute('data-lookup-field');
      const value = input.value.trim();
      if (value) {
        const mode = document.querySelector(`[data-lookup-mode="${fieldName}"]`).value;
        filters[fieldName] = { value, mode };
      }
    });
    return filters;
  }
  
  renderResults(results) {
    const tbody = document.querySelector('[data-lookup-results]');
    tbody.innerHTML = '';
    
    if (!results || results.length === 0) {
      document.querySelector('[data-lookup-empty]').style.display = 'block';
      return;
    }
    
    document.querySelector('[data-lookup-empty]').style.display = 'none';
    
    results.forEach(account => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${account.AccountID}</td>
        <td>${account.AccountName}</td>
        <td>${account.BranchID}</td>
        <td class="text-end">
          <button class="btn btn-sm btn-primary" onclick="accountSearchHandler.selectAccount(${account.AccountID})">
            Select
          </button>
        </td>
      `;
    });
  }
  
  selectAccount(accountId) {
    // Populate form with selected account
    document.getElementById('AccountID').value = accountId;
    // Trigger change event or load full details
    this.modal.hide();
  }
  
  showLoading(show) {
    const loading = document.querySelector('[data-lookup-loading]');
    loading.classList.toggle('d-none', !show);
  }
  
  reset() {
    document.querySelector('[data-lookup-form]').reset();
    document.querySelector('[data-lookup-results]').innerHTML = '';
    document.querySelector('[data-lookup-empty]').style.display = 'block';
  }
}

// Initialize
const accountSearchHandler = new AccountSearchHandler();
```

---

## 8️⃣ QUICK REFERENCE CHECKLIST

### ✅ **Implementation Checklist**

- [ ] **HTML Modal Created**
  - [ ] Modal container with proper IDs
  - [ ] Header with title and close button
  - [ ] Filter form with data-lookup-form
  - [ ] Each filter has data-lookup-mode and data-lookup-field
  - [ ] Results table with data-lookup-results
  - [ ] Empty state with data-lookup-empty
  - [ ] Loading spinner with data-lookup-loading

- [ ] **Search Button Added**
  - [ ] Button with search icon
  - [ ] data-open-search attribute set
  - [ ] Proper aria-label and title

- [ ] **JavaScript Event Handlers**
  - [ ] Modal initialization
  - [ ] Open modal event
  - [ ] Form submit handler
  - [ ] Filter collection function
  - [ ] Search execution function
  - [ ] Results rendering function
  - [ ] Select item handler
  - [ ] Reset handler
  - [ ] Helper functions (escapeHtml, showLoading, etc.)

- [ ] **Service Layer**
  - [ ] Service class created
  - [ ] search() method implemented
  - [ ] buildSearchCriteria() helper
  - [ ] Error handling
  - [ ] Service made globally available (window.YourService)

- [ ] **Script Dependencies**
  - [ ] Scripts in correct order in HTML
  - [ ] CoreApi loaded before service
  - [ ] Auth services loaded
  - [ ] Service file included before page script

- [ ] **Backend**
  - [ ] Stored procedure created
  - [ ] Accepts filter parameters
  - [ ] Handles NULL values correctly
  - [ ] Supports Like and Exact modes
  - [ ] Returns proper result set

- [ ] **Testing**
  - [ ] Modal opens correctly
  - [ ] Filters collect values
  - [ ] Search executes without errors
  - [ ] Results render in table
  - [ ] Select populates form fields
  - [ ] Reset clears form
  - [ ] Error messages display
  - [ ] Loading states work

---

## 9️⃣ COMMON PATTERNS

### **Pattern 1: Multi-Field Input**
```html
<!-- For fields like "Legal Officer" with ID + Name -->
<div class="input-group">
  <input type="text" class="form-control" id="LegalOfficerID" placeholder="ID" />
  <input type="text" class="form-control" id="LegalOfficerName" placeholder="Name" />
  <button class="btn btn-outline-primary" type="button" data-open-search="legal-officer">
    <i class="bi bi-search"></i>
  </button>
</div>
```

### **Pattern 2: Conditional Filters**
```javascript
// Show/hide filters based on user selection
function updateFiltersVisibility(accountType) {
  const loanFilters = document.getElementById('loanFilters');
  const savingsFilters = document.getElementById('savingsFilters');
  
  if (accountType === 'LOAN') {
    loanFilters.style.display = 'block';
    savingsFilters.style.display = 'none';
  } else {
    loanFilters.style.display = 'none';
    savingsFilters.style.display = 'block';
  }
}
```

### **Pattern 3: Pagination**
```javascript
// Add pagination for large result sets
function renderResults(results, page = 1, pageSize = 50) {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const pageResults = results.slice(start, end);
  
  // Render page results
  renderResultsTable(pageResults);
  
  // Render pagination controls
  renderPagination(results.length, page, pageSize);
}
```

### **Pattern 4: Export Results**
```javascript
// Add export to Excel functionality
function exportResults() {
  const results = currentSearchResults;
  const csv = convertToCSV(results);
  downloadCSV(csv, 'search-results.csv');
}
```

---

## 🔟 TROUBLESHOOTING GUIDE

### **Issue: Modal doesn't open**
- ✅ Check Bootstrap is loaded
- ✅ Verify modal ID matches JavaScript selector
- ✅ Check console for JavaScript errors
- ✅ Ensure button has correct data-open-search attribute

### **Issue: Search returns no results**
- ✅ Check stored procedure exists
- ✅ Verify parameter names match
- ✅ Test SQL directly in database
- ✅ Check filter values are being sent correctly
- ✅ Verify Like patterns include % wildcards

### **Issue: Results don't render**
- ✅ Check response structure in console
- ✅ Verify data-lookup-results selector
- ✅ Check for JavaScript errors in renderResults()
- ✅ Ensure escapeHtml() is working

### **Issue: Select doesn't populate form**
- ✅ Verify field IDs match
- ✅ Check JSON.parse() in select handler
- ✅ Test item object structure
- ✅ Verify form fields are not disabled

---

## 📊 DATA FLOW DIAGRAM

```
User Action (Click Search Button)
           ↓
Open Modal (Bootstrap Modal.show())
           ↓
User Enters Filters (Input values)
           ↓
Click Search Button (Form submit)
           ↓
collectFilters() - JavaScript
           ↓
Validate Filters (At least one filter)
           ↓
YourEntityService.search(filters)
           ↓
buildSearchCriteria() - Convert to array
           ↓
CoreApi.makeRequestEnvelope()
           ↓
Backend API - Process request
           ↓
Execute Stored Procedure
           ↓
Database Query - Return results
           ↓
Backend API - Format response
           ↓
Service Layer - Parse response
           ↓
renderResults() - Create table rows
           ↓
Display Results in Modal
           ↓
User Clicks Select Button
           ↓
selectItem() - Populate form fields
           ↓
Close Modal
```

---

## 📝 NOTES

1. **Always use data attributes** for search functionality (data-lookup-*, data-open-search)
2. **Escape HTML** when rendering user input to prevent XSS
3. **Handle NULL values** in stored procedures with `IS NULL` checks
4. **Use !== undefined** in service layer for parameter preservation
5. **Test with various filter combinations** before deployment
6. **Add loading states** for better UX
7. **Implement error handling** at every layer
8. **Follow naming conventions** from existing modules

---

## 🚀 NEXT STEPS AFTER IMPLEMENTATION

1. Test with empty filters
2. Test with single filter
3. Test with multiple filters
4. Test with Like mode
5. Test with Exact mode
6. Test with special characters
7. Test with large result sets
8. Test select functionality
9. Test reset functionality
10. Deploy to test environment

---

**Last Updated:** January 30, 2026  
**Version:** 1.0  
**Module Reference:** Loan Maintenance - Client Lookup
