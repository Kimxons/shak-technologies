# Module Creation Guide

This guide shows how to create a new module following the established patterns for maximum reusability.

## Architecture Overview

```
public/assets/js/
├── services/
│   ├── shared/              # Global utilities (used by ALL modules)
│   │   ├── coreApi.js       # Request/response handling
│   │   ├── serviceLoader.js # Dynamic script loading
│   │   ├── lookupService.js # System codes/dropdowns
│   │   └── searchService.js # Generic search functionality
│   ├── client/              # Client module services
│   │   └── clientService.js
│   ├── loans/               # Loans module services
│   │   └── loanService.js
│   └── transaction/         # Transaction module services
│       └── transactionService.js
└── pages/
    ├── customer-management/
    ├── loans/
    └── transaction/
```

## Creating a New Module Service

### Step 1: Create Your Module Service File

Create `public/assets/js/services/{module-name}/{module-name}Service.js`

```javascript
// Example: public/assets/js/services/loans/loanService.js
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure coreApi.js is loaded first.");
    return;
  }

  // Get base URL from environment
  const LOANS_BASE_URL = (Environment.baseUrlLoans || "http://localhost:6903").replace(/\/+$/, "");

  // Define your endpoints
  const endpoints = {
    getLoan: `${LOANS_BASE_URL}/api/v1/Loans/GetLoan`,
    createLoan: `${LOANS_BASE_URL}/api/v1/Loans/CreateLoan`,
    updateLoan: `${LOANS_BASE_URL}/api/v1/Loans/UpdateLoan`,
    approveLoan: `${LOANS_BASE_URL}/api/v1/Loans/ApproveLoan`,
  };

  const LoanService = {
    /**
     * Get loan details
     * @param {object} requestData - { LoanID, AccountID, etc. }
     * @returns {Promise} Normalized response { success, code, message, data }
     */
    getLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("GetLoan", requestData);
      return CoreApi.post(endpoints.getLoan, envelope);
    },

    /**
     * Create new loan
     * @param {object} requestData - Loan data
     * @returns {Promise} Normalized response
     */
    createLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("CreateLoan", requestData);
      return CoreApi.post(endpoints.createLoan, envelope);
    },

    /**
     * Update existing loan
     * @param {object} requestData - Loan data
     * @returns {Promise} Normalized response
     */
    updateLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("UpdateLoan", requestData);
      return CoreApi.post(endpoints.updateLoan, envelope);
    },

    /**
     * Approve loan
     * @param {object} requestData - { LoanID, ApproverComments, etc. }
     * @returns {Promise} Normalized response
     */
    approveLoan(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("ApproveLoan", requestData);
      return CoreApi.post(endpoints.approveLoan, envelope);
    }
  };

  global.LoanService = LoanService;
})(window);
```

### Step 2: Register Service in ServiceLoader

Update `public/assets/js/services/shared/serviceLoader.js`:

```javascript
/**
 * Load loan service
 * @returns {Promise} Resolves when loan service is loaded
 */
async function loadLoanService() {
  await loadCore(); // Ensure core is loaded first
  return loadScript(`${getBasePath()}/services/loans/loanService.js`);
}

// Add to exports
global.ServiceLoader = {
  // ...existing methods...
  loadLoanService,
};
```

### Step 3: Create Your Page JavaScript

Create `public/assets/js/pages/{module}/{page-name}.js`

