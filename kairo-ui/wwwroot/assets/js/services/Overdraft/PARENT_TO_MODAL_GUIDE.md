# Overdraft Parent-to-Guarantor Modal Integration Guide

## 🎯 Overview

This guide shows how to link the Overdraft Application parent form with the Guarantor sub-module modal, passing ClientID from the parent form to display as GuarantorID in the modal.

---

## 🚀 Quick Implementation

### Step 1: Parent Form HTML

Add a "View Guarantor" button in your Overdraft application form:

```html
<!-- Overdraft Application Form -->
<div class="form-group">
  <label>Client ID</label>
  <input type="text" id="clientID" class="form-control" readonly>
</div>

<div class="form-group">
  <label>Account ID</label>
  <input type="text" id="accountID" class="form-control" readonly>
</div>

<div class="form-group">
  <label>Application ID</label>
  <input type="text" id="applicationID" class="form-control" readonly>
</div>

<!-- View Guarantor Button -->
<button type="button" id="viewGuarantorBtn" class="btn btn-primary">
  View Guarantor
</button>
```

### Step 2: Guarantor Modal HTML

Create the guarantor modal structure:

```html
<!-- Guarantor Modal -->
<div id="guarantorModal" class="modal fade" tabindex="-1">
  <div class="modal-dialog modal-lg">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Guarantor Details</h5>
        <button type="button" class="close" onclick="OverdraftService.closeGuarantorModal()">
          <span>&times;</span>
        </button>
      </div>
      <div class="modal-body">
        <form id="guarantorForm">
          <!-- Context Information (readonly) -->
          <div class="row">
            <div class="col-md-4">
              <div class="form-group">
                <label>Guarantor ID <span class="text-danger">*</span></label>
                <input type="text" id="guarantorID" class="form-control" readonly>
                <small class="form-text text-muted">From Parent ClientID</small>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Account ID</label>
                <input type="text" id="modalAccountID" class="form-control" readonly>
              </div>
            </div>
            <div class="col-md-4">
              <div class="form-group">
                <label>Application ID</label>
                <input type="text" id="modalApplicationID" class="form-control" readonly>
              </div>
            </div>
          </div>

          <!-- Guarantor Specific Fields -->
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Guarantor Name</label>
                <input type="text" id="guarantorName" class="form-control">
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Guarantor Type</label>
                <select id="guarantorType" class="form-control">
                  <option value="">Select Type...</option>
                </select>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Relationship Type</label>
                <select id="relationshipType" class="form-control">
                  <option value="">Select Relationship...</option>
                </select>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Guarantor Amount</label>
                <input type="number" id="guarantorAmount" class="form-control">
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Guarantor Percentage</label>
                <input type="number" id="guarantorPercentage" class="form-control" step="0.01">
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Status</label>
                <select id="guarantorStatus" class="form-control">
                  <option value="">Select Status...</option>
                </select>
              </div>
            </div>
          </div>

          <div class="row">
            <div class="col-md-12">
              <div class="form-group">
                <label>Remarks</label>
                <textarea id="remarks" class="form-control" rows="3"></textarea>
              </div>
            </div>
          </div>

          <!-- Audit Fields (readonly) -->
          <div class="row">
            <div class="col-md-6">
              <div class="form-group">
                <label>Created By</label>
                <input type="text" id="createdBy" class="form-control" readonly>
              </div>
            </div>
            <div class="col-md-6">
              <div class="form-group">
                <label>Created On</label>
                <input type="text" id="createdOn" class="form-control" readonly>
              </div>
            </div>
          </div>
        </form>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="OverdraftService.closeGuarantorModal()">
          Close
        </button>
        <button type="button" class="btn btn-primary" id="saveGuarantorBtn">
          Save Changes
        </button>
      </div>
    </div>
  </div>
</div>
```

### Step 3: Parent Page JavaScript

