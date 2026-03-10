# Account Maintenance Submodule Migration Pattern Guide

## Overview
This guide documents the successful migration pattern for converting HTML/JS submodules from the original Kairo system to the MVC Razor Pages pattern used in `kairo-ui`. The Account Notes module serves as the reference implementation.

## Migration Architecture

### Three-Tier Pattern
1. **View Layer** (`.cshtml` Razor Page)
2. **Controller Layer** (MVC Controller with API endpoints)
3. **JavaScript Layer** (Client-side logic using module pattern)

---

## 1. View Layer Migration (CSHTML)

### Location
- **Target**: `kairo-ui\Views\AccountsMaintenance\{SubmoduleName}.cshtml`
- **Original**: `D:\Kairo\kairo\public\modules\account-maintenance\dataentry\{submodule-name}.html`

### Key Components

#### A. Anti-Forgery Token
```razor
<form id="accountNotesForm" style="display:none;">
    @Html.AntiForgeryToken()
</form>
```
**Purpose**: CSRF protection for API calls

#### B. Window Structure
```html
<div class="window">
    <div class="am-header">
        <!-- Title and window controls -->
    </div>
    <main class="main-container">
        <!-- Action panel and form content -->
    </main>
    <div class="am-message-panel">
        <!-- Success/Error messages -->
    </div>
    <div class="loading-overlay">
        <!-- Loading indicator -->
    </div>
</div>
```

#### C. Action Panel
```html
<div class="action-panel">
    <button type="button" class="action-btn action-btn--view" data-action="view">
        <i class="bi bi-eye"></i>
        <span>View</span>
    </button>
    <button type="button" class="action-btn action-btn--edit" data-action="edit">
        <i class="bi bi-pencil"></i>
        <span>Edit</span>
    </button>
    <button type="button" class="action-btn action-btn--save" data-action="save">
        <i class="bi bi-floppy"></i>
        <span>Save</span>
    </button>
    <button type="button" class="action-btn action-btn--cancel" data-action="cancel">
        <i class="bi bi-x-circle"></i>
        <span>Cancel</span>
    </button>
</div>
```

#### D. Form Content with Sections
```html
<div class="form-content">
    <div class="form-card" data-main-form>
        <!-- Main form section -->
        <div class="form-section" data-section="main-details">
            <div class="section-header">
                <span class="section-header__title">
                    <i class="bi bi-icon"></i> Section Title
                </span>
            </div>
            <div class="section-content">
                <!-- Form fields -->
            </div>
        </div>
        
        <!-- Behind the Scene section -->
        <div class="form-section" data-section="behind-scene">
            <div class="section-header">
                <span class="section-header__title">
                    <i class="bi bi-gear"></i> Behind the Scene
                </span>
                <button type="button" class="section-toggle-btn" aria-label="Toggle">
                    <i class="bi bi-chevron-up"></i>
                </button>
            </div>
            <div class="section-content">
                <div class="audit-section audit-section--summary">
                    <div class="audit-cell">
                        <span class="audit-label">Created By</span>
                        <span class="audit-value" id="CreatedBy">-</span>
                    </div>
                    <!-- More audit fields -->
                </div>
            </div>
        </div>
    </div>
</div>
```

#### E. Script References
```html
<!-- Module JavaScript -->
<script src="/js/modules/accountsmaintenance/{submodule-name}.js"></script>

<!-- Inline coordination script -->
<script>
    // Submodule state tracking
    // Message passing with parent
    // Window control handlers
</script>
```

---

## 2. Controller Layer Migration

### Location
`kairo-ui\Controllers\AccountsMaintenance\AccountsMaintenanceController.cs`

### A. Partial View Route
```csharp
[Route("AccountNotes")]
public IActionResult AccountNotes() => 
    _authService.IsAuthenticated() ? PartialView("AccountNotes") : Unauthorized();
```

### B. API Endpoints Pattern

