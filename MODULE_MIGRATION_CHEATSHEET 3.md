# 📋 KAIRO MODULE MIGRATION CHEAT SHEET v2.1
## For Team Distribution

> **Last Updated:** March 5, 2026  
> **Purpose:** Guide for migrating legacy HTML/JS/Bootstrap modules to KAIRO MVC architecture

---

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        KAIRO MVC MIGRATION ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────┐ │
│  │   RAZOR VIEW     │     │   JAVASCRIPT     │     │  KAIRO-UI CONTROLLER     │ │
│  │   (.cshtml)      │◄───►│   MODULE (.js)   │◄───►│  (Controller.cs)         │ │
│  │                  │     │                  │     │                          │ │
│  │  - UI Layout     │     │  - State Mgmt    │     │  - Route Endpoints       │ │
│  │  - Form Fields   │     │  - SearchModal   │     │  - Auth Check            │ │
│  │  - Dropdowns via │     │  - API Calls     │     │  - Call OldApiService    │ │
│  │    ViewData[]    │     │  - Validation    │     │    (ALL METHODS POST)    │ │
│  └──────────────────┘     └──────────────────┘     └────────────┬─────────────┘ │
│                                    │                            │               │
│                                    │                            ▼               │
│                                    │              ┌──────────────────────────┐  │
│                                    │              │    OLD API SERVICE       │  │
│                                    │              │   (OldApiService.cs)     │  │
│                                    │              │                          │  │
│                                    │              │  ALL METHODS USE POST:   │  │
│                                    │              │  - CreateAsync<T>()      │  │
│                                    │              │  - UpdateAsync<T>()      │  │
│                                    │              │  - GetSingleAsync<T>()   │  │
│                                    │              │  - GetAsync<T>()         │  │
│                                    │              └────────────┬─────────────┘  │
│                                    │                           │                │
│  ┌──────────────────┐              │                           ▼                │
│  │  SEARCH MODAL    │◄─────────────┤              ┌──────────────────────────┐  │
│  │  (Global Search) │              │              │     OLD API (Backend)    │  │
│  │                  │              │              │                          │  │
│  │  - TableID based │              │              │  [HttpPost] endpoints    │  │
│  │  - Lookups       │              │              │  InDataRequest<T> wrap   │  │
│  │  - NOT dropdowns │              │              │  Stored Procedures       │  │
│  └──────────────────┘              │              └──────────────────────────┘  │
│                                    │                                            │
│                                    ▼                                            │
│                           ┌──────────────────┐    ┌──────────────────────────┐  │
│                           │   APP-CORE.JS    │    │   OldApiDBConstants.cs   │  │
│                           │                  │    │                          │  │
│                           │ invokeController │    │  SP/FormId Constants     │  │
│                           │ Async (POST)     │    │  e.g., "p_GetXXX"        │  │
│                           │ getXsrfToken()   │    │       "ClientPersonal"   │  │
│                           └──────────────────┘    └──────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CRITICAL RULES

| Rule | Description |
|------|-------------|
| **ALL API calls use POST** | Never use GET for API operations - use `CreateAsync<T>()` |
| **Dropdowns use ViewData[]** | Loaded in Controller via `GetMultipleDropdownCodeOptionsAsync()` |
| **Lookups use SearchModal** | For searchable data like Client, Account, Officer |
| **Follow UI_STANDARDIZATION_CHEATSHEET.md** | Zero custom CSS, no inline styles |
| **Use OldApiService for new migrations** | Existing modules (Client 360, etc.) remain as-is |

---

## 3. FILE STRUCTURE

```
KAIRO-FULL-MVC/
├── kairo-ui/
│   ├── Controllers/
│   │   └── {ModuleName}/
│   │       └── {SubmoduleName}Controller.cs       ← MVC Controller
│   │
│   ├── Views/
│   │   └── {ModuleName}/
│   │       ├── Index.cshtml                       ← Main View
│   │       ├── _{Submodule1}.cshtml               ← Submodule Partial (prefix _)
│   │       └── _{Submodule2}.cshtml               ← Submodule Partial
│   │
│   ├── wwwroot/js/modules/{modulename}/
│   │       ├── {module-name}.js                   ← Main JS Module
│   │       ├── {submodule1}.js                    ← Submodule JS
│   │       └── {submodule2}.js                    ← Submodule JS
│   │
│   └── Services/
│       ├── OldApiService.cs                       ← Generic Old API Service
│       └── OldApiDBConstants.cs                   ← FormId/SP Constants
```

