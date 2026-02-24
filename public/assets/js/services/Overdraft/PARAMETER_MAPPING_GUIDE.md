# Overdraft Parameter Mapping Guide

## 🎯 Overview

The Overdraft module now includes a **State Manager** that allows you to set common parameters (AccountID, ApplicationID, etc.) once and automatically share them across all sub-modules.

## 🚀 Benefits

✅ **Set once, use everywhere** - No need to pass AccountID/ApplicationID to every sub-module  
✅ **Cleaner code** - Less repetitive parameter passing  
✅ **Centralized context** - Easy to track current application being worked on  
✅ **Flexible** - Can still override parameters per call if needed

---

## 📖 How It Works

### Step 1: Set the Context

When a user selects or loads an overdraft application, set the context once:

```javascript
const OverdraftService = window.OverdraftService;

// Set the context for the entire overdraft module
OverdraftService.State.setContext({
  OurBranchID: "0325",
  AccountID: "0101391000001",
  ApplicationID: "0101000001",
  OperatorID: "web_portal",
  Direction: 1
});
```

### Step 2: Use Any Sub-Module

Now all sub-modules automatically use these parameters:

```javascript
// Get application details - uses context automatically
const appResult = await OverdraftService.getOverdraftApplication();

// Get documents - uses context automatically
const docsResult = await OverdraftService.getApplicationDocuments();

// Get guarantors - uses context automatically
const guarantorsResult = await OverdraftService.getODApplicationGuarantors();

// Get interest rates - uses context automatically
const ratesResult = await OverdraftService.getODApplicationInterestRate();
```

---

## 💡 Complete Example

### Main Application Page

```javascript
// pages/overdraft/overdraft-application.js
(async function() {
  const { ServiceLoader } = window;
  
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  
  const OverdraftService = window.OverdraftService;
  
  // Load application when user searches/selects
  async function loadApplication(accountId, applicationId) {
    try {
      // 1. Set the context FIRST
      OverdraftService.State.setContext({
        OurBranchID: "0325",
        AccountID: accountId,
        ApplicationID: applicationId,
        OperatorID: "web_portal",
        Direction: 1
      });
      
      // 2. Now load the main application data
      const result = await OverdraftService.getOverdraftApplication();
      
      if (result.success) {
        displayApplicationData(result.data);
        
        // Enable navigation to sub-modules
        enableSubModuleNavigation();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("Error loading application:", error);
    }
  }
  
  function enableSubModuleNavigation() {
    // Now user can navigate to any sub-module
    // and the context is already set!
    document.getElementById("viewDocuments").disabled = false;
    document.getElementById("viewGuarantors").disabled = false;
    document.getElementById("viewInterestRates").disabled = false;
  }
  
  // Search button
  document.getElementById("searchBtn").onclick = () => {
    const accountId = document.getElementById("accountId").value;
    const applicationId = document.getElementById("applicationId").value;
    
    if (accountId && applicationId) {
      loadApplication(accountId, applicationId);
    }
  };
})();
```

### Sub-Module: Documents Page

```javascript
// pages/overdraft/overdraft-documents.js
(async function() {
  const { ServiceLoader } = window;
  
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  
  const OverdraftService = window.OverdraftService;
  
  async function loadDocuments() {
    // Check if context is set
    if (!OverdraftService.State.isContextSet()) {
      alert("Please load an application first");
      return;
    }
    
    // Get current context to display
    const context = OverdraftService.State.getContext();
    displayContextInfo(context);
    
    // Load documents - NO NEED to pass AccountID/ApplicationID!
    const result = await OverdraftService.getApplicationDocuments();
    
    if (result.success) {
      const parsed = OverdraftService.parseDocumentResponse(result);
      displayDocuments(parsed.documents);
    }
  }
  
  function displayContextInfo(context) {
    document.getElementById("contextAccountId").textContent = context.AccountID;
    document.getElementById("contextApplicationId").textContent = context.ApplicationID;
  }
  
  // Auto-load on page open
  loadDocuments();
})();
```

### Sub-Module: Guarantors Page

```javascript
// pages/overdraft/overdraft-guarantors.js
(async function() {
  const { ServiceLoader } = window;
  
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  
  const OverdraftService = window.OverdraftService;
  
  async function loadGuarantors() {
    // Context is already set from main application page!
    const result = await OverdraftService.getODApplicationGuarantors({
      ModuleID: 1000  // Only need to pass specific params
    });
    
    if (result.success) {
      displayGuarantors(result.data);
    }
  }
  
  loadGuarantors();
})();
```