#### GET Endpoint
```csharp
[HttpPost]
[Route("api/get-notes")]
public async Task<IActionResult> GetNotes([FromBody] GetNotesRequest request)
{
    try
    {
        if (!_authService.IsAuthenticated())
            return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

        // Inject session data
        request.OperatorID = HttpContext.Session.GetString("user_name");
        if (string.IsNullOrEmpty(request.OurBranchID))
        {
            request.OurBranchID = HttpContext.Session.GetString("branch_code");
        }

        // Call backend API
        var response = await _apiService.CreateAsync<JsonElement>(
            "AccountManagementApi",
            ApiEndpoints.GET_NOTES,
            request
        );

        return Ok(response);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error getting notes");
        return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
    }
}
```

#### UPDATE/CREATE Endpoint
```csharp
[HttpPost]
[Route("api/update-notes")]
public async Task<IActionResult> UpdateNotes([FromBody] UpdateNotesRequest request)
{
    try
    {
        if (!_authService.IsAuthenticated())
            return Unauthorized(new { Success = false, ErrorMessage = "Not authenticated" });

        // Inject session data
        request.OperatorID = HttpContext.Session.GetString("user_name");
        if (string.IsNullOrEmpty(request.OurBranchID))
        {
            request.OurBranchID = HttpContext.Session.GetString("branch_code");
        }

        // Call backend API
        var response = await _apiService.CreateAsync<JsonElement>(
            "AccountManagementApi",
            ApiEndpoints.UPDATE_NOTES,
            request
        );

        return Ok(response);
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error updating notes");
        return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
    }
}
```

### C. Request DTOs
```csharp
public class GetNotesRequest
{
    public string? AccountId { get; set; }
    public string? OurBranchID { get; set; }
    public string? OperatorID { get; set; }
}

public class UpdateNotesRequest
{
    public string? AccountId { get; set; }
    public string? Notes { get; set; }
    public string? OurBranchID { get; set; }
    public string? OperatorID { get; set; }
}
```

---

## 3. JavaScript Layer Migration

### Location
`kairo-ui\wwwroot\js\modules\accountsmaintenance\{submodule-name}.js`

### Module Pattern Structure

