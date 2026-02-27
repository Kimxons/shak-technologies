# Kairo-UI Coding Standards

**Version:** 1.0  
**Last Updated:** 2024  
**Target Framework:** .NET 9  
**Project Type:** ASP.NET Core MVC with Razor Views

---

## Table of Contents
1. [HTML/Razor Element Naming Conventions](#htmlrazor-element-naming-conventions)
2. [JavaScript Conventions](#javascript-conventions)
3. [File Structure & Organization](#file-structure--organization)
4. [Asset Management](#asset-management)
5. [CSS Class Naming](#css-class-naming)
6. [Razor View Structure](#razor-view-structure)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Best Practices](#best-practices)

---

## HTML/Razor Element Naming Conventions

### 1. Labels
**Prefix:** `lbl_`

**Format:** `lbl_<descriptiveName>`

```html
<!-- ? CORRECT -->
<label class="label-blue" for="txt_accountNumber" id="lbl_accountNumber">Account Number</label>
<label class="label-blue" for="txt_customerName" id="lbl_customerName">Customer Name</label>
<label class="label-blue" for="ddl_branchCode" id="lbl_branchCode">Branch</label>

<!-- ? INCORRECT -->
<label for="accountNumber">Account Number</label>
<label id="accountNumberLabel">Account Number</label>
```

---

### 2. Input Fields

#### Text Inputs
**Prefix:** `txt_`

**Format:** `txt_<descriptiveName>`

```html
<!-- ? CORRECT -->
<input id="txt_customerName" name="customerName" type="text" class="bs-input-text form-control" />
<input id="txt_accountNumber" name="accountNumber" type="text" class="bs-input-text form-control" />
<input id="txt_phoneNumber" name="phoneNumber" type="tel" class="bs-input-text form-control" />
<input id="txt_email" name="email" type="email" class="bs-input-text form-control" />

<!-- ? INCORRECT -->
<input id="customerName" type="text" />
<input id="input_customerName" type="text" />
```

#### Dropdowns/Select
**Prefix:** `ddl_`

**Format:** `ddl_<descriptiveName>`

```html
<!-- ? CORRECT -->
<select id="ddl_statementFor" name="statementFor" class="bs-select">
    <option value="0">Select Period</option>
    <option value="1">Current Month</option>
</select>

<select id="ddl_branchCode" name="branchCode" class="bs-select">
    <option value="">Select Branch</option>
</select>

<!-- ? INCORRECT -->
<select id="statementFor" class="bs-select"></select>
<select id="select_branch" class="bs-select"></select>
<select id="drp_branch" class="bs-select"></select>
```

#### Textarea
**Prefix:** `txa_`

**Format:** `txa_<descriptiveName>`

```html
<!-- ? CORRECT -->
<textarea id="txa_remarks" name="remarks" class="bs-input-text form-control" rows="3"></textarea>
<textarea id="txa_address" name="address" class="bs-input-text form-control" rows="4"></textarea>

<!-- ? INCORRECT -->
<textarea id="remarks"></textarea>
<textarea id="txt_remarks"></textarea>
```

#### Checkbox
**Prefix:** `chk_`

**Format:** `chk_<descriptiveName>`

```html
<!-- ? CORRECT -->
<input type="checkbox" id="chk_isActive" name="isActive" />
<label for="chk_isActive">Is Active</label>

<input type="checkbox" id="chk_selectAll" />
<label for="chk_selectAll">Select All</label>

<!-- ? INCORRECT -->
<input type="checkbox" id="isActive" />
<input type="checkbox" id="cb_isActive" />
```

#### Radio Button
**Prefix:** `rdo_`

**Format:** `rdo_<descriptiveName>`

```html
<!-- ? CORRECT -->
<input type="radio" id="rdo_typeIndividual" name="customerType" value="I" />
<label for="rdo_typeIndividual">Individual</label>

<input type="radio" id="rdo_typeCorporate" name="customerType" value="C" />
<label for="rdo_typeCorporate">Corporate</label>

<!-- ? INCORRECT -->
<input type="radio" id="typeIndividual" name="customerType" />
<input type="radio" id="radio_individual" name="customerType" />
```

---

### 3. Buttons
**Prefix:** `btn_`

**Format:** `btn_<actionName>`

```html
<!-- ? CORRECT -->
<button id="btn_submit" type="button" class="btn-action">Submit</button>
<button id="btn_cancel" type="button" class="btn-action btn-cancel">Cancel</button>
<button id="btn_save" type="button" class="btn-action">Save</button>
<button id="btn_search" type="button" class="btn-action">Search</button>
<button id="btn_fromDatePicker" type="button" class="btn btn-outline-secondary">
    <i class="bi bi-calendar"></i>
</button>

<!-- ? INCORRECT -->
<button id="submitBtn" type="button">Submit</button>
<button id="submit" type="button">Submit</button>
```

---

### 4. Div Elements
**Prefix:** `dv_`

**Format:** `dv_<descriptiveName>`

```html
<!-- ? CORRECT -->
<div id="dv_filterSection" class="form-section">
    <!-- content -->
</div>

<div id="dv_statementGrid" class="form-section">
    <!-- content -->
</div>

<div id="dv_customerDetails" class="form-card">
    <!-- content -->
</div>

<!-- ? INCORRECT -->
<div id="filterSection"></div>
<div id="div_filters"></div>
<div id="filters-section"></div>
```

---

### 5. Form Elements
**Prefix:** `frm_`

**Format:** `frm_<descriptiveName>`

```html
<!-- ? CORRECT -->
<form id="frm_statementFilters" autocomplete="off">
    <!-- form fields -->
</form>

<form id="frm_customerDetails" method="post">
    <!-- form fields -->
</form>

<!-- ? INCORRECT -->
<form id="statementFilters"></form>
<form id="form_filters"></form>
```

---

### 6. Tables/Grids
**Prefix:** `tbl_` or `grid_`

**Format:** `tbl_<descriptiveName>` or `grid_<descriptiveName>`

```html
<!-- ? CORRECT -->
<table id="tbl_statementGrid" class="table table-sm table-hover">
    <!-- table content -->
</table>

<table id="grid_customerList" class="table table-sm">
 <!-- table content -->
</table>

<!-- ? INCORRECT -->
<table id="statementGrid"></table>
<table id="statement-table"></table>
```

---

### 7. Other Common Elements

#### Modal/Dialog
**Prefix:** `mdl_`
```html
<div id="mdl_confirmDelete" class="modal">
    <!-- modal content -->
</div>
```

#### Span (for display values)
**Prefix:** `spn_`
```html
<span id="spn_recordCount" class="de-record-count">(0 records)</span>
<span id="spn_totalAmount">0.00</span>
```

#### Image
**Prefix:** `img_`
```html
<img id="img_customerPhoto" src="/images/default-avatar.png" alt="Customer Photo" />
```

#### Link/Anchor
**Prefix:** `lnk_`
```html
<a id="lnk_viewDetails" href="#" class="nav-link">View Details</a>
```

---

## JavaScript Conventions

### 1. Function Naming
**Use camelCase for all functions**

```javascript
// ? CORRECT
function loadStatementData() { }
function initializeDatePicker() { }
function validateFormInputs() { }
function onSubmitButtonClick() { }
function fetchCustomerDetails(customerId) { }
function calculateTotalAmount(records) { }

// ? INCORRECT
function LoadStatementData() { }          // PascalCase - No
function Initialize_Date_Picker() { }     // snake_case - No
function VALIDATE_FORM() { }        // UPPER_CASE - No
function fetch_customer_details() { }     // snake_case - No
```

### 2. Variable Naming
**Use camelCase**

```javascript
// ? CORRECT
let accountNumber = '123456';
const statementData = [];
var isFormValid = true;
let totalBalance = 0;
const apiEndpoint = '/api/statements';

// ? INCORRECT
let AccountNumber = '123456';        // PascalCase - No
const statement_data = [];         // snake_case - No
var IsFormValid = true;       // PascalCase - No
```

### 3. Constants
**Use UPPER_CASE with underscores**

```javascript
// ? CORRECT
const API_BASE_URL = '/api/v1';
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 50;
const DATE_FORMAT = 'dd-MMM-yyyy';
const TIMEOUT_DURATION = 5000;

// ? INCORRECT
const apiBaseUrl = '/api/v1';        // camelCase for constants - No
const MaxRetryCount = 3;  // PascalCase - No
```

### 4. Class/Constructor Naming
**Use PascalCase**

```javascript
// ? CORRECT
class StatementViewModel {
    constructor(moduleId, branchId) {
        this.moduleId = moduleId;
        this.branchId = branchId;
 }
}

class DataGridManager { }

// ? INCORRECT
class statement_view_model { }
class statementViewModel { }
```

### 5. Private Methods/Variables (Optional Convention)
**Prefix with underscore for private members**

```javascript
// ? ACCEPTABLE
class StatementService {
    _apiUrl = '/api/statements';
    
    _formatDate(date) {
        // private helper method
    }
    
    getStatement(id) {
        // public method
     return this._formatDate(new Date());
 }
}
```

### 6. Event Handler Functions
**Use `on` prefix or `handle` prefix with camelCase**

```javascript
// ? CORRECT
function onSearchButtonClick(event) { }
function handleFormSubmit(event) { }
function onGridRowSelected(row) { }

// ? INCORRECT
function SearchButtonClick() { }
function search_button_click() { }
```

---

## File Structure & Organization

### 1. Module JavaScript Files
**Path:** `wwwroot/js/modules/<module-name>/<file-name>.js`

**Structure:**
```
wwwroot/
??? js/
    ??? modules/
        ??? dashboard/
        ?   ??? dashboard.js
      ??? identities/
        ?   ??? client360/
        ?       ??? client-360-view.js
   ??? accounts/
        ?   ??? account-maintenance.js
        ?   ??? account-opening.js
??? shared/
      ?   ??? statement-view.js
        ??? themeconfiguration/
 ??? theme-configuration.js
```

**Examples:**
```
? wwwroot/js/modules/dashboard/dashboard.js
? wwwroot/js/modules/identities/client360/client-360-view.js
? wwwroot/js/modules/shared/statement-view.js
? wwwroot/js/modules/accounts/account-maintenance.js

? wwwroot/js/dashboard.js
? wwwroot/scripts/modules/dashboard.js
? js/modules/dashboard.js
```

### 2. Shared/Common JavaScript Files
**Path:** `wwwroot/js/shared/<file-name>.js`

```
wwwroot/
??? js/
    ??? shared/
  ??? search-modal.js
        ??? utilities.js
        ??? validation.js
        ??? date-helper.js
```

### 3. Service JavaScript Files
**Path:** `wwwroot/js/services/<service-category>/<file-name>.js`

```
wwwroot/
??? js/
    ??? services/
      ??? shared/
  ?   ??? coreApi.js
        ??? account/
     ?   ??? accountservice.js
        ??? client/
       ??? clientservice.js
```

### 4. Application Core JavaScript
**Path:** `wwwroot/js/app/<file-name>.js`

```
wwwroot/
??? js/
    ??? app/
 ??? app-core.js
        ??? app-init.js
        ??? app-config.js
```

### 5. CSS Files (Module-Specific)
**Path:** `wwwroot/css/<module-name>.css` or `wwwroot/css/<feature-name>.css`

```
wwwroot/
??? css/
    ??? site.css            # Global styles
    ??? search-modal.css      # Shared component styles
    ??? statement-view.css    # Module-specific styles
    ??? theme-configuration.css     # Module-specific styles
```

---

## Asset Management

### 1. No CDN References ?? CRITICAL
**All external libraries MUST be installed locally and referenced from the `wwwroot` directory.**

**? INCORRECT - DO NOT USE CDN:**
```html
<!-- NEVER use CDN links -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css">
```

**? CORRECT - Use Local References:**
```html
<!-- Always use locally installed libraries -->
<link rel="stylesheet" href="~/lib/bootstrap/css/bootstrap.min.css" />
<link rel="stylesheet" href="~/lib/bootstrap-icons/font/bootstrap-icons.css" />
<script src="~/lib/jquery/jquery.min.js"></script>
<script src="~/lib/bootstrap/js/bootstrap.bundle.min.js"></script>
```

### 2. Local Library Path Structure
```
wwwroot/
??? lib/                  # Third-party libraries
?   ??? bootstrap/
?   ?   ??? css/
?   ?   ?   ??? bootstrap.min.css
?   ?   ?   ??? bootstrap.min.css.map
?   ?   ??? js/
?   ?       ??? bootstrap.bundle.min.js
?   ?       ??? bootstrap.bundle.min.js.map
?   ??? jquery/
?   ?   ??? jquery.min.js
?   ?   ??? jquery.min.js.map
?   ??? bootstrap-icons/
?   ?   ??? font/
?   ?   ??? bootstrap-icons.css
?   ?       ??? fonts/
?   ??? flatpickr/
?   ?   ??? flatpickr.min.css
?   ?   ??? flatpickr.min.js
?   ??? [other-libraries]/
??? css/     # Application CSS
??? js/           # Application JavaScript
??? images/      # Images and icons
??? fonts/    # Custom fonts (if any)
```

### 3. Installing Local Libraries
Use LibMan (Library Manager) or npm to install libraries:

```bash
# Using LibMan (Recommended for ASP.NET Core)
libman install bootstrap@5.3.0 -p jsdelivr -d wwwroot/lib/bootstrap
libman install jquery@3.7.1 -p cdnjs -d wwwroot/lib/jquery

# Or use package managers as configured in the project
```

---

## CSS Class Naming

### 1. Component Classes
**Use kebab-case with meaningful prefixes**

```css
/* AM = Application Module prefix */
.am-header { }
.am-header__title { }
.am-header__icon { }
.am-header__left { }
.am-header__right { }

/* BS = Bootstrap-styled custom classes */
.bs-input-text { }
.bs-select { }
.bs-button { }

/* DE = Data Entry prefix */
.de-title-btn { }
.de-record-count { }

/* Module-specific prefixes (e.g., SV = Statement View) */
.sv-print-export { }
.sv-export-btn { }
.sv-excel-btn { }
.sv-pdf-btn { }
```

### 2. BEM Methodology (Block Element Modifier)
**Recommended for complex components**

```css
/* Block */
.search-modal { }

/* Element */
.search-modal__header { }
.search-modal__body { }
.search-modal__footer { }

/* Modifier */
.search-modal--large { }
.search-modal--fullscreen { }

/* Combined */
.search-modal__button--primary { }
```

### 3. State Classes
**Use `is-` or `has-` prefix**

```css
.is-visible { }
.is-active { }
.is-disabled { }
.is-loading { }
.has-error { }
.has-warning { }
```

---

## Razor View Structure

### Standard View Template
```razor
@{
    Layout = "_ApplicationLayout";
    ViewBag.Title = "View Title";
}

<!-- Module-specific CSS -->
<link rel="stylesheet" href="~/css/module-specific.css" />

<div class="window">
  <!-- Header -->
    <div class="am-header" role="banner" aria-label="Window title bar">
        <div class="am-header__left">
            <i class="bi bi-icon-name am-header__icon" aria-hidden="true"></i>
      <span class="am-header__title">@ViewBag.Title</span>
     </div>
  <div class="am-header__right" role="toolbar" aria-label="Window controls">
         <button class="de-title-btn am-btn am-btn-secondary" type="button" data-action="refresh" 
     title="Refresh" aria-label="Refresh data">
              <i class="bi bi-arrow-clockwise"></i>
          </button>
          <button class="de-title-btn am-btn am-btn-secondary" type="button" data-action="maximize" 
  title="Maximize" aria-label="Maximize window">
    <i class="bi bi-square"></i>
            </button>
        <button class="de-title-btn am-btn am-btn-secondary" type="button" data-action="close" 
  title="Close" aria-label="Close window">
        <i class="bi bi-x-lg"></i>
         </button>
   </div>
    </div>

    <!-- Main Content -->
    <main class="main-container">
        <div class="form-content" role="region" aria-label="Main content">
      <div class="form-card" data-main-form>
     <!-- Form sections go here -->
  </div>
  </div>

        <!-- Action Panel -->
     <aside class="action-panel">
            <div class="d-flex flex-column gap-2 mt-auto">
       <!-- Action buttons -->
    </div>
  </aside>
    </main>
</div>

<!-- View-specific styles (if small, otherwise use separate CSS file) -->
<style>
  /* View-specific CSS here */
</style>

<!-- State initialization script -->
<script>
    // Store view parameters from controller
    window.ModuleNameState = {
        ModuleID: '@ViewBag.ModuleID',
        BranchID: '@ViewBag.BranchID',
        // Other properties
    };
</script>

<!-- Module JavaScript (always last) -->
<script src="~/js/modules/module-name/module-script.js"></script>
```

### Collapsible Section Template
```html
<div class="form-section" data-section="section-name">
    <div class="section-header" data-section-toggle>
     <span class="section-header__title">
     <i class="bi bi-icon-name"></i>Section Title
      </span>
     <button type="button" class="section-toggle-btn" 
         aria-label="Toggle Section Title" aria-expanded="true">
            <i class="bi bi-chevron-up"></i>
        </button>
    </div>
    <div class="section-content" data-section-content>
        <!-- Section content -->
    </div>
</div>
```

---

## Accessibility Requirements

### 1. Always Include ARIA Labels
```html
<!-- ? CORRECT -->
<button type="button" aria-label="Close window" title="Close">
    <i class="bi bi-x-lg"></i>
</button>

<div role="region" aria-label="Statement View">
    <!-- content -->
</div>

<button type="button" aria-expanded="true" aria-label="Toggle Filters">
    <i class="bi bi-chevron-up"></i>
</button>

<!-- ? INCORRECT -->
<button type="button">
    <i class="bi bi-x-lg"></i>
</button>
```

### 2. Associate Labels with Inputs
```html
<!-- ? CORRECT -->
<label for="txt_accountNumber" id="lbl_accountNumber">Account Number</label>
<input id="txt_accountNumber" name="accountNumber" type="text" />

<!-- ? INCORRECT -->
<label>Account Number</label>
<input id="txt_accountNumber" type="text" />
```

### 3. Use Semantic HTML5 Elements
```html
<!-- ? CORRECT -->
<header class="am-header" role="banner">...</header>
<main class="main-container">...</main>
<aside class="action-panel">...</aside>
<nav class="sidebar-nav">...</nav>

<!-- ? INCORRECT -->
<div class="header">...</div>
<div class="main">...</div>
<div class="sidebar">...</div>
```

### 4. Provide Alternative Text
```html
<!-- ? CORRECT -->
<img src="/images/logo.png" alt="Kairo Banking System Logo" />
<i class="bi bi-file-text" aria-hidden="true"></i> <!-- Icons are decorative -->

<!-- ? INCORRECT -->
<img src="/images/logo.png" />
```

---

## Best Practices

### 1. Form Structure
```html
<form id="frm_customerDetails" autocomplete="off">
    <div class="row g-3 mb-3">
        <div class="col-4">
  <label class="label-blue" for="txt_customerId" id="lbl_customerId">Customer ID</label>
        <input id="txt_customerId" name="customerId" type="text" class="bs-input-text form-control" />
        </div>
        <div class="col-8">
 <label class="label-blue" for="txt_customerName" id="lbl_customerName">Customer Name</label>
            <input id="txt_customerName" name="customerName" type="text" class="bs-input-text form-control" />
</div>
    </div>
</form>
```

### 2. Date Picker Pattern
```html
<div class="col-4">
    <label class="label-blue" for="txt_fromDate" id="lbl_fromDate">From Date</label>
    <div class="input-group">
        <input id="txt_fromDate" name="fromDate" type="text" 
        class="bs-input-text form-control" placeholder="dd-mmm-yyyy" autocomplete="off" />
        <button id="btn_fromDatePicker" type="button" class="btn btn-outline-secondary" title="Pick Date">
            <i class="bi bi-calendar"></i>
        </button>
    </div>
</div>
```

### 3. JavaScript Module Pattern
**File:** `wwwroot/js/modules/statement/statement-view.js`

```javascript
(function () {
    'use strict';

    // Constants
    const API_ENDPOINT = '/api/statements';
    const DEFAULT_PAGE_SIZE = 50;

    // Module state
    let currentFilters = {};
    let gridData = [];

    // Initialize module
    function init() {
   initializeEventHandlers();
        initializeDatePickers();
  loadInitialData();
 }

    // Event handlers
    function initializeEventHandlers() {
        document.getElementById('btn_search')?.addEventListener('click', onSearchClick);
      document.getElementById('btn_refresh')?.addEventListener('click', onRefreshClick);
    }

  // Public API
    window.StatementView = {
 init: init,
        refresh: loadInitialData
    };

    // Auto-initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

### 4. Data Attributes for Actions
**Use `data-action` for button actions**

```html
<!-- ? CORRECT -->
<button type="button" data-action="save">Save</button>
<button type="button" data-action="delete">Delete</button>
<button type="button" data-action="refresh">Refresh</button>

<!-- JavaScript handler -->
<script>
document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', function() {
   const action = this.getAttribute('data-action');
        handleAction(action);
    });
});
</script>
```

### 5. State Management
**Use window namespace for view state**

```razor
<script>
    // Store view parameters from controller
    window.StatementViewState = {
        ModuleID: '@ViewBag.ModuleID',
        BranchID: '@ViewBag.BranchID',
      AccountID: '@ViewBag.AccountID'
    };
</script>
```

### 6. Error Handling
```javascript
async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
   throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
   return data;
    } catch (error) {
   console.error('Error fetching data:', error);
   showErrorMessage('Failed to load data. Please try again.');
        return null;
    }
}
```

### 7. Comments
**Use descriptive comments for complex logic**

```javascript
// ? CORRECT - Explains WHY
// Calculate running balance after each transaction
// to display accurate closing balance in the grid
function calculateRunningBalance(transactions) {
 // implementation
}