```javascript
// pages/overdraft/overdraft-application.js
(async function() {
  const { ServiceLoader } = window;
  
  // Load required services
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  await ServiceLoader.loadLookupService();
  
  const OverdraftService = window.OverdraftService;
  const LookupService = window.LookupService;

  // Initialize page
  async function initPage() {
    await loadDropdowns();
    attachEventListeners();
  }

  // Load initial data
  async function loadApplicationData(accountId, applicationId) {
    try {
      // Set context
      OverdraftService.State.setContext({
        OurBranchID: "0325",
        AccountID: accountId,
        ApplicationID: applicationId,
        OperatorID: "web_portal",
        Direction: 1
      });

      // Load application data
      const result = await OverdraftService.getOverdraftApplication();

      if (result.success && result.data.Details02 && result.data.Details02.length > 0) {
        const appData = result.data.Details02[0];
        populateParentForm(appData);
        
        // Enable sub-module buttons
        document.getElementById("viewGuarantorBtn").disabled = false;
      } else {
        alert("No application data found");
      }
    } catch (error) {
      console.error("Error loading application:", error);
      alert("Failed to load application data");
    }
  }

  // Populate parent form
  function populateParentForm(data) {
    document.getElementById("clientID").value = data.ClientID || "";
    document.getElementById("accountID").value = data.AccountID || "";
    document.getElementById("applicationID").value = data.ApplicationID || "";
    // ... populate other fields
  }

  // Attach event listeners
  function attachEventListeners() {
    // View Guarantor button click
    document.getElementById("viewGuarantorBtn").onclick = handleViewGuarantor;
  }

  // Handle View Guarantor button click
  async function handleViewGuarantor() {
    const clientId = document.getElementById("clientID").value;

    if (!clientId) {
      alert("ClientID is required to view guarantor");
      return;
    }

    // Check if context is set
    if (!OverdraftService.State.isContextSet()) {
      alert("Please load an application first");
      return;
    }

    // Open guarantor modal with ClientID
    await OverdraftService.openGuarantorModal(clientId, "guarantorModal", (data) => {
      console.log("Guarantor data loaded:", data);
    });
  }

  // Load dropdowns
  async function loadDropdowns() {
    // Load guarantor type dropdown
    const guarantorTypes = await LookupService.getSystemCodeOptions("GuarantorTypeID");
    populateSelect("guarantorType", guarantorTypes);

    // Load relationship type dropdown
    const relationshipTypes = await LookupService.getSystemCodeOptions("RelationshipTypeID");
    populateSelect("relationshipType", relationshipTypes);

    // Load status dropdown
    const statuses = await LookupService.getSystemCodeOptions("StatusID");
    populateSelect("guarantorStatus", statuses);
  }

  // Populate select dropdown
  function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Select...</option>';
    
    options.forEach(opt => {
      select.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
    });

    if (currentValue) {
      select.value = currentValue;
    }
  }

  // Initialize
  initPage();

  // Example: Load application on search
  document.getElementById("searchBtn")?.addEventListener("click", () => {
    const accountId = document.getElementById("searchAccountId").value;
    const applicationId = document.getElementById("searchApplicationId").value;
    
    if (accountId && applicationId) {
      loadApplicationData(accountId, applicationId);
    }
  });
})();
```

---

## 🎨 Advanced Usage

### Option 1: Simple Click Handler (Inline)

```html
<button onclick="viewGuarantor()">View Guarantor</button>

<script>
async function viewGuarantor() {
  const clientId = document.getElementById("clientID").value;
  await OverdraftService.openGuarantorModal(clientId);
}
</script>
```

### Option 2: With Callback

```javascript
async function viewGuarantor() {
  const clientId = document.getElementById("clientID").value;
  
  await OverdraftService.openGuarantorModal(clientId, "guarantorModal", (data) => {
    // Custom logic after data loads
    console.log("Loaded guarantor:", data);
    
    // Example: Calculate total guarantee amount
    if (data.Details02 && data.Details02.length > 0) {
      const total = data.Details02.reduce((sum, g) => sum + (g.GuarantorAmount || 0), 0);
      document.getElementById("totalGuarantee").textContent = total.toFixed(2);
    }
  });
}
```

### Option 3: Multiple Guarantors List

```html
<!-- Parent Form -->
<div class="guarantors-list">
  <h5>Guarantors</h5>
  <table class="table">
    <thead>
      <tr>
        <th>Client ID</th>
        <th>Name</th>
        <th>Amount</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="guarantorsTableBody">
      <!-- Populated dynamically -->
    </tbody>
  </table>
</div>
```

```javascript
// Load and display multiple guarantors
async function loadGuarantorsList() {
  const result = await OverdraftService.getODApplicationGuarantors({
    ModuleID: 1000
  });

  if (result.success && result.data.Details02) {
    displayGuarantorsTable(result.data.Details02);
  }
}

function displayGuarantorsTable(guarantors) {
  const tbody = document.getElementById("guarantorsTableBody");
  tbody.innerHTML = "";

  guarantors.forEach(guarantor => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${guarantor.GuarantorID}</td>
      <td>${guarantor.GuarantorName || '-'}</td>
      <td>${guarantor.GuarantorAmount || 0}</td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="viewGuarantorDetails('${guarantor.GuarantorID}')">
          View
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

async function viewGuarantorDetails(guarantorId) {
  await OverdraftService.openGuarantorModal(guarantorId);
}
```

---

## 🔧 Service Methods Reference

### `openGuarantorModal(clientId, modalId, callback)`

Opens the guarantor modal with data fetched using ClientID as GuarantorID.

**Parameters:**
- `clientId` (string) - ClientID from parent form
- `modalId` (string) - ID of the modal element (default: "guarantorModal")
- `callback` (function) - Optional callback executed after data loads

**Returns:** Promise with API response

**Example:**
```javascript
await OverdraftService.openGuarantorModal("CLI001", "guarantorModal", (data) => {
  console.log("Guarantor loaded", data);
});
```

### `populateGuarantorModal(data, clientId)`

Populates modal fields with guarantor data.

**Parameters:**
- `data` (object) - API response data
- `clientId` (string) - ClientID to set as GuarantorID

### `closeGuarantorModal(modalId, refreshParent)`

Closes the guarantor modal.