### Sub-Module: Interest Rates Page

```javascript
// pages/overdraft/overdraft-interest-rates.js
(async function() {
  const { ServiceLoader } = window;
  
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  
  const OverdraftService = window.OverdraftService;
  
  async function loadInterestRates() {
    // Context provides AccountID/ApplicationID automatically
    const result = await OverdraftService.getODApplicationInterestRate({
      TrxTypeID: "INT_RATE",
      EffectiveDate: "2026-01-21",
      RefNo: ""
    });
    
    if (result.success) {
      displayInterestRates(result.data);
    }
  }
  
  loadInterestRates();
})();
```

---

## 🔧 State Manager API

### `State.setContext(params)`
Set the current application context. Merges with existing context.

```javascript
OverdraftService.State.setContext({
  OurBranchID: "0325",
  AccountID: "0101391000001",
  ApplicationID: "0101000001",
  OperatorID: "web_portal"
});
```

### `State.getContext()`
Get a copy of the current context.

```javascript
const context = OverdraftService.State.getContext();
console.log(context.AccountID);
```

### `State.clearContext()`
Clear the context (e.g., when user logs out or closes application).

```javascript
OverdraftService.State.clearContext();
```

### `State.isContextSet()`
Check if context has required fields (AccountID and ApplicationID).

```javascript
if (OverdraftService.State.isContextSet()) {
  // Safe to load sub-modules
}
```

### `State.mergeParams(additionalParams)`
Merge context with additional parameters. Used internally by service methods.

```javascript
const merged = OverdraftService.State.mergeParams({
  DocumentID: "DOC1"
});
// Result: { ...context, DocumentID: "DOC1" }
```

---

## 🎨 Usage Patterns

### Pattern 1: Single Application Workflow

```javascript
// 1. User searches and selects application
searchApplication();

// 2. Load and set context
async function loadSelectedApplication(accountId, appId) {
  OverdraftService.State.setContext({
    OurBranchID: "0325",
    AccountID: accountId,
    ApplicationID: appId
  });
  
  const result = await OverdraftService.getOverdraftApplication();
  displayApplication(result.data);
}

// 3. Navigate to any sub-module freely
openDocumentsPage();  // Context already set!
openGuarantorsPage(); // Context already set!
```

### Pattern 2: Override Context Per Call

```javascript
// Set default context
OverdraftService.State.setContext({
  AccountID: "0101391000001",
  ApplicationID: "0101000001"
});

// Use default context
const result1 = await OverdraftService.getApplicationDocuments();

// Override for specific call
const result2 = await OverdraftService.getApplicationDocuments({
  AccountID: "9999999999999",  // Different account
  DocumentID: "DOC2"
});

// Next call uses default context again
const result3 = await OverdraftService.getApplicationDocuments();
```

### Pattern 3: Multi-Tab/Multi-Window Scenario

```javascript
// Before navigating away, save context
const currentContext = OverdraftService.State.getContext();
sessionStorage.setItem("overdraftContext", JSON.stringify(currentContext));

// On page load, restore context
const savedContext = sessionStorage.getItem("overdraftContext");
if (savedContext) {
  OverdraftService.State.setContext(JSON.parse(savedContext));
}
```

### Pattern 4: Breadcrumb Navigation

```javascript
function updateBreadcrumb() {
  const context = OverdraftService.State.getContext();
  
  if (context.AccountID && context.ApplicationID) {
    document.getElementById("breadcrumb").innerHTML = `
      <span>Overdraft</span> >
      <span>Account: ${context.AccountID}</span> >
      <span>Application: ${context.ApplicationID}</span>
    `;
  }
}
```

---

## 📋 Common Parameters Reference

### Required for All Calls
- `OurBranchID` - Branch ID
- `AccountID` - Account ID
- `ApplicationID` - Application ID
- `OperatorID` - Operator ID
- `Direction` - Direction (usually 1 for forward)

### Method-Specific Parameters

#### `getApplicationDocuments()`
- `DocumentID` - Specific document ID (optional, empty for all)

#### `getODApplicationGuarantors()`
- `ModuleID` - Module ID
- `GuarantorID` - Specific guarantor ID (optional)

#### `getODApplicationInterestRate()`
- `TrxTypeID` - Transaction type ID
- `EffectiveDate` - Effective date
- `RefNo` - Reference number

---

## ⚠️ Best Practices