---

## 4. LAYER-BY-LAYER IMPLEMENTATION

### 4.1 LAYER 1: OldApiDBConstants.cs

**Location:** `kairo-ui/Services/OldApiDBConstants.cs`

```csharp
namespace kairo_ui.Services
{
    public static class OldApiDBConstants
    {
        // ═══════════════════════════════════════════════════════════════════
        // ACCOUNT MAINTENANCE MODULE
        // ═══════════════════════════════════════════════════════════════════
        
        public const string GETACCOUNTOFFICERDETAILS = "p_GetAccountOfficerDetail";
        public const string GETACCOUNTNOTES = "p_GetAccountNotes";
        public const string UPDATEACCOUNTNOTES = "p_UpdateAccountNotes";
        
        // Documents
        public const string GETACCOUNTDOCUMENTS = "AccountDocuments";
        public const string CREATEACCOUNTDOCUMENT = "AccountDocuments";
        public const string UPDATEACCOUNTDOCUMENT = "AccountDocuments";
        
        // ═══════════════════════════════════════════════════════════════════
        // ADD NEW MODULE CONSTANTS HERE
        // ═══════════════════════════════════════════════════════════════════
        
        // Pattern: {ACTION}{ENTITY} = "FormId or SP Name"
        // public const string GET{ENTITY} = "FormId";
        // public const string CREATE{ENTITY} = "FormId";
        // public const string UPDATE{ENTITY} = "FormId";
        // public const string DELETE{ENTITY} = "FormId";
    }
}
```

---

### 4.2 LAYER 2: Controller (kairo-ui)

**Location:** `kairo-ui/Controllers/{ModuleName}/{SubmoduleName}Controller.cs`

```csharp
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.{ModuleName}
{
    [Route("{ModuleName}/{SubmoduleName}")]
    public class {SubmoduleName}Controller : Controller
    {
        private readonly IAuthService _authService;
        private readonly IOldApiService _oldApiService;        // ← USE OldApiService
        private readonly IApiCachedService _apiCachedService;  // ← For cached dropdowns
        private readonly ILogger<{SubmoduleName}Controller> _logger;

        public {SubmoduleName}Controller(
            IAuthService authService,
            IOldApiService oldApiService,
            IApiCachedService apiCachedService,
            ILogger<{SubmoduleName}Controller> logger)
        {
            _authService = authService;
            _oldApiService = oldApiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // INDEX - Load View with Dropdowns
        // ═══════════════════════════════════════════════════════════════════
        
        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? entityId = null, string? requestId = null)
        {
            if (!_authService.IsAuthenticated()) 
                return RedirectToAction("Index", "Login");

            // Pass context to view
            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["EntityId"] = entityId ?? string.Empty;
            ViewData["RequestId"] = requestId ?? string.Empty;
            ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(entityId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

            try
            {
                // ═══════════════════════════════════════════════════════════
                // LOAD MULTIPLE DROPDOWNS IN ONE CACHED CALL
                // ═══════════════════════════════════════════════════════════
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "TitleID",
                    "GenderID",
                    "CountryID",
                    "StatusID"
                    // Add all dropdown TableIDs needed
                });

                // Extract and assign to ViewData
                dropdownOptions.TryGetValue("TitleID", out var titleOptions);
                dropdownOptions.TryGetValue("GenderID", out var genderOptions);
                dropdownOptions.TryGetValue("CountryID", out var countryOptions);
                dropdownOptions.TryGetValue("StatusID", out var statusOptions);

                ViewData["TitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["GenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["CountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["StatusOptions"] = statusOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options");
                ViewData["TitleOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["GenderOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["CountryOptions"] = Enumerable.Empty<SelectListItem>();
                ViewData["StatusOptions"] = Enumerable.Empty<SelectListItem>();
            }

            return PartialView("~/Views/{ModuleName}/_{SubmoduleName}.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // CRUD ENDPOINTS - ALL USE [HttpPost] AND CreateAsync
        // ═══════════════════════════════════════════════════════════════════

        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<ResponseDetail<EntityResponse>>(
                    "OldApiName",
                    OldApiDBConstants.GET{ENTITY},
                    requestData
                );

                if (result?.ResponseCode == "00")
                    return Ok(new { success = true, data = result.Details });
                
                return Ok(new { success = false, message = result?.ResponseMessage ?? "Not found" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting entity");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<ResponseDetail<EntityResponse>>(
                    "OldApiName",
                    OldApiDBConstants.CREATE{ENTITY},
                    requestData
                );

                if (result?.ResponseCode == "00")
                    return Ok(new { success = true, data = result.Details, message = "Created successfully" });
                
                return Ok(new { success = false, message = result?.ResponseMessage ?? "Create failed" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating entity");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<ResponseDetail<EntityResponse>>(
                    "OldApiName",
                    OldApiDBConstants.UPDATE{ENTITY},
                    requestData
                );

                if (result?.ResponseCode == "00")
                    return Ok(new { success = true, data = result.Details, message = "Updated successfully" });
                
                return Ok(new { success = false, message = result?.ResponseMessage ?? "Update failed" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating entity");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
                    "OldApiName",
                    OldApiDBConstants.DELETE{ENTITY},
                    requestData
                );

                if (result?.ResponseCode == "00")
                    return Ok(new { success = true, message = "Deleted successfully" });
                
                return Ok(new { success = false, message = result?.ResponseMessage ?? "Delete failed" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting entity");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST/RESPONSE DTOs
    // ═══════════════════════════════════════════════════════════════════
    
    public class CrudRequest
    {
        public string? ModuleID { get; set; }
        public string? EntityID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
        // Add fields from old implementation
    }

    public class EntityResponse
    {
        // Response fields matching SP output
    }
}
```