**Parameters:**
- `modalId` (string) - ID of the modal to close
- `refreshParent` (boolean) - Whether to refresh parent form

**Example:**
```javascript
OverdraftService.closeGuarantorModal("guarantorModal", true);
```

---

## 🎯 Data Flow Diagram

```
Parent Form (Overdraft Application)
    │
    ├─ ClientID: "CLI001"
    ├─ AccountID: "0101391000001"
    └─ ApplicationID: "0101000001"
         │
         │ [User clicks "View Guarantor"]
         ↓
    OverdraftService.openGuarantorModal("CLI001")
         │
         ├─ Uses State context (AccountID, ApplicationID)
         ├─ Calls getODApplicationGuarantors({ GuarantorID: "CLI001" })
         ↓
    Guarantor Modal
         │
         ├─ GuarantorID: "CLI001" (readonly, from parent)
         ├─ AccountID: "0101391000001" (from context)
         ├─ ApplicationID: "0101000001" (from context)
         └─ Guarantor-specific fields populated from API
```

---

## 📋 Complete Working Example

### Full Implementation

```javascript
// Complete overdraft-application.js
(async function() {
  const { ServiceLoader } = window;
  
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  await ServiceLoader.loadLookupService();
  
  const OverdraftService = window.OverdraftService;

  // Example: Load application
  async function loadApplication() {
    const accountId = "0101391000001";
    const applicationId = "0101000001";

    // Set context
    OverdraftService.State.setContext({
      OurBranchID: "0325",
      AccountID: accountId,
      ApplicationID: applicationId,
      OperatorID: "web_portal",
      Direction: 1
    });

    // Load application data
    const result = await OverdraftService.getOverdraftApplication();
    
    if (result.success) {
      const app = result.data.Details02[0];
      
      // Populate form
      document.getElementById("clientID").value = app.ClientID;
      document.getElementById("accountID").value = app.AccountID;
      document.getElementById("applicationID").value = app.ApplicationID;
      
      // Enable guarantor button
      document.getElementById("viewGuarantorBtn").disabled = false;
    }
  }

  // View Guarantor Handler
  document.getElementById("viewGuarantorBtn").onclick = async function() {
    const clientId = document.getElementById("clientID").value;
    
    if (!clientId) {
      alert("ClientID is required");
      return;
    }

    try {
      // Open modal - ClientID becomes GuarantorID
      await OverdraftService.openGuarantorModal(clientId, "guarantorModal", (data) => {
        console.log("Guarantor data loaded successfully");
        
        // Optional: Show success message
        const modalBody = document.querySelector("#guarantorModal .modal-body");
        const alert = document.createElement("div");
        alert.className = "alert alert-success";
        alert.textContent = "Guarantor data loaded successfully!";
        modalBody.prepend(alert);
        
        setTimeout(() => alert.remove(), 3000);
      });
    } catch (error) {
      alert("Failed to load guarantor data");
    }
  };

  // Save guarantor changes
  document.getElementById("saveGuarantorBtn")?.addEventListener("click", async () => {
    // Implement save logic here
    const guarantorData = {
      GuarantorID: document.getElementById("guarantorID").value,
      GuarantorName: document.getElementById("guarantorName").value,
      GuarantorType: document.getElementById("guarantorType").value,
      // ... collect other fields
    };
    
    // Call update service method
    // const result = await OverdraftService.updateGuarantor(guarantorData);
    
    console.log("Save guarantor:", guarantorData);
  });

  // Auto-load application on page load (if IDs in URL)
  const urlParams = new URLSearchParams(window.location.search);
  const accountId = urlParams.get("accountId");
  const applicationId = urlParams.get("applicationId");
  
  if (accountId && applicationId) {
    OverdraftService.State.setContext({
      OurBranchID: "0325",
      AccountID: accountId,
      ApplicationID: applicationId
    });
    loadApplication();
  }
})();
```

---

## ✅ Checklist

- [ ] Parent form has ClientID field
- [ ] Context is set when application loads
- [ ] "View Guarantor" button triggers `openGuarantorModal()`
- [ ] Modal has GuarantorID field (readonly)
- [ ] Modal displays AccountID and ApplicationID from context
- [ ] Service method runs on button click
- [ ] Modal populates with guarantor data
- [ ] Close button works properly

---

## 🔍 Troubleshooting

### Modal doesn't open?
- Check if modal ID matches: `"guarantorModal"`
- Verify modal HTML structure exists
- Check browser console for errors

### GuarantorID not populated?
- Ensure field ID is `"guarantorID"`
- Check if ClientID has a value in parent form
- Verify `populateGuarantorModal()` is called

### No data displayed?
- Check if context is set: `OverdraftService.State.isContextSet()`
- Verify API response in network tab
- Check field IDs match the mapping in `populateGuarantorFields()`

### Service call fails?
- Verify ClientID value is valid
- Check context has AccountID and ApplicationID
- Verify API endpoint is correct
- Check network tab for error details

---

**🎉 Your parent-to-modal linkage is ready! ClientID will automatically pass to the modal as GuarantorID when "View Guarantor" is clicked.**