// ? INCORRECT - States the obvious
// Loop through transactions
for (let i = 0; i < transactions.length; i++) {
    // ...
}
```

---

## Quick Reference Table

### HTML Element ID Prefixes

| Element Type | Prefix | Example |
|-------------|--------|---------|
| Label | `lbl_` | `lbl_customerName` |
| Text Input | `txt_` | `txt_accountNumber` |
| Dropdown/Select | `ddl_` | `ddl_branchCode` |
| Textarea | `txa_` | `txa_remarks` |
| Checkbox | `chk_` | `chk_isActive` |
| Radio Button | `rdo_` | `rdo_typeIndividual` |
| Button | `btn_` | `btn_submit` |
| Div | `dv_` | `dv_filterSection` |
| Form | `frm_` | `frm_customerDetails` |
| Table | `tbl_` or `grid_` | `tbl_statementGrid` |
| Modal/Dialog | `mdl_` | `mdl_confirmDelete` |
| Span (display) | `spn_` | `spn_recordCount` |
| Image | `img_` | `img_customerPhoto` |
| Link/Anchor | `lnk_` | `lnk_viewDetails` |

### JavaScript Naming

| Item Type | Convention | Example |
|-----------|-----------|---------|
| Functions | camelCase | `loadStatementData()` |
| Variables | camelCase | `accountNumber` |
| Constants | UPPER_CASE | `API_BASE_URL` |
| Classes | PascalCase | `StatementViewModel` |
| Private members | _camelCase | `_formatDate()` |
| Event handlers | onEventName / handleEvent | `onSubmitClick()` |

### File Paths

| File Type | Path | Example |
|-----------|------|---------|
| Module JS | `wwwroot/js/modules/<module>/` | `wwwroot/js/modules/dashboard/dashboard.js` |
| Shared JS | `wwwroot/js/shared/` | `wwwroot/js/shared/utilities.js` |
| Service JS | `wwwroot/js/services/<category>/` | `wwwroot/js/services/shared/coreApi.js` |
| App Core JS | `wwwroot/js/app/` | `wwwroot/js/app/app-core.js` |
| CSS | `wwwroot/css/` | `wwwroot/css/search-modal.css` |
| Local Libraries | `wwwroot/lib/<library>/` | `wwwroot/lib/bootstrap/css/bootstrap.min.css` |

---

## Code Review Checklist

Before submitting your code, verify:

- [ ] All labels have `lbl_` prefix
- [ ] All input fields use correct prefix (`txt_`, `ddl_`, `txa_`, `chk_`, `rdo_`)
- [ ] All buttons have `btn_` prefix
- [ ] All div elements with IDs have `dv_` prefix
- [ ] All forms have `frm_` prefix
- [ ] All JavaScript functions use camelCase
- [ ] All JavaScript constants use UPPER_CASE
- [ ] Module JavaScript files are in `wwwroot/js/modules/`
- [ ] **No CDN links are used** - all libraries are local
- [ ] All labels are associated with their inputs using `for` attribute
- [ ] ARIA labels are provided for icon-only buttons
- [ ] Semantic HTML5 elements are used where appropriate
- [ ] Code follows the established patterns in existing views

---

## Examples from Existing Codebase

### Good Example: Statement View Filter Section
```html
<div class="form-section" data-section="filters">
    <div class="section-content" data-section-content>
    <form id="frm_statementFilters" autocomplete="off">
        <div class="row g-3 mb-3">