---

### 4.3 LAYER 3: Razor View (.cshtml)

**Location:** `kairo-ui/Views/{ModuleName}/_{SubmoduleName}.cshtml`

```html
@using Microsoft.AspNetCore.Mvc.Rendering
@{
    // ═══════════════════════════════════════════════════════════════════
    // GET DROPDOWN OPTIONS FROM VIEWDATA (loaded in Controller)
    // ═══════════════════════════════════════════════════════════════════
    var titleOptions = ViewData["TitleOptions"] as IEnumerable<SelectListItem> ?? Enumerable.Empty<SelectListItem>();
    var genderOptions = ViewData["GenderOptions"] as IEnumerable<SelectListItem> ?? Enumerable.Empty<SelectListItem>();
    var countryOptions = ViewData["CountryOptions"] as IEnumerable<SelectListItem> ?? Enumerable.Empty<SelectListItem>();
    var statusOptions = ViewData["StatusOptions"] as IEnumerable<SelectListItem> ?? Enumerable.Empty<SelectListItem>();
}

<div class="form-section" data-section="{submodule-name}">
    <div class="section-header" data-section-toggle>
        <span class="section-header__title">
            <i class="bi bi-{icon}"></i> {SECTION TITLE}
        </span>
        <button id="btn_toggle{Submodule}" type="button" class="section-toggle-btn" aria-expanded="true">
            <i class="bi bi-chevron-up"></i>
        </button>
    </div>
    <div class="section-content" data-section-content>
        <form id="frm_{submodule}" autocomplete="off" novalidate>
            <!-- Hidden fields for context -->
            <input type="hidden" id="moduleId_{submodule}" value="@ViewData["ModuleId"]" />
            <input type="hidden" id="entityId_{submodule}" value="@ViewData["EntityId"]" />

            <!-- ROW 1: Four Column Layout -->
            <div class="form-row four-col">
                
                <!-- DROPDOWN: Using asp-items from ViewData -->
                <div class="form-group">
                    <label class="label-blue" for="ddl_title">Title</label>
                    <select id="ddl_title" name="TitleID" class="bs-select" asp-items="@(titleOptions.Skip(1))">
                        <option value="">Select title</option>
                    </select>
                </div>
                
                <!-- TEXT INPUT -->
                <div class="form-group">
                    <label class="label-blue" for="txt_firstName">First Name</label>
                    <input id="txt_firstName" name="FirstName" type="text" class="bs-input-text" maxlength="50" />
                </div>
                
                <!-- DROPDOWN: Gender -->
                <div class="form-group">
                    <label class="label-blue" for="ddl_gender">Gender</label>
                    <select id="ddl_gender" name="GenderID" class="bs-select" asp-items="@(genderOptions.Skip(1))">
                        <option value="">Select gender</option>
                    </select>
                </div>
                
                <!-- DATE INPUT -->
                <div class="form-group">
                    <label class="label-blue" for="txt_dob">Date of Birth</label>
                    <input id="txt_dob" name="DateOfBirth" type="date" class="bs-input-text" />
                </div>
            </div>

            <!-- ROW 2: With Lookup Button (SearchModal) -->
            <div class="form-row four-col">
                
                <!-- LOOKUP FIELD (uses SearchModal - NOT dropdown) -->
                <div class="form-group">
                    <label class="label-blue" for="txt_accountOfficer">Account Officer</label>
                    <div class="kairo-control" data-kairo-control>
                        <input id="txt_accountOfficer" name="AccountOfficerName" type="text" class="bs-input-text" readonly />
                        <input id="hdn_accountOfficerId" name="AccountOfficerID" type="hidden" />
                        <button type="button" class="btn-lookup" data-lookup="AccountOfficer" aria-label="Search">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
                
                <!-- LOOKUP FIELD (Client Search) -->
                <div class="form-group">
                    <label class="label-blue" for="txt_clientName">Client</label>
                    <div class="kairo-control" data-kairo-control>
                        <input id="txt_clientName" name="ClientName" type="text" class="bs-input-text" readonly />
                        <input id="hdn_clientId" name="ClientID" type="hidden" />
                        <button type="button" class="btn-lookup" data-lookup="ClientID" aria-label="Search">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
                
                <!-- READONLY FIELD -->
                <div class="form-group">
                    <label class="label-blue" for="txt_status">Status</label>
                    <input id="txt_status" name="Status" type="text" class="bs-input-text" readonly data-always-readonly />
                </div>
                
                <!-- CHECKBOX -->
                <div class="form-group">
                    <label class="label-blue" for="chk_active">Active</label>
                    <input id="chk_active" name="IsActive" type="checkbox" class="bs-checkbox" />
                </div>
            </div>

            <!-- ROW 3: Two Column Layout -->
            <div class="form-row two-col">
                <!-- TEXTAREA -->
                <div class="form-group">
                    <label class="label-blue" for="txt_remarks">Remarks</label>
                    <textarea id="txt_remarks" name="Remarks" class="bs-textarea" rows="3" maxlength="500"></textarea>
                </div>
                
                <div class="form-group">
                    <label class="label-blue" for="txt_notes">Notes</label>
                    <textarea id="txt_notes" name="Notes" class="bs-textarea" rows="3" maxlength="500"></textarea>
                </div>
            </div>

        </form>
    </div>
</div>

<!-- Load submodule JavaScript -->
<script src="~/js/modules/{modulename}/{submodule}.js"></script>
```

