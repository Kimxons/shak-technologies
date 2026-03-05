# 📋 KAIRO MODULE CHEAT SHEET - ApiService Pattern
## For Wiring Modules Using IApiService

> **Last Updated:** March 5, 2026  
> **Purpose:** Complete guide for wiring modules using `IApiService` pattern

---

## 1. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        KAIRO MVC - ApiService PATTERN                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────────┐ │
│  │   RAZOR VIEW     │     │   JAVASCRIPT     │     │  KAIRO-UI CONTROLLER     │ │
│  │   (.cshtml)      │◄───►│   MODULE (.js)   │◄───►│  (Controller.cs)         │ │
│  │                  │     │                  │     │                          │ │
│  │  - UI Layout     │     │  - State Mgmt    │     │  - Route Endpoints       │ │
│  │  - Form Fields   │     │  - SearchModal   │     │  - Auth Check            │ │
│  │  - Dropdowns via │     │  - API Calls     │     │  - Call IApiService      │ │
│  │    ViewData[]    │     │  - Validation    │     │    (proper HTTP verbs)   │ │
│  └──────────────────┘     └──────────────────┘     └────────────┬─────────────┘ │
│                                    │                            │               │
│                                    │                            ▼               │
│                                    │              ┌──────────────────────────┐  │
│                                    │              │      API SERVICE         │  │
│                                    │              │    (ApiService.cs)       │  │
│                                    │              │                          │  │
│                                    │              │  HTTP METHODS:           │  │
│                                    │              │  - GetAsync<T>() → GET   │  │
│                                    │              │  - CreateAsync<T>()→POST │  │
│                                    │              │  - UpdateAsync<T>()→PUT  │  │
│                                    │              │  - DeleteAsync() →DELETE │  │
│                                    │              └────────────┬─────────────┘  │
│                                    │                           │                │
│  ┌──────────────────┐              │                           ▼                │
│  │  SEARCH MODAL    │◄─────────────┤              ┌──────────────────────────┐  │
│  │  (Global Search) │              │              │   BACKEND API PROJECT    │  │
│  │                  │              │              │  (AccountManagement,     │  │
│  │  - TableID based │              │              │   ClientManagement, etc) │  │
│  │  - Lookups       │              │              │                          │  │
│  │  - NOT dropdowns │              │              │  Standard REST endpoints │  │
│  └──────────────────┘              │              └──────────────────────────┘  │
│                                    │                                            │
│                                    ▼                                            │
│                           ┌──────────────────┐    ┌──────────────────────────┐  │
│                           │   APP-CORE.JS    │    │   ApiEndpoints.cs        │  │
│                           │                  │    │                          │  │
│                           │ invokeController │    │  Endpoint Constants      │  │
│                           │ Async (POST)     │    │  e.g., "api/v1/Client"   │  │
│                           │ getXsrfToken()   │    │       "api/v1/Account"   │  │
│                           └──────────────────┘    └──────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CRITICAL RULES

| Rule | Description |
|------|-------------|
| **Use IApiService** | Inject `IApiService` in controller constructor |
| **Proper HTTP Verbs** | GET for read, POST for create, PUT for update, DELETE for remove |
| **Dropdowns via ViewData[]** | Load via `GetMultipleDropdownCodeOptionsAsync()` |
| **Lookups via SearchModal** | For large searchable data (Client, Account, etc.) |
| **Endpoint Constants** | Define in `ApiEndpoints.cs` |
| **Request Wrapper** | Automatic `InDataRequest<T>` wrapping by ApiService |

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
│   │       └── _{Submodule}.cshtml                ← Submodule Partial
│   │
│   ├── wwwroot/js/modules/{modulename}/
│   │       └── {submodule}.js                     ← JS Module
│   │
│   └── Services/
│       ├── ApiService.cs                          ← Generic API Service
│       └── ApiEndpoints.cs                        ← Endpoint Constants
│
├── AccountManagement/                             ← Backend API Project
│   └── Modules/AccountMaintenance/
│       └── AccountMaintenanceController.cs
│
├── ClientManagement/                              ← Backend API Project
│   └── Modules/ClientMaintenance/
│       └── ClientMaintenanceController.cs
```

---

## 4. LAYER-BY-LAYER IMPLEMENTATION

### 4.1 LAYER 1: ApiEndpoints.cs

**Location:** `kairo-ui/Services/ApiEndpoints.cs`

```csharp
namespace kairo_ui.Services
{
    public static class ApiEndpoints
    {
        // ═══════════════════════════════════════════════════════════════════
        // CLIENT MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════
        