<div class="col-4">
         <label class="label-blue" for="ddl_statementFor" id="lbl_statementFor">Statement For</label>
           <select id="ddl_statementFor" name="statementFor" class="bs-select">
           <option value="0">Select Period</option>
            <option value="1">Current Month</option>
    </select>
      </div>
         <div class="col-4">
        <label class="label-blue" for="txt_fromDate" id="lbl_fromDate">From Date</label>
           <div class="input-group">
        <input id="txt_fromDate" name="fromDate" type="text" 
           class="bs-input-text form-control" placeholder="dd-mmm-yyyy" autocomplete="off" />
  <button id="btn_fromDatePicker" type="button" class="btn btn-outline-secondary" title="Pick Date">
    <i class="bi bi-calendar"></i>
                </button>
  </div>
        </div>
            </div>
        </form>
    </div>
</div>
```

### Good Example: JavaScript Module
```javascript
// wwwroot/js/modules/statement/statement-view.js
(function () {
 'use strict';

    function loadStatementData(filters) {
        const apiUrl = `${window.apiBaseUrl}/statements`;
    // implementation
    }

    function initializeDatePickers() {
        flatpickr('#txt_fromDate', {
            dateFormat: 'd-M-Y'
   });
    }

  function onSearchClick(event) {
    event.preventDefault();
      const filters = getFilterValues();
        loadStatementData(filters);
    }

    window.StatementView = {
        init: function() {
            initializeDatePickers();
        initializeEventHandlers();
        }
    };
})();
```

---

## Common Mistakes to Avoid

### ? DON'T:
```html
<!-- Missing prefix -->
<input id="accountNumber" type="text" />