### ✅ DO
- Set context immediately after loading an application
- Check `isContextSet()` before accessing sub-modules
- Clear context when user logs out or closes application
- Use context for all related sub-module calls
- Display current context in UI for user reference

### ❌ DON'T
- Forget to set context before accessing sub-modules
- Assume context is set - always check
- Set context in sub-modules - set it in main page
- Mix multiple application contexts without clearing
- Hardcode parameters that should come from context

---

## 🔍 Debugging Tips

### Check Current Context
```javascript
console.log("Current context:", OverdraftService.State.getContext());
```

### Verify Context Before API Call
```javascript
if (!OverdraftService.State.isContextSet()) {
  console.error("Context not set!");
  return;
}
```

### Log Merged Parameters
```javascript
const params = OverdraftService.State.mergeParams({ DocumentID: "DOC1" });
console.log("Sending parameters:", params);
```

---

## 🚀 Migration Guide

### Before (Old Way)
```javascript
// Had to pass same params to every call
const docs = await OverdraftService.getApplicationDocuments({
  OurBranchID: "0325",
  AccountID: "0101391000001",
  ApplicationID: "0101000001",
  OperatorID: "web_portal",
  Direction: 1
});

const guarantors = await OverdraftService.getODApplicationGuarantors({
  OurBranchID: "0325",
  AccountID: "0101391000001",
  ApplicationID: "0101000001",
  OperatorID: "web_portal",
  Direction: 1,
  ModuleID: 1000
});
```

### After (New Way)
```javascript
// Set context once
OverdraftService.State.setContext({
  OurBranchID: "0325",
  AccountID: "0101391000001",
  ApplicationID: "0101000001",
  OperatorID: "web_portal",
  Direction: 1
});

// Clean calls
const docs = await OverdraftService.getApplicationDocuments();
const guarantors = await OverdraftService.getODApplicationGuarantors({ ModuleID: 1000 });
```

---

## 📱 UI Component Example

### Context Display Component

```html
<div class="overdraft-context-bar">
  <strong>Current Application:</strong>
  <span id="currentBranch">-</span> |
  <span id="currentAccount">-</span> |
  <span id="currentApplication">-</span>
  <button id="clearContext">Clear</button>
</div>
```

```javascript
function updateContextDisplay() {
  const context = OverdraftService.State.getContext();
  
  document.getElementById("currentBranch").textContent = context.OurBranchID || "-";
  document.getElementById("currentAccount").textContent = context.AccountID || "-";
  document.getElementById("currentApplication").textContent = context.ApplicationID || "-";
}

document.getElementById("clearContext").onclick = () => {
  OverdraftService.State.clearContext();
  updateContextDisplay();
  alert("Context cleared. Please load an application.");
};
```

---

## 🎯 Real-World Example: Complete Flow

```javascript
// === Main Application Page ===
(async function() {
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  
  const OverdraftService = window.OverdraftService;
  
  // Search form submission
  document.getElementById("searchForm").onsubmit = async (e) => {
    e.preventDefault();
    
    const accountId = document.getElementById("accountId").value;
    const applicationId = document.getElementById("applicationId").value;
    
    // Set context
    OverdraftService.State.setContext({
      OurBranchID: "0325",
      AccountID: accountId,
      ApplicationID: applicationId,
      OperatorID: "web_portal",
      Direction: 1
    });
    
    // Load main application
    const result = await OverdraftService.getOverdraftApplication();
    
    if (result.success) {
      populateMainForm(result.data);
      showSubModuleTabs(); // Enable documents, guarantors, etc.
    }
  };
  
  // Tab navigation
  document.getElementById("documentsTab").onclick = () => {
    loadDocumentsInTab();
  };
  
  document.getElementById("guarantorsTab").onclick = () => {
    loadGuarantorsInTab();
  };
  
  async function loadDocumentsInTab() {
    // No params needed - uses context!
    const result = await OverdraftService.getApplicationDocuments();
    
    if (result.success) {
      const parsed = OverdraftService.parseDocumentResponse(result);
      displayDocumentsInTab(parsed.documents);
    }
  }
  
  async function loadGuarantorsInTab() {
    // Only pass method-specific params
    const result = await OverdraftService.getODApplicationGuarantors({
      ModuleID: 1000
    });
    
    if (result.success) {
      displayGuarantorsInTab(result.data);
    }
  }
})();
```

---

**🎉 Now you can navigate freely between overdraft sub-modules without repeatedly passing AccountID and ApplicationID!**