---

### 4.4 LAYER 4: JavaScript Module (.js)

**Location:** `kairo-ui/wwwroot/js/modules/{modulename}/{submodule}.js`

```javascript
/**
 * {Submodule Name} Module
 * Migrated from legacy implementation
 */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    const state = {
        currentId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',    // VIEW, EDIT, NEW
        isDirty: false,
        moduleId: null
    };

    // SearchModal instance
    let searchModal = null;

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP CONFIGURATION (for SearchModal - NOT dropdowns)
    // ═══════════════════════════════════════════════════════════════════
    
    const LOOKUP_CONFIG = {
        'AccountOfficer': {
            tableID: 'AccountOfficerID',
            displayField: 'txt_accountOfficer',
            valueField: 'hdn_accountOfficerId',
            displayColumn: 'OfficerName',
            valueColumn: 'OfficerID',
            whereStmt: ''
        },
        'ClientID': {
            tableID: 'ClientID',
            displayField: 'txt_clientName',
            valueField: 'hdn_clientId',
            displayColumn: 'ClientName',
            valueColumn: 'ClientID',
            whereStmt: ''
        }
        // Add more lookups as needed
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════
    
    function init() {
        console.log('🚀 Initializing {Submodule} module...');
        
        loadContext();
        searchModal = new SearchModal(window.AppCore);
        
        wireSectionToggles();
        wireLookupButtons();
        wireFormEvents();
        
        console.log('✅ {Submodule} module initialized');
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTEXT LOADING
    // ═══════════════════════════════════════════════════════════════════
    
    function loadContext() {
        state.moduleId = document.getElementById('moduleId_{submodule}')?.value || '100';
        state.branchId = sessionStorage.getItem('branch_code') || sessionStorage.getItem('OurBranchID');
        state.operatorId = sessionStorage.getItem('user_name') || sessionStorage.getItem('OperatorID');
        
        console.log('📦 Context loaded:', state);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION TOGGLES
    // ═══════════════════════════════════════════════════════════════════
    
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');
                
                if (content) {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? '' : 'none';
                    if (icon) {
                        icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                    }
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP BUTTONS (SearchModal Integration)
    // ═══════════════════════════════════════════════════════════════════
    
    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lookupKey = btn.getAttribute('data-lookup');
                openLookup(lookupKey);
            });
        });
    }

    function openLookup(lookupKey) {
        const config = LOOKUP_CONFIG[lookupKey];
        if (!config) {
            console.error('Lookup config not found:', lookupKey);
            return;
        }

        searchModal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            whereStmt: config.whereStmt || '',
            ourbranchId: state.branchId,
            onSelect: (row) => {
                console.log('[Lookup] Selected:', row);
                
                const displayField = document.getElementById(config.displayField);
                if (displayField) {
                    displayField.value = row[config.displayColumn] || Object.values(row)[1] || '';
                }
                
                const valueField = document.getElementById(config.valueField);
                if (valueField) {
                    valueField.value = row[config.valueColumn] || Object.values(row)[0] || '';
                }
                
                state.isDirty = true;
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    function wireFormEvents() {
        const form = document.getElementById('frm_{submodule}');
        form?.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('change', () => {
                if (state.currentMode !== 'VIEW') {
                    state.isDirty = true;
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // CRUD OPERATIONS - ALL USE invokeControllerAsync (POST)
    // ═══════════════════════════════════════════════════════════════════
    
    async function loadRecord(id) {
        showLoading(true);
        
        try {
            // ALL API calls use POST via invokeControllerAsync
            const response = await AppCore.invokeControllerAsync('{ModuleName}/{SubmoduleName}/get', {
                EntityID: id,
                ModuleID: state.moduleId,
                OurBranchID: state.branchId
            });
            
            if (response?.success && response.data) {
                populateForm(response.data);
                state.currentId = id;
                showSuccess('Record loaded');
            } else {
                showError(response?.message || 'Failed to load record');
            }
        } catch (error) {
            console.error('Load error:', error);
            showError('Error loading record: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function saveRecord() {
        if (!validateForm()) {
            showError('Please correct the errors before saving');
            return;
        }

        const formData = captureFormData();
        showLoading(true);
        
        try {
            const endpoint = state.currentMode === 'NEW' 
                ? '{ModuleName}/{SubmoduleName}/create'
                : '{ModuleName}/{SubmoduleName}/update';
            
            const response = await AppCore.invokeControllerAsync(endpoint, formData);
            
            if (response?.success) {
                showSuccess(state.currentMode === 'NEW' ? 'Created successfully' : 'Updated successfully');
                state.isDirty = false;
                setMode('VIEW');
                
                if (response.data?.EntityID) {
                    state.currentId = response.data.EntityID;
                }
            } else {
                showError(response?.message || 'Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            showError('Error saving: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function deleteRecord() {
        if (!state.currentId) {
            showWarning('Please select a record first');
            return;
        }

        if (!confirm('Are you sure you want to delete this record?')) {
            return;
        }

        showLoading(true);
        
        try {
            const response = await AppCore.invokeControllerAsync('{ModuleName}/{SubmoduleName}/delete', {
                EntityID: state.currentId,
                ModuleID: state.moduleId
            });
            
            if (response?.success) {
                showSuccess('Deleted successfully');
                clearForm();
                state.currentId = null;
            } else {
                showError(response?.message || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showError('Error deleting: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM DATA OPERATIONS
    // ═══════════════════════════════════════════════════════════════════
    
    function populateForm(data) {
        const form = document.getElementById('frm_{submodule}');
        if (!form) return;

        // Map API response to form fields (use same names as old implementation)
        form.querySelector('[name="TitleID"]').value = data.TitleID || '';
        form.querySelector('[name="FirstName"]').value = data.FirstName || '';
        form.querySelector('[name="GenderID"]').value = data.GenderID || '';
        form.querySelector('[name="DateOfBirth"]').value = formatDateForInput(data.DateOfBirth);
        
        // Lookup fields
        document.getElementById('txt_accountOfficer').value = data.AccountOfficerName || '';
        document.getElementById('hdn_accountOfficerId').value = data.AccountOfficerID || '';
        
        document.getElementById('txt_clientName').value = data.ClientName || '';
        document.getElementById('hdn_clientId').value = data.ClientID || '';
        
        // Continue mapping all fields...
        
        state.isDirty = false;
    }

    function captureFormData() {
        const form = document.getElementById('frm_{submodule}');
        const formData = new FormData(form);
        
        const data = {
            EntityID: state.currentId,
            ModuleID: state.moduleId,
            OurBranchID: state.branchId,
            OperatorID: state.operatorId
        };
        
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        return data;
    }

    function clearForm() {
        const form = document.getElementById('frm_{submodule}');
        form?.reset();
        
        // Clear hidden lookup fields
        document.querySelectorAll('input[type="hidden"]').forEach(field => {
            if (!field.id.includes('moduleId') && !field.id.includes('entityId')) {
                field.value = '';
            }
        });
        
        state.isDirty = false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // VALIDATION (Migrate from old implementation)
    // ═══════════════════════════════════════════════════════════════════
    
    function validateForm() {
        let isValid = true;
        const errors = [];
        
        // Clear previous validation states
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
        
        // Required field validation (copy from old implementation)
        const firstName = document.querySelector('[name="FirstName"]');
        if (!firstName?.value?.trim()) {
            errors.push('First Name is required');
            firstName?.classList.add('is-invalid');
            isValid = false;
        }
        
        // Add more validations from old code...
        
        if (errors.length > 0) {
            showError(errors.join('\n'));
        }
        
        return isValid;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    function setMode(mode) {
        state.currentMode = mode;
        
        const isViewMode = mode === 'VIEW';
        const form = document.getElementById('frm_{submodule}');
        
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            if (!field.hasAttribute('data-always-readonly')) {
                field.readOnly = isViewMode;
                field.disabled = isViewMode;
            }
        });
        
        form?.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.disabled = isViewMode;
        });
        
        console.log(`📝 Mode: ${mode}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════════
    
    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showSuccess(message) {
        AppCore.showToastMessage?.(message, 'success') || console.log('✅', message);
    }

    function showError(message) {
        AppCore.showToastMessage?.(message, 'error') || console.error('❌', message);
    }

    function showWarning(message) {
        AppCore.showToastMessage?.(message, 'warning') || console.warn('⚠️', message);
    }

    function formatDateForInput(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return '';
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPOSE PUBLIC API
    // ═══════════════════════════════════════════════════════════════════
    
    window.{Submodule}Module = {
        init,
        loadRecord,
        saveRecord,
        deleteRecord,
        setMode,
        clearForm,
        getState: () => ({ ...state })
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ {Submodule} module loaded');
})();
```

---

## 5. CRITICAL PATTERNS REFERENCE

### 5.1 API Call Pattern (ALL POST)

```javascript
// ═══════════════════════════════════════════════════════════════════
// ALL API CALLS USE invokeControllerAsync (POST METHOD)
// ═══════════════════════════════════════════════════════════════════