<!-- Wrong prefix -->
<input id="input_accountNumber" type="text" />
<select id="dropdown_branch"></select>

<!-- Using CDN -->
<script src="https://cdn.jsdelivr.net/npm/jquery"></script>

<!-- Label not associated -->
<label>Account Number</label>
<input id="txt_accountNumber" type="text" />

<!-- JavaScript with wrong casing -->
<script>
function LoadData() { }  // Should be camelCase
let CustomerName = '';   // Should be camelCase
</script>
```

### ? DO:
```html
<!-- Correct prefix -->
<input id="txt_accountNumber" type="text" />

<!-- Correct select prefix -->
<select id="ddl_branch"></select>

<!-- Local library reference -->
<script src="~/lib/jquery/jquery.min.js"></script>

<!-- Label properly associated -->
<label for="txt_accountNumber" id="lbl_accountNumber">Account Number</label>
<input id="txt_accountNumber" type="text" />

<!-- JavaScript with correct casing -->
<script>
function loadData() { }  // camelCase
let customerName = '';   // camelCase
const API_URL = '';// UPPER_CASE for constants
</script>
```

---

## Additional Guidelines

### 1. Consistent Indentation
- Use **4 spaces** for HTML/Razor
- Use **4 spaces** or **2 spaces** for JavaScript (be consistent within a file)
- Use **2 spaces** for CSS

### 2. Commenting
- Add comments for complex business logic
- Document function parameters and return values for public APIs
- Use XML documentation comments in C# controllers

### 3. Performance Considerations
- Minimize DOM queries - cache element references
- Use event delegation for dynamically added elements
- Debounce search/filter inputs
- Use `const` and `let` instead of `var`

### 4. Security
- Always escape user input when displaying
- Use CSRF tokens for forms that modify data
- Validate on both client and server side
- Use `autocomplete="off"` for sensitive fields

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024 | Initial coding standards document |

---

## Contact & Questions

For questions about these standards or to propose changes, please contact the development team lead or submit a pull request with your suggested changes to this document.

---

**Remember:** Consistency is key to maintainable code. When in doubt, follow the patterns established in existing, well-reviewed code files.
