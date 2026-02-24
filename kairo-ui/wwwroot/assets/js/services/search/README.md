# Reusable Search Services

This directory contains reusable search service modules that can be used across different modules in the application.

## Services Available

### 1. Branch Search Service (`branchSearchService.js`)

**Purpose**: Search and select branches from the system.

**Usage**:
```javascript
// Open the branch search modal
await window.BranchSearchService.openSearchModal((branchId, branchName) => {
  // Handle the selected branch
  document.getElementById('BranchId').value = branchId;
  document.getElementById('BranchName').value = branchName;
});
```

**API Used**: `dbo.pc_SearchSystemBranches`

**Features**:
- Search by Branch ID (Like/Exact match)
- Search by Branch Name (Like/Exact match)
- Professional modal UI with search filters
- Auto-loads initial results on open
- Returns: branchId, branchName

---

### 2. Client Search Service (`clientSearchService.js`)

**Purpose**: Search and select clients from the system.

**Usage**:
```javascript
// Open the client search modal
await window.ClientSearchService.openSearchModal((clientId, clientName) => {
  // Handle the selected client
  document.getElementById('ClientId').value = clientId;
  document.getElementById('ClientName').value = clientName;
});
```

**API Used**: `dbo.p_GetSearchResult` with TableID='ClientID'

**Features**:
- Search by Client ID (Like/Exact match)
- Search by Client Name (Like/Exact match)
- Professional modal UI with search filters
- Auto-loads initial results on open
- Returns: clientId, clientName

---

### 3. Deal Search Service (`dealSearchService.js`)

**Purpose**: Generic service for searching deals/transactions across different modules.

**Usage**:
```javascript
// Open the deal search modal
await window.DealSearchService.openSearchModal({
  tableId: 'FXDealNo',           // Table ID for the search
  moduleId: 6500,                 // Module ID (e.g., 6500 for Treasury)
  module: 'BOOK',                 // Module name
  title: 'FX Deal No',            // Modal title
  onSelectCallback: (dealNumber, record) => {
    // Handle the selected deal
    document.getElementById('DealNo').value = dealNumber;
    // record contains full row data
  }
});
```

**API Used**: `dbo.p_GetSearchResult` with configurable TableID

**Features**:
- Search by Deal Number (Like/Exact match)
- Search by Value Date (Like/Exact match)
- Search by Branch ID (Like/Exact match)
- Configurable for different deal types
- Professional modal UI with search filters
- Auto-loads initial results on open
- Returns: dealNumber and full record object

**Common Deal Types**:
- FX Deal: `tableId: 'FXDealNo', moduleId: 6500, module: 'BOOK'`
- Other deal types can be configured similarly

---

## Integration Guide

### Step 1: Load the Services

Add the service scripts to your HTML page **before** your page-specific script:

```html
<!-- Search Services -->
<script src="/assets/js/services/search/branchSearchService.js"></script>
<script src="/assets/js/services/search/clientSearchService.js"></script>
<script src="/assets/js/services/search/dealSearchService.js"></script>

<!-- Your page script -->
<script src="/assets/js/pages/treasury/forex-deal-front-office.js"></script>
```

### Step 2: Use in Your Module

```javascript
// Branch Search Button
document.getElementById('branchSearchBtn').addEventListener('click', async () => {
  await window.BranchSearchService.openSearchModal((branchId, branchName) => {
    document.getElementById('BranchId').value = branchId;
    document.getElementById('BranchName').value = branchName;
  });
});

// Client Search Button
document.getElementById('clientSearchBtn').addEventListener('click', async () => {
  await window.ClientSearchService.openSearchModal((clientId, clientName) => {
    document.getElementById('ClientId').value = clientId;
    document.getElementById('ClientName').value = clientName;
  });
});

// Deal Search Button
document.getElementById('dealSearchBtn').addEventListener('click', async () => {
  await window.DealSearchService.openSearchModal({
    tableId: 'FXDealNo',
    moduleId: 6500,
    module: 'BOOK',
    title: 'Search FX Deals',
    onSelectCallback: (dealNumber, record) => {
      document.getElementById('DealNo').value = dealNumber;
      // Load the full record if needed
      loadRecord(dealNumber);
    }
  });
});
```

---

## Dependencies

All services require:
- **Bootstrap 5.x** - For modal functionality
- **Bootstrap Icons** - For UI icons
- **window.CoreApi** - For making API requests
- **window.Environment** - For API base URL configuration
- **window.AuthService** (optional) - For session/operator info
- **window.SearchService** (for DealSearchService only) - For deal search API

---

## Styling

The services use Bootstrap classes and custom styling. The modals include:
- Professional blue headers
- Search filter cards
- Responsive tables with sticky headers
- Hover effects on rows
- Loading/error states

---

## Error Handling

All services include built-in error handling:
- Console logging for debugging
- User-friendly error messages
- Alert fallbacks if Bootstrap Modal is unavailable
- Graceful degradation if API fails

---

## Example: Complete Integration

```html
<!DOCTYPE html>
<html>
<head>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons/font/bootstrap-icons.css" rel="stylesheet">
</head>
<body>
  <!-- Your form -->
  <input type="text" id="BranchId">
  <input type="text" id="BranchName">
  <button id="branchSearchBtn">Search Branch</button>

  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
  
  <!-- Core Services -->
  <script src="/assets/js/services/coreApi.js"></script>
  <script src="/assets/js/services/authService.js"></script>
  
  <!-- Search Services -->
  <script src="/assets/js/services/search/branchSearchService.js"></script>
  <script src="/assets/js/services/search/clientSearchService.js"></script>
  <script src="/assets/js/services/search/dealSearchService.js"></script>
  
  <!-- Your Module -->
  <script>
    document.getElementById('branchSearchBtn').addEventListener('click', async () => {
      await window.BranchSearchService.openSearchModal((branchId, branchName) => {
        document.getElementById('BranchId').value = branchId;
        document.getElementById('BranchName').value = branchName;
      });
    });
  </script>
</body>
</html>
```

---

## Notes

- All services are self-contained and create their own modals dynamically
- Modals are reused once created (singleton pattern)
- Services use environment variables for API URLs
- All searches support both "Like" (partial match) and "=" (exact match) operators
- Services are exposed to the global `window` object for easy access

---

## Future Enhancements

Possible improvements:
- Add pagination for large result sets
- Add export functionality
- Add advanced filtering options
- Add recent searches/favorites
- Add keyboard shortcuts