// GET (uses POST)
const response = await AppCore.invokeControllerAsync('ModuleName/SubmoduleName/get', {
    EntityID: id,
    ModuleID: moduleId,
    OurBranchID: branchId
});

// CREATE (uses POST)
const response = await AppCore.invokeControllerAsync('ModuleName/SubmoduleName/create', formData);

// UPDATE (uses POST)
const response = await AppCore.invokeControllerAsync('ModuleName/SubmoduleName/update', formData);

// DELETE (uses POST)
const response = await AppCore.invokeControllerAsync('ModuleName/SubmoduleName/delete', { EntityID: id });
```

### 5.2 Controller → OldApiService Pattern

```csharp
// ═══════════════════════════════════════════════════════════════════
// ALL OPERATIONS USE CreateAsync (POST TO OLD API)
// ═══════════════════════════════════════════════════════════════════

// GET - Uses CreateAsync (POST)
var result = await _oldApiService.CreateAsync<ResponseDetail<EntityResponse>>(
    "OldApiName",
    OldApiDBConstants.GET{ENTITY},
    requestData
);

// CREATE - Uses CreateAsync (POST)
var result = await _oldApiService.CreateAsync<ResponseDetail<EntityResponse>>(
    "OldApiName",
    OldApiDBConstants.CREATE{ENTITY},
    requestData
);