```javascript
/**
 * Module Name - MVC Pattern
 * Description
 */

window.ModuleNameModule = (function () {
    'use strict';

    // Module state
    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        // ... other state
    };

    /**
     * Initialize module
     */
    async function initModule() {
        console.log('[ModuleName] Initializing...');

        // Get context from parent or sessionStorage
        if (window.parent && window.parent.AccountMaintenanceState) {
            const parentState = window.parent.AccountMaintenanceState;
            state.accountId = parentState.AccountID;
            state.branchId = parentState.OurBranchID || parentState.BranchID;
            state.operatorId = parentState.OperatorID;
        } else {
            state.accountId = sessionStorage.getItem('currentAccountID');
            state.branchId = sessionStorage.getItem('currentBranchID');
            state.operatorId = sessionStorage.getItem('currentOperatorID') || 'SYSTEM';
        }

        if (!state.accountId) {
            showError('No account selected. Please select an account first.');
            return;
        }

        wireActionButtons();
        setMode('VIEW');
        await loadData();
    }

    /**
     * Wire action buttons
     */
    function wireActionButtons() {
        const viewBtn = document.querySelector('[data-action="view"]');
        if (viewBtn) {
            viewBtn.addEventListener('click', () => {
                setMode('VIEW');
                loadData();
            });
        }

        const editBtn = document.querySelector('[data-action="edit"]');
        if (editBtn) {
            editBtn.addEventListener('click', () => setMode('EDIT'));
        }

        const saveBtn = document.querySelector('[data-action="save"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await saveData();
            });
        }

        const cancelBtn = document.querySelector('[data-action="cancel"]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                // Restore original data
                setMode('VIEW');
            });
        }
    }

    /**
     * Set mode (VIEW/EDIT)
     */
    function setMode(mode) {
        state.currentMode = mode;
        // Update UI based on mode
        // Enable/disable fields
        // Update button states
    }

    /**
     * Load data from API
     */
    async function loadData() {
        showLoading(true);

        try {
            const payload = {
                AccountId: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            };

            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

            const response = await fetch('/AccountsMaintenance/api/get-xxx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'RequestVerificationToken': csrfToken })
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Check success
            const isSuccess = result?.ResponseCode === '00' || 
                            result?.ResponseCode === 0 || 
                            result?.success === true ||
                            result?.Success === true;

            if (!isSuccess) {
                const errorMsg = result?.ResponseMessage || result?.message || 'Failed to load data';
                showError(errorMsg);
                return;
            }

            // Extract and populate data
            const data = result?.Details || result?.Data || result?.data || {};
            populateForm(data);
            showSuccess('Data loaded successfully');

        } catch (error) {
            console.error('[ModuleName] Error loading data:', error);
            showError('Failed to load data: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Save data to API
     */
    async function saveData() {
        showLoading(true);

        try {
            // Gather form data
            const formData = gatherFormData();

            // Validation
            if (!validateFormData(formData)) {
                showLoading(false);
                return;
            }

            const payload = {
                AccountId: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                ...formData
            };

            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;

            const response = await fetch('/AccountsMaintenance/api/update-xxx', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken && { 'RequestVerificationToken': csrfToken })
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            const isSuccess = result?.ResponseCode === '00' || 
                            result?.ResponseCode === 0 || 
                            result?.success === true ||
                            result?.Success === true;

            if (!isSuccess) {
                const errorMsg = result?.ResponseMessage || result?.message || 'Failed to save data';
                showError(errorMsg);
                return;
            }

            showSuccess('Data saved successfully');
            setMode('VIEW');

            // Reload to get updated audit fields
            setTimeout(() => {
                loadData();
            }, 500);

        } catch (error) {
            console.error('[ModuleName] Error saving data:', error);
            showError('Failed to save data: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /**
     * Show loading overlay
     */
    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.hidden = !show;
        }
    }

    /**
     * Show success message
     */
    function showSuccess(message) {
        showMessage(message, 'success', 'bi-check-circle');
    }

    /**
     * Show error message
     */
    function showError(message) {
        showMessage(message, 'error', 'bi-exclamation-circle');
    }

    /**
     * Show warning message
     */
    function showWarning(message) {
        showMessage(message, 'warning', 'bi-exclamation-triangle');
    }

    /**
     * Show message in panel
     */
    function showMessage(message, type, iconClass) {
        const panel = document.querySelector('.am-message-panel');
        if (!panel) return;

        panel.classList.remove('am-message-panel--success', 'am-message-panel--error', 
                              'am-message-panel--warning', 'am-message-panel--info');
        panel.classList.add(`am-message-panel--${type}`);

        const icon = panel.querySelector('i');
        if (icon && iconClass) {
            icon.className = iconClass;
        }

        const span = panel.querySelector('span');
        if (span) {
            span.textContent = message;
        }

        panel.style.display = 'flex';

        const duration = type === 'error' ? 5000 : 3000;
        setTimeout(() => {
            panel.style.display = 'none';
        }, duration);
    }

    // Public API
    return {
        init: initModule,
        loadData: loadData,
        saveData: saveData,
        setMode: setMode
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('[ModuleName] DOM ready, initializing module...');
    window.ModuleNameModule.init();
});

console.log('✅ ModuleName module loaded (MVC Pattern)');
```

---

## 4. API Endpoint Constants

### Location
`kairo-ui\Services\ApiEndpointConstants.cs`

```csharp
public static class ApiEndpoints
{
    // Base endpoint
    private const string BASEACCOUNTS = "api/v1/AccountMaintenance";
    
    // Module-specific endpoints
    public const string GET_NOTES = BASEACCOUNTS + "/GetNotes";
    public const string UPDATE_NOTES = BASEACCOUNTS + "/UpdateNotes";
}
```

---

## 5. Key Patterns and Best Practices

### A. State Management
- Use `window.parent.AccountMaintenanceState` for parent context
- Fallback to `sessionStorage` if parent context is unavailable
- Store original data for cancel operations

### B. Authentication & Authorization
- Always check `_authService.IsAuthenticated()` in controller
- Inject session data (OperatorID, BranchID) in controller, not client-side

### C. Error Handling
- Comprehensive try-catch blocks
- Multiple success check patterns (ResponseCode === '00' || '0' || success === true)
- Detailed logging with context

### D. UI/UX Patterns
- Loading overlays for async operations
- Success/Error message panels with auto-hide
- Action button state management (active/disabled)
- Section toggle functionality
- Audit trail display (Behind the Scene)