```javascript
// Example: public/assets/js/pages/loans/loan-maintenance.js
(async function() {
  const { ServiceLoader } = window;
  
  // ============================================================
  // 1. LOAD DEPENDENCIES
  // ============================================================
  let dependenciesReady = false;
  
  try {
    await ServiceLoader.loadCore();           // CoreApi, Environment, Config
    await ServiceLoader.loadLoanService();    // Your module service
    await ServiceLoader.loadLookupService();  // Shared lookups
    await ServiceLoader.loadSearchService();  // Shared search
    dependenciesReady = true;
    console.log("[LoanMaintenance] All dependencies loaded");
  } catch (error) {
    console.error("[LoanMaintenance] Failed to load dependencies:", error);
    alert("Failed to load required services. Please refresh the page.");
    return;
  }

  // ============================================================
  // 2. USE SHARED LOOKUPS (System Codes)
  // ============================================================
  const LookupService = window.LookupService;
  
  async function initializeLookups() {
    try {
      // Populate loan type dropdown
      const loanTypes = await LookupService.getSystemCodeOptions("LoanTypeID");
      const loanTypeSelect = document.getElementById("loanType");
      loanTypeSelect.innerHTML = '<option value="">Select Loan Type</option>';
      loanTypes.forEach(option => {
        loanTypeSelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
      });

      // Populate loan status dropdown
      const statuses = await LookupService.getSystemCodeOptions("LoanStatusID");
      const statusSelect = document.getElementById("loanStatus");
      statusSelect.innerHTML = '<option value="">Select Status</option>';
      statuses.forEach(option => {
        statusSelect.innerHTML += `<option value="${option.value}">${option.label}</option>`;
      });

    } catch (error) {
      console.error("Failed to load lookups:", error);
    }
  }

  // ============================================================
  // 3. USE SHARED SEARCH
  // ============================================================
  const SearchService = window.SearchService;
  
  async function searchLoans(searchTerm) {
    try {
      const result = await SearchService.search({
        TableID: "loanId",           // Your search table
        WhereStmt: searchTerm ? `loanId like '%${searchTerm}%'` : "",
        OrderBy: "order by loanId desc",
        PrevOrNext: "1",
        RefID: "",
        OperatorID: "web_portal",
        ModuleID: 2000,              // Your module ID
        OurBranchID: "002"
      });

      if (result.success && result.data) {
        displaySearchResults(result.data);
      } else {
        console.warn("No results found");
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  }

  function displaySearchResults(results) {
    const resultsContainer = document.getElementById("searchResults");
    resultsContainer.innerHTML = results.map(loan => `
      <div class="search-result-item" onclick="loadLoan('${loan.LoanID}')">
        <strong>${loan.LoanID}</strong> - ${loan.ClientName}
      </div>
    `).join('');
  }

  // ============================================================
  // 4. USE YOUR MODULE SERVICE
  // ============================================================
  const LoanService = window.LoanService;

  async function loadLoan(loanId) {
    try {
      const result = await LoanService.getLoan({ LoanID: loanId });
      
      if (result.success && result.data) {
        populateForm(result.data);
      } else {
        alert(result.message || "Failed to load loan");
      }
    } catch (error) {
      console.error("Failed to load loan:", error);
      alert("Error loading loan details");
    }
  }

  async function saveLoan(isUpdate = false) {
    const formData = collectFormData();
    
    try {
      const result = isUpdate 
        ? await LoanService.updateLoan(formData)
        : await LoanService.createLoan(formData);
      
      if (result.success) {
        alert("Loan saved successfully!");
        clearForm();
      } else {
        alert(result.message || "Failed to save loan");
      }
    } catch (error) {
      console.error("Failed to save loan:", error);
      alert("Error saving loan");
    }
  }

  // ============================================================
  // 5. INITIALIZE PAGE
  // ============================================================
  function initializePage() {
    if (!dependenciesReady) {
      setTimeout(initializePage, 100);
      return;
    }

    console.log("[LoanMaintenance] Initializing page...");
    
    // Initialize lookups
    initializeLookups();
    
    // Attach event listeners
    document.getElementById("searchBtn").addEventListener("click", () => {
      const searchTerm = document.getElementById("searchInput").value;
      searchLoans(searchTerm);
    });
    
    document.getElementById("saveBtn").addEventListener("click", () => {
      const isUpdate = !!document.getElementById("loanId").value;
      saveLoan(isUpdate);
    });
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializePage);
  } else {
    initializePage();
  }

})();
```

### Step 4: Create Your HTML Page

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Loan Maintenance</title>
    <link rel="stylesheet" href="../../assets/css/styles.css">
</head>
<body>
    <div class="container">
        <h1>Loan Maintenance</h1>
        
        <!-- Search Section -->
        <div class="search-section">
            <input type="text" id="searchInput" placeholder="Search loans...">
            <button id="searchBtn">Search</button>
            <div id="searchResults"></div>
        </div>
        
        <!-- Form Section -->
        <form id="loanForm">
            <input type="hidden" id="loanId">
            
            <label>Loan Type</label>
            <select id="loanType"></select>
            
            <label>Status</label>
            <select id="loanStatus"></select>
            
            <button type="button" id="saveBtn">Save</button>
        </form>
    </div>
    
    <!-- ONLY THESE TWO SCRIPTS NEEDED! -->
    <script src="../../assets/js/services/shared/serviceLoader.js"></script>
    <script src="../../assets/js/pages/loans/loan-maintenance.js"></script>
</body>
</html>
```

### Step 5: Add to Environment Config

Update `environment.js` with your module's base URL:

```javascript
const Environment = {
  baseUrlClient: "http://localhost:6902",
  baseUrlLoans: "http://localhost:6903",        // Add your module
  baseUrlTransaction: "http://localhost:6904",  // Add your module
  baseUrlSystemCodes: "http://localhost:5059",
  appName: "CORE_BANKING"
};
```

## Key Benefits of This Pattern

### ✅ Reusability
- **LookupService**: Used by ALL modules for dropdowns
- **SearchService**: Used by ALL modules for searches
- **CoreApi**: Handles ALL API requests uniformly

### ✅ Uniformity
All requests follow the same structure:
```javascript
{
  RequestID: "FormID_timestamp",
  FormID: "YourFormID",
  RequestData: { ...your data },
  RequestTime: "2026-01-17T10:00:00",
  AppName: "YOUR_APP",
  Checksum: ""
}
```

All responses are normalized:
```javascript
{
  success: true/false,
  code: "00" or error code,
  message: "Success message",
  data: { ...response data }
}
```

### ✅ Maintainability
- Change CoreApi → affects all modules (global)
- Change LookupService → affects all dropdowns (global)
- Change SearchService → affects all searches (global)
- Change individual service → only affects that module

### ✅ Simplicity
- HTML: Only 2 script tags
- JS: Clear dependency loading
- Services: Simple, focused methods

## Quick Reference

### Use LookupService for Dropdowns
```javascript
const options = await LookupService.getSystemCodeOptions("CodeID");
```

### Use SearchService for Searches
```javascript
const result = await SearchService.search({
  TableID: "yourTable",
  WhereStmt: "id like '%search%'",
  OrderBy: "order by id asc",
  ModuleID: 1000
});
```

### Use Your Module Service for CRUD
```javascript
const result = await YourService.get({ ID: "123" });
const result = await YourService.create(data);
const result = await YourService.update(data);
const result = await YourService.delete({ ID: "123" });
```

### All Results Have Same Structure
```javascript
if (result.success) {
  // Use result.data
} else {
  // Show result.message
}
```