// UPDATE - Uses CreateAsync (POST)
var result = await _oldApiService.CreateAsync<ResponseDetail<EntityResponse>>(
    "OldApiName",
    OldApiDBConstants.UPDATE{ENTITY},
    requestData
);

// DELETE - Uses CreateAsync (POST)
var result = await _oldApiService.CreateAsync<ResponseDetail<object>>(
    "OldApiName",
    OldApiDBConstants.DELETE{ENTITY},
    requestData
);
```

### 5.3 Dropdown Loading Pattern

```csharp
// ═══════════════════════════════════════════════════════════════════
// CONTROLLER: Load multiple dropdowns in ONE cached call
// ═══════════════════════════════════════════════════════════════════

[HttpGet, Route("Index")]
public async Task<IActionResult> Index()
{
    // Single call to get all dropdown options (cached)
    var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
    {
        "TitleID",           // Dropdown TableID from database
        "GenderID",
        "CountryID",
        "StatusID"
    });

    // Extract and assign to ViewData
    dropdownOptions.TryGetValue("TitleID", out var titleOptions);
    dropdownOptions.TryGetValue("GenderID", out var genderOptions);
    
    ViewData["TitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
    ViewData["GenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
    
    return PartialView("~/Views/ModuleName/_Submodule.cshtml");
}
```

```html
<!-- ═══════════════════════════════════════════════════════════════════ -->
<!-- RAZOR VIEW: Render dropdown with asp-items                         -->
<!-- ═══════════════════════════════════════════════════════════════════ -->

@{
    var titleOptions = ViewData["TitleOptions"] as IEnumerable<SelectListItem> 
        ?? Enumerable.Empty<SelectListItem>();
}

<!-- Skip(1) removes first placeholder from cached list -->
<select id="ddl_title" name="TitleID" class="bs-select" asp-items="@(titleOptions.Skip(1))">
    <option value="">Select title</option>
</select>
```

### 5.4 Lookup Pattern (SearchModal)

```html
<!-- RAZOR VIEW: Lookup field with button -->
<div class="kairo-control" data-kairo-control>
    <input id="txt_accountOfficer" name="AccountOfficerName" class="bs-input-text" readonly />
    <input id="hdn_accountOfficerId" name="AccountOfficerID" type="hidden" />
    <button type="button" class="btn-lookup" data-lookup="AccountOfficer">
        <i class="bi bi-search"></i>
    </button>
</div>
```

```javascript
// JAVASCRIPT: Configure and wire lookup
const LOOKUP_CONFIG = {
    'AccountOfficer': {
        tableID: 'AccountOfficerID',      // TableID from database
        displayField: 'txt_accountOfficer',
        valueField: 'hdn_accountOfficerId',
        displayColumn: 'OfficerName',
        valueColumn: 'OfficerID'
    }
};

// Wire button
document.querySelector('[data-lookup="AccountOfficer"]').addEventListener('click', () => {
    searchModal.open({
        tableID: 'AccountOfficerID',
        moduleID: state.moduleId,
        onSelect: (row) => {
            document.getElementById('txt_accountOfficer').value = row.OfficerName;
            document.getElementById('hdn_accountOfficerId').value = row.OfficerID;
        }
    });
});
```

---

## 6. DROPDOWN vs LOOKUP

| Use Case | Component | How |
|----------|-----------|-----|
| **Small static list** (Title, Gender, Status) | **Dropdown** | `GetMultipleDropdownCodeOptionsAsync()` → `ViewData[]` → `asp-items` |
| **Large searchable data** (Client, Account) | **Lookup** | `SearchModal.open({ tableID: '...' })` |
| **Cascading selection** | **Both** | Dropdown for parent, Lookup with `whereStmt` for child |

---

## 7. MIGRATION CHECKLIST

### Pre-Migration Analysis
- [ ] Locate old module in legacy project
- [ ] Document ALL API endpoints in old JS files
- [ ] Identify FormId/SP names for each endpoint
- [ ] List all form fields and their IDs/names
- [ ] Document all validations
- [ ] Identify dropdowns vs lookups
- [ ] List all dropdown TableIDs needed

### OldApiDBConstants.cs
- [ ] Add FormId/SP constants for GET
- [ ] Add FormId/SP constants for CREATE
- [ ] Add FormId/SP constants for UPDATE
- [ ] Add FormId/SP constants for DELETE
- [ ] Group by module with comments

### Controller (kairo-ui)
- [ ] Create controller in `Controllers/{ModuleName}/`
- [ ] Inject `IOldApiService` and `IApiCachedService`
- [ ] Add `[HttpGet] Index()` action
- [ ] Load dropdowns via `GetMultipleDropdownCodeOptionsAsync()`
- [ ] Extract each dropdown with `TryGetValue()`
- [ ] Assign to `ViewData[]` with fallback
- [ ] Create `[HttpPost]` CRUD endpoints using `CreateAsync<T>()`
- [ ] Add request/response DTOs

### Razor View
- [ ] Create view following `UI_STANDARDIZATION_CHEATSHEET.md`
- [ ] Get dropdown options from `ViewData[]` at top
- [ ] Use `asp-items="@(options.Skip(1))"` for dropdowns
- [ ] Add default `<option value="">`
- [ ] Add lookup buttons with `data-lookup` attribute
- [ ] Add hidden fields for lookup values
- [ ] Add module JS reference at bottom

### JavaScript Module
- [ ] Initialize `SearchModal` instance
- [ ] Configure `LOOKUP_CONFIG` for each lookup
- [ ] Wire lookup buttons to `searchModal.open()`
- [ ] Use `AppCore.invokeControllerAsync()` for ALL API calls
- [ ] Migrate validations from old code
- [ ] Expose module on `window` object

### Testing
- [ ] Test dropdown loading
- [ ] Test all lookups (SearchModal)
- [ ] Test GET operation
- [ ] Test CREATE operation
- [ ] Test UPDATE operation
- [ ] Test DELETE operation
- [ ] Test form validations
- [ ] Test dirty state tracking

---

## 8. EXTRACTING FORMID/SP NAMES

When examining old JavaScript files:

```javascript
// OLD CODE - Look for API endpoint paths
$.ajax({
    url: '/api/v1/ClientMaintenance/GetClientBasicDetails',
    type: 'POST'
});

// → FormId: "ClientBasicDetails" or "GetClientBasicDetails"
// → Add: OldApiDBConstants.GETCLIENTBASICDETAILS = "ClientBasicDetails"
```

```javascript
// OLD CODE - Look for action names
fetch('/api/v1/AccountsMaintenance/EditAccountNotes', {
    method: 'POST'
});

// → FormId: "AccountNotes" or "EditAccountNotes"
// → Add: OldApiDBConstants.UPDATEACCOUNTNOTES = "AccountNotes"
```

---

## 9. COMMON ISSUES & SOLUTIONS

| Issue | Solution |
|-------|----------|
| Dropdowns empty | Check TableID in `GetMultipleDropdownCodeOptionsAsync()` |
| Lookup not opening | Verify `data-lookup` matches `LOOKUP_CONFIG` key |
| API returns 401 | Check `_authService.IsAuthenticated()` |
| Form fields readonly | Check `setMode()` is being called |
| XSRF error | Add `@Html.AntiForgeryToken()` form in parent view |
| Save fails | Verify `CreateAsync<T>()` is used (not `GetAsync`) |

---

**Document Version:** 2.1  
**Last Updated:** March 5, 2026  
**Created By:** Migration Team