### E. Communication Patterns
- Parent-child communication via `postMessage`
- Submodule open/close coordination
- Prevent multiple submodules opening simultaneously

### F. CSRF Protection
- Include `@Html.AntiForgeryToken()` in form
- Send token in request headers: `RequestVerificationToken`

---

## 6. Migration Checklist

### View Layer (CSHTML)
- [ ] Create partial view in `/Views/AccountsMaintenance/`
- [ ] Include anti-forgery token form
- [ ] Implement window structure with header
- [ ] Add action panel with CRUD buttons
- [ ] Create form sections with proper structure
- [ ] Add Behind the Scene audit section
- [ ] Include message panel and loading overlay
- [ ] Reference module JavaScript file
- [ ] Add inline coordination script

### Controller Layer
- [ ] Add partial view route in `AccountsMaintenanceController`
- [ ] Create GET API endpoint with authentication
- [ ] Create UPDATE/CREATE API endpoint
- [ ] Define request DTOs
- [ ] Inject session data (OperatorID, BranchID)
- [ ] Call backend API via `_apiService`
- [ ] Implement error handling and logging

### JavaScript Layer
- [ ] Create module in `/wwwroot/js/modules/accountsmaintenance/`
- [ ] Use revealing module pattern with public API
- [ ] Implement state management
- [ ] Wire action buttons
- [ ] Implement mode switching (VIEW/EDIT)
- [ ] Create loadData function with fetch
- [ ] Create saveData function with validation
- [ ] Implement message/loading helpers
- [ ] Add DOM ready initialization

### API Constants
- [ ] Add endpoint constants to `ApiEndpointConstants.cs`

### Testing
- [ ] Verify authentication flow
- [ ] Test load operation
- [ ] Test save operation with validation
- [ ] Test cancel operation
- [ ] Verify error handling
- [ ] Check message display
- [ ] Test parent-child communication
- [ ] Verify audit trail display

---

## 7. Common Issues and Solutions

### Issue: "Account not selected" error
**Solution**: Ensure `AccountMaintenanceState` is properly set in parent, or account is in sessionStorage

### Issue: CSRF token validation fails
**Solution**: Verify anti-forgery token is included in form and sent in headers

### Issue: API returns authentication error
**Solution**: Check `_authService.IsAuthenticated()` and session state

### Issue: Data not loading
**Solution**: 
- Verify API endpoint URL is correct
- Check backend API is responding
- Verify response parsing logic handles different response formats

### Issue: Buttons not responding
**Solution**: 
- Ensure event listeners are wired in `wireActionButtons()`
- Check DOM is ready before wiring
- Verify button `data-action` attributes match

---

## 8. Example: Account Notes Module

**Files**:
- View: `kairo-ui\Views\AccountsMaintenance\AccountNotes.cshtml`
- Controller: `kairo-ui\Controllers\AccountsMaintenance\AccountsMaintenanceController.cs`
- JavaScript: `kairo-ui\wwwroot\js\modules\accountsmaintenance\account-notes.js`

**Key Features**:
- ✅ Simple CRUD operations (Get/Update Notes)
- ✅ View/Edit mode switching
- ✅ Validation (notes cannot be empty)
- ✅ Audit trail display
- ✅ Success/Error messaging
- ✅ Loading indicators
- ✅ CSRF protection
- ✅ Parent-child communication

---

## 9. Next Steps for New Submodules

1. **Choose a submodule** to migrate (start with simple ones like Account Notes)
2. **Study the pattern** in the existing migrated module
3. **Create the view** (CSHTML) following the structure
4. **Add controller endpoints** for CRUD operations
5. **Create the JavaScript module** with proper patterns
6. **Test thoroughly** with different scenarios
7. **Document any new patterns** discovered

---

## Conclusion

This migration pattern ensures:
- ✅ Consistent architecture across all submodules
- ✅ Proper separation of concerns (View/Controller/JS)
- ✅ Security (authentication, CSRF protection)
- ✅ Maintainability (clear patterns, logging)
- ✅ User experience (loading states, messages, validation)

Follow this guide for migrating additional submodules to maintain consistency and quality across the application.