        public const string GET_CLIENT_INDIVIDUAL = "api/v1/ClientMaintenance/GetClientIndividual";
        public const string CREATE_CLIENT_INDIVIDUAL = "api/v1/ClientMaintenance/CreateClientIndividual";
        public const string EDIT_CLIENT_INDIVIDUAL = "api/v1/ClientMaintenance/EditClientIndividual";
        public const string DELETE_CLIENT_INDIVIDUAL = "api/v1/ClientMaintenance/DeleteClientIndividual";
        
        // ═══════════════════════════════════════════════════════════════════
        // ACCOUNT MANAGEMENT
        // ═══════════════════════════════════════════════════════════════════
        
        public const string GET_ACCOUNT_DETAILS = "api/v1/AccountMaintenance/GetAccountDetails";
        public const string CREATE_ACCOUNT = "api/v1/AccountMaintenance/CreateAccount";
        public const string EDIT_ACCOUNT = "api/v1/AccountMaintenance/EditAccount";
        public const string DELETE_ACCOUNT = "api/v1/AccountMaintenance/DeleteAccount";
        
        // Pattern: {ACTION}_{ENTITY} = "api/v1/{Module}/{Action}{Entity}"
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
        private readonly IApiService _apiService;              // ← USE IApiService
        private readonly IApiCachedService _apiCachedService;
        private readonly ILogger<{SubmoduleName}Controller> _logger;

        public {SubmoduleName}Controller(
            IAuthService authService,
            IApiService apiService,                            // ← INJECT IApiService
            IApiCachedService apiCachedService,
            ILogger<{SubmoduleName}Controller> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _logger = logger;
        }

        // ═══════════════════════════════════════════════════════════════════
        // INDEX - Load View with Dropdowns
        // ═══════════════════════════════════════════════════════════════════
        
        [HttpGet]
        [Route("Index")]
        public async Task<IActionResult> Index(string? moduleId = null, string? entityId = null)
        {
            if (!_authService.IsAuthenticated()) 
                return RedirectToAction("Index", "Login");

            ViewData["ModuleId"] = moduleId ?? string.Empty;
            ViewData["EntityId"] = entityId ?? string.Empty;

            try
            {
                // Load multiple dropdowns in one cached call
                var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
                {
                    "TitleID",
                    "GenderID",
                    "StatusID"
                });

                dropdownOptions.TryGetValue("TitleID", out var titleOptions);
                dropdownOptions.TryGetValue("GenderID", out var genderOptions);
                dropdownOptions.TryGetValue("StatusID", out var statusOptions);

                ViewData["TitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["GenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
                ViewData["StatusOptions"] = statusOptions ?? Enumerable.Empty<SelectListItem>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dropdown options");
            }

            return PartialView("~/Views/{ModuleName}/_{SubmoduleName}.cshtml");
        }

        // ═══════════════════════════════════════════════════════════════════
        // CRUD ENDPOINTS - USES PROPER HTTP METHODS
        // ═══════════════════════════════════════════════════════════════════

        #region GET Operations (Uses HTTP GET)

        /// <summary>
        /// Get single record - Uses GetSingleAsync (HTTP GET)
        /// </summary>
        [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                // GetSingleAsync uses HTTP GET with query parameters
                var result = await _apiService.GetSingleAsync<ResponseDetail<EntityResponse>>(
                    "BackendApiName",                          // ← API client name from appsettings
                    ApiEndpoints.GET_{ENTITY},                 // ← Endpoint from constants
                    new KeyValuePair<string, object>("EntityID", requestData.EntityID),
                    new KeyValuePair<string, object>("ModuleID", requestData.ModuleID)
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

        #endregion

        #region CREATE Operations (Uses HTTP POST)

        /// <summary>
        /// Create record - Uses CreateAsync (HTTP POST)
        /// </summary>
        [HttpPost, Route("create")]
        public async Task<IActionResult> Create([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                // CreateAsync uses HTTP POST
                var result = await _apiService.CreateAsync<ResponseDetail<EntityResponse>>(
                    "BackendApiName",
                    ApiEndpoints.CREATE_{ENTITY},
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

        #endregion

        #region UPDATE Operations (Uses HTTP PUT)

        /// <summary>
        /// Update record - Uses UpdateAsync (HTTP PUT)
        /// </summary>
        [HttpPost, Route("update")]
        public async Task<IActionResult> Update([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                // UpdateAsync uses HTTP PUT
                var result = await _apiService.UpdateAsync<ResponseDetail<EntityResponse>>(
                    "BackendApiName",
                    ApiEndpoints.EDIT_{ENTITY},
                    requestData.Id,                            // ← ID for PUT endpoint
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

        #endregion

        #region DELETE Operations (Uses HTTP DELETE)

        /// <summary>
        /// Delete record - Uses DeleteAsync (HTTP DELETE)
        /// </summary>
        [HttpPost, Route("delete")]
        public async Task<IActionResult> Delete([FromBody] CrudRequest requestData)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                // DeleteAsync uses HTTP DELETE
                await _apiService.DeleteAsync(
                    "BackendApiName",
                    ApiEndpoints.DELETE_{ENTITY},
                    requestData.Id
                );

                return Ok(new { success = true, message = "Deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting entity");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        #endregion
    }

    // ═══════════════════════════════════════════════════════════════════
    // REQUEST/RESPONSE DTOs
    // ═══════════════════════════════════════════════════════════════════
    
    public class CrudRequest
    {
        public int Id { get; set; }
        public string? ModuleID { get; set; }
        public string? EntityID { get; set; }
        public string? OurBranchID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class EntityResponse
    {
        // Response fields
    }
}
```

---

### 4.3 Alternate Pattern: ProxyRequestAsync (Simpler)

For simpler controller endpoint implementation, use `ProxyRequestAsync` from base controller:

```csharp
[Route("{ModuleName}/{SubmoduleName}")]
public class {SubmoduleName}Controller : ControllerBase  // Or your base controller
{
    [HttpPost, Route("get")]
    public async Task<IActionResult> Get([FromBody] CrudRequest requestData) 
        => await ProxyRequestAsync(
            "BackendApiName",                      // API client name
            ApiEndpoints.GET_{ENTITY},             // Endpoint constant
            requestData,                           // Request body
            "module.submodule.get",                // Log context
            requestData?.ModuleID                  // Module ID for logging
        );

    [HttpPost, Route("create")]
    public async Task<IActionResult> Create([FromBody] CrudRequest requestData) 
        => await ProxyRequestAsync("BackendApiName", ApiEndpoints.CREATE_{ENTITY}, requestData, "module.submodule.create", requestData?.ModuleID);

    [HttpPost, Route("update")]
    public async Task<IActionResult> Update([FromBody] CrudRequest requestData) 
        => await ProxyRequestAsync("BackendApiName", ApiEndpoints.EDIT_{ENTITY}, requestData, "module.submodule.update", requestData?.ModuleID);

    [HttpPost, Route("delete")]
    public async Task<IActionResult> Delete([FromBody] CrudRequest requestData) 
        => await ProxyRequestAsync("BackendApiName", ApiEndpoints.DELETE_{ENTITY}, requestData, "module.submodule.delete", requestData?.ModuleID);
}
```

---

### 4.4 LAYER 3: Razor View (.cshtml)

**Location:** `kairo-ui/Views/{ModuleName}/_{SubmoduleName}.cshtml`

```html
@using Microsoft.AspNetCore.Mvc.Rendering
@{
    var titleOptions = ViewData["TitleOptions"] as IEnumerable<SelectListItem> ?? Enumerable.Empty<SelectListItem>();
    var genderOptions = ViewData["GenderOptions"] as IEnumerable<SelectListItem> ?? Enumerable.Empty<SelectListItem>();
}

<div class="form-section" data-section="{submodule-name}">
    <div class="section-header" data-section-toggle>
        <span class="section-header__title"><i class="bi bi-{icon}"></i> {SECTION TITLE}</span>
        <button type="button" class="section-toggle-btn"><i class="bi bi-chevron-up"></i></button>
    </div>
    <div class="section-content" data-section-content>
        <form id="frm_{submodule}" autocomplete="off" novalidate>
            <input type="hidden" id="moduleId_{submodule}" value="@ViewData["ModuleId"]" />

            <div class="form-row four-col">
                <!-- DROPDOWN -->
                <div class="form-group">
                    <label class="label-blue" for="ddl_title">Title</label>
                    <select id="ddl_title" name="TitleID" class="bs-select" asp-items="@(titleOptions.Skip(1))">
                        <option value="">Select title</option>
                    </select>
                </div>
                
                <!-- LOOKUP (SearchModal) -->
                <div class="form-group">
                    <label class="label-blue" for="txt_client">Client</label>
                    <div class="kairo-control" data-kairo-control>
                        <input id="txt_client" name="ClientName" class="bs-input-text" readonly />
                        <input id="hdn_clientId" name="ClientID" type="hidden" />
                        <button type="button" class="btn-lookup" data-lookup="ClientID">
                            <i class="bi bi-search"></i>
                        </button>
                    </div>
                </div>
            </div>
        </form>
    </div>
</div>

<script src="~/js/modules/{modulename}/{submodule}.js"></script>
```

---

### 4.5 LAYER 4: JavaScript Module (.js)

**Location:** `kairo-ui/wwwroot/js/modules/{modulename}/{submodule}.js`

```javascript
(function () {
    'use strict';

    const state = {
        currentId: null,
        moduleId: null,
        branchId: null,
        currentMode: 'VIEW',
        isDirty: false
    };

    let searchModal = null;

    const LOOKUP_CONFIG = {
        'ClientID': {
            tableID: 'ClientID',
            displayField: 'txt_client',
            valueField: 'hdn_clientId',
            displayColumn: 'ClientName',
            valueColumn: 'ClientID'
        }
    };

    function init() {
        loadContext();
        searchModal = new SearchModal(window.AppCore);
        wireSectionToggles();
        wireLookupButtons();
        wireFormEvents();
    }

    // ═══════════════════════════════════════════════════════════════════
    // CRUD - ALL USE invokeControllerAsync (POST to kairo-ui controller)
    // The kairo-ui controller then uses proper HTTP methods to backend
    // ═══════════════════════════════════════════════════════════════════

    async function loadRecord(id) {
        const response = await AppCore.invokeControllerAsync('{ModuleName}/{SubmoduleName}/get', {
            EntityID: id,
            ModuleID: state.moduleId
        });
        
        if (response?.success) {
            populateForm(response.data);
        }
    }

    async function saveRecord() {
        const formData = captureFormData();
        const endpoint = state.currentMode === 'NEW' 
            ? '{ModuleName}/{SubmoduleName}/create'
            : '{ModuleName}/{SubmoduleName}/update';
        
        const response = await AppCore.invokeControllerAsync(endpoint, formData);
        // Handle response...
    }

    async function deleteRecord() {
        const response = await AppCore.invokeControllerAsync('{ModuleName}/{SubmoduleName}/delete', {
            Id: state.currentId
        });
        
        if (response?.success) {
            showSuccess('Deleted successfully');
            clearForm();
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function loadContext() {
        state.moduleId = document.getElementById('moduleId_{submodule}')?.value || '';
        state.branchId = sessionStorage.getItem('branch_code');
    }

    function populateForm(data) {
        const form = document.getElementById('frm_{submodule}');
        form.querySelector('[name="TitleID"]').value = data.TitleID || '';
        // Map all fields...
        state.isDirty = false;
    }

    function captureFormData() {
        const form = document.getElementById('frm_{submodule}');
        const formData = new FormData(form);
        const data = { ModuleID: state.moduleId };
        formData.forEach((value, key) => data[key] = value);
        return data;
    }

    function clearForm() {
        document.getElementById('frm_{submodule}')?.reset();
        state.isDirty = false;
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.closest('.form-section')?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');
                if (content) {
                    content.style.display = content.style.display === 'none' ? '' : 'none';
                    icon.className = content.style.display === 'none' ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
                }
            });
        });
    }

    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.addEventListener('click', () => openLookup(btn.getAttribute('data-lookup')));
        });
    }

    function openLookup(lookupKey) {
        const config = LOOKUP_CONFIG[lookupKey];
        if (!config) return;
        
        searchModal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            onSelect: (row) => {
                document.getElementById(config.displayField).value = row[config.displayColumn] || '';
                document.getElementById(config.valueField).value = row[config.valueColumn] || '';
                state.isDirty = true;
            }
        });
    }

    function wireFormEvents() {
        document.querySelectorAll('#frm_{submodule} input, select, textarea').forEach(el => {
            el.addEventListener('change', () => state.isDirty = true);
        });
    }

    function showSuccess(msg) { AppCore.showToastMessage?.(msg, 'success'); }
    function showError(msg) { AppCore.showToastMessage?.(msg, 'error'); }

    // ═══════════════════════════════════════════════════════════════════
    // EXPOSE MODULE
    // ═══════════════════════════════════════════════════════════════════

    window.{Submodule}Module = { init, loadRecord, saveRecord, deleteRecord };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
```

---

## 5. CRITICAL PATTERNS REFERENCE

### 5.1 ApiService Methods & HTTP Verbs

| Method | HTTP Verb | Usage |
|--------|-----------|-------|
| `GetAsync<T>()` | GET | Fetch list of items with query params |
| `GetSingleAsync<T>()` | GET | Fetch single item with query params |
| `GetByIdAsync<T>()` | GET | Fetch single item by ID in URL |
| `CreateAsync<T>()` | POST | Create new record |
| `UpdateAsync<T>()` | PUT | Update existing record |
| `DeleteAsync()` | DELETE | Delete record by ID |

### 5.2 Controller → ApiService Pattern

```csharp
// ═══════════════════════════════════════════════════════════════════
// GET - Uses GetSingleAsync (HTTP GET with query params)
// ═══════════════════════════════════════════════════════════════════
var result = await _apiService.GetSingleAsync<ResponseDetail<EntityResponse>>(
    "BackendApiName",
    ApiEndpoints.GET_ENTITY,
    new KeyValuePair<string, object>("EntityID", id),
    new KeyValuePair<string, object>("ModuleID", moduleId)
);

// ═══════════════════════════════════════════════════════════════════
// CREATE - Uses CreateAsync (HTTP POST)
// ═══════════════════════════════════════════════════════════════════
var result = await _apiService.CreateAsync<ResponseDetail<EntityResponse>>(
    "BackendApiName",
    ApiEndpoints.CREATE_ENTITY,
    requestData
);

// ═══════════════════════════════════════════════════════════════════
// UPDATE - Uses UpdateAsync (HTTP PUT)
// ═══════════════════════════════════════════════════════════════════
var result = await _apiService.UpdateAsync<ResponseDetail<EntityResponse>>(
    "BackendApiName",
    ApiEndpoints.EDIT_ENTITY,
    id,
    requestData
);

// ═══════════════════════════════════════════════════════════════════
// DELETE - Uses DeleteAsync (HTTP DELETE)
// ═══════════════════════════════════════════════════════════════════
await _apiService.DeleteAsync(
    "BackendApiName",
    ApiEndpoints.DELETE_ENTITY,
    id
);
```

### 5.3 Request Wrapper (InDataRequest)

ApiService automatically wraps request data in `InDataRequest<T>`:

```csharp
// Automatic wrapping by ApiService
InDataRequest<object> apiReq = new()
{
    AppName = session.GetString("appname"),
    RequestId = httpContext.Connection.Id,
    RequestTime = DateTime.UtcNow,
    RequestData = data                      // Your actual request data
};
```

---

## 6. DROPDOWN & LOOKUP PATTERNS

### 6.1 Dropdown Loading (Controller)

```csharp
// Load multiple dropdowns in one cached call
var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
    "TitleID",
    "GenderID", 
    "StatusID",
    "CountryID"
});

// Extract each dropdown
dropdownOptions.TryGetValue("TitleID", out var titleOptions);
dropdownOptions.TryGetValue("GenderID", out var genderOptions);
dropdownOptions.TryGetValue("StatusID", out var statusOptions);
dropdownOptions.TryGetValue("CountryID", out var countryOptions);

// Assign to ViewData with fallback
ViewData["TitleOptions"] = titleOptions ?? Enumerable.Empty<SelectListItem>();
ViewData["GenderOptions"] = genderOptions ?? Enumerable.Empty<SelectListItem>();
ViewData["StatusOptions"] = statusOptions ?? Enumerable.Empty<SelectListItem>();
ViewData["CountryOptions"] = countryOptions ?? Enumerable.Empty<SelectListItem>();
```

### 6.2 Dropdown Rendering (Razor View)

```html
@{
    var titleOptions = ViewData["TitleOptions"] as IEnumerable<SelectListItem> 
        ?? Enumerable.Empty<SelectListItem>();
}

<!-- Skip(1) removes first placeholder from cached list -->
<select id="ddl_title" name="TitleID" class="bs-select" asp-items="@(titleOptions.Skip(1))">
    <option value="">Select title</option>
</select>
```

### 6.3 Lookup Configuration (JavaScript)

```javascript
const LOOKUP_CONFIG = {
    'ClientID': {
        tableID: 'ClientID',
        displayField: 'txt_client',
        valueField: 'hdn_clientId',
        displayColumn: 'ClientName',
        valueColumn: 'ClientID'
    },
    'AccountOfficer': {
        tableID: 'AccountOfficerID',
        displayField: 'txt_officer',
        valueField: 'hdn_officerId',
        displayColumn: 'OfficerName',
        valueColumn: 'OfficerID'
    }
};
```

### 6.4 Lookup Opening (JavaScript)

```javascript
searchModal.open({
    tableID: 'ClientID',
    moduleID: state.moduleId,
    ourbranchId: state.branchId,
    onSelect: (row) => {
        document.getElementById('txt_client').value = row.ClientName;
        document.getElementById('hdn_clientId').value = row.ClientID;
        state.isDirty = true;
    }
});
```

### 6.5 Lookup HTML (Razor View)

```html
<div class="kairo-control" data-kairo-control>
    <input id="txt_client" name="ClientName" class="bs-input-text" readonly />
    <input id="hdn_clientId" name="ClientID" type="hidden" />
    <button type="button" class="btn-lookup" data-lookup="ClientID">
        <i class="bi bi-search"></i>
    </button>
</div>
```

---

## 7. MIGRATION CHECKLIST

### Pre-Migration Analysis
- [ ] Identify all API endpoints needed
- [ ] List all form fields and IDs
- [ ] Identify dropdown TableIDs
- [ ] Identify lookup TableIDs
- [ ] Document existing validations

### ApiEndpoints.cs
- [ ] Add GET endpoint constant
- [ ] Add CREATE endpoint constant
- [ ] Add UPDATE/EDIT endpoint constant
- [ ] Add DELETE endpoint constant

### Controller
- [ ] Create controller file
- [ ] Inject `IApiService` and `IApiCachedService`
- [ ] Add `[HttpGet] Index()` with dropdown loading
- [ ] Add `[HttpPost] Get()` endpoint
- [ ] Add `[HttpPost] Create()` endpoint
- [ ] Add `[HttpPost] Update()` endpoint
- [ ] Add `[HttpPost] Delete()` endpoint

### Razor View
- [ ] Get dropdowns from `ViewData[]`
- [ ] Use `asp-items` for dropdown rendering
- [ ] Add lookup controls with `data-lookup`
- [ ] Add hidden fields for lookup values
- [ ] Reference JS module at bottom

### JavaScript Module
- [ ] Initialize SearchModal
- [ ] Configure LOOKUP_CONFIG
- [ ] Wire lookup buttons
- [ ] Implement CRUD functions
- [ ] Add form validation
- [ ] Expose module on window

### Testing
- [ ] Test dropdown loading
- [ ] Test all lookups
- [ ] Test GET operation
- [ ] Test CREATE operation
- [ ] Test UPDATE operation
- [ ] Test DELETE operation
- [ ] Test validations

---

## 8. COMMON ISSUES & SOLUTIONS

| Issue | Solution |
|-------|----------|
| Dropdowns empty | Check TableID in `GetMultipleDropdownCodeOptionsAsync()` |
| Lookup not opening | Verify `data-lookup` matches `LOOKUP_CONFIG` key |
| API returns 401 | Check `_authService.IsAuthenticated()` |
| 404 on API call | Verify endpoint in `ApiEndpoints.cs` matches backend |
| Form fields readonly | Check `setMode()` is being called |
| XSRF error | Add `@Html.AntiForgeryToken()` in parent view |

---

**Document Version:** 1.1  
**Last Updated:** March 5, 2026
