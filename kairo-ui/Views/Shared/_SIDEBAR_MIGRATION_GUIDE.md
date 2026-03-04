# Migration Guide: Using Self-Contained Sidebar Partial

This guide shows how to update existing views to use the new self-contained `_SideBarPartial.cshtml`.

## Key Changes

### Before (Old Pattern)
- Sidebar HTML duplicated in each view
- Manual script references in each view
- Sidebar.js loaded multiple times

### After (New Pattern)
- Single `@await Html.PartialAsync("_SideBarPartial")` call
- No manual script references needed
- Sidebar.js loaded once by the partial

## Step-by-Step Migration

### Example 1: Account Maintenance View

#### Before
```razor
@model AccountMaintenanceViewModel
@{
 ViewData["Title"] = "Account Maintenance";
}

<div class="main-container">
    <!-- Duplicated sidebar HTML (200+ lines) -->
    <div class="sidebar" id="main-sidebar">
    <div class="sidebar-header">...</div>
   <div class="sidebar-search">...</div>
   <div class="sidebar-content">
   <!-- All items defined here -->
        </div>
    </div>
    
    <div class="form-content">
        <!-- Form content -->
    </div>
</div>

@section Scripts {
    <script src="~/js/modules/shared/sidebar.js"></script>
    <script src="~/js/modules/accountsmaintenance/account-maintenance.js"></script>
}
```

#### After
```razor
@model AccountMaintenanceViewModel
@{
    ViewData["Title"] = "Account Maintenance";
}

<div class="main-container">
    @* Single line - sidebar with all functionality *@
    @await Html.PartialAsync("_SideBarPartial")
    
    <div class="form-content">
     <!-- Form content -->
    </div>
</div>

@section Scripts {
    @* sidebar.js loaded automatically by partial *@
    <script src="~/js/modules/accountsmaintenance/account-maintenance.js"></script>
}
```

**Lines saved**: ~200 lines of HTML + 1 script reference

---

### Example 2: Client Maintenance View

#### Before
```razor
@model ClientMaintenanceViewModel

<div class="window">
    <div class="main-container">
        <!-- Sidebar HTML copy-pasted -->
  <div class="sidebar" id="main-sidebar">
 <!-- 200+ lines of HTML -->
        </div>
        
      <div class="form-content">
            <!-- Client form -->
    </div>
    </div>
</div>

@section Scripts {
    <script src="~/js/modules/shared/sidebar.js"></script>
    <script src="~/js/modules/identities/client-maintenance.js"></script>
}
```

#### After
```razor
@model ClientMaintenanceViewModel

<div class="window">
    <div class="main-container">
        @await Html.PartialAsync("_SideBarPartial")
        
 <div class="form-content">
      <!-- Client form -->
        </div>
    </div>
</div>

@section Scripts {
    <script src="~/js/modules/identities/client-maintenance.js"></script>
}
```

---

### Example 3: Dashboard View (Special Case)

The dashboard may not need a sidebar, so it doesn't include the partial:

#### Before
```razor
@* Dashboard doesn't have sidebar HTML but loads sidebar.js globally *@
@section Scripts {
    <script src="~/js/modules/shared/searchModal.js"></script>
    <script src="~/js/modules/shared/sidebar.js"></script>
    <script src="~/js/modules/dashboard/dashboard.js"></script>
}
```

#### After
```razor
@* Dashboard doesn't include sidebar partial, so no sidebar.js loaded *@
@section Scripts {
    <script src="~/js/modules/shared/searchModal.js"></script>
    <script src="~/js/modules/dashboard/dashboard.js"></script>
}
```

**Note**: If dashboard needs sidebar functionality later, just add `@await Html.PartialAsync("_SideBarPartial")`

---

## JavaScript Integration

Your module-specific JavaScript works the same way:

```javascript
// account-maintenance.js or client-maintenance.js

// Wait for DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // SidebarManager is already loaded and initialized by the partial
    
    // Set module name
    SidebarManager.init({
        moduleName: 'Account Maintenance'
    });
    
    // Your module logic
    initAccountForm();
    wireActionButtons();
});

function loadAccount(accountId) {
    // Load account data
    fetchAccountData(accountId).then(data => {
  populateForm(data);
 
        // Enable submodules
        SidebarManager.setMainRecordLoaded(true, accountId);
    });
}

function clearAccount() {
 clearForm();
    
    // Disable submodules and close any open child forms
    SidebarManager.resetToDefaultState();
}
```

## Migration Checklist

For each view that uses a sidebar:

- [ ] Replace sidebar HTML with `@await Html.PartialAsync("_SideBarPartial")`
- [ ] Remove `sidebar.js` script reference from Scripts section
- [ ] Ensure `<div class="main-container">` wrapper exists
- [ ] Ensure child form overlay exists: `<div class="child-inline" data-child-inline hidden>`
- [ ] Update module JS to use `SidebarManager` API
- [ ] Test sidebar functionality (toggle, search, submodules)
- [ ] Test child form overlay
- [ ] Verify theme propagation to iframes

## Views to Update

Based on the workspace, these views should be migrated:

| View | Path | Priority |
|------|------|----------|
| Account Maintenance | `Views/AccountsMaintenance/Index.cshtml` | High |
| Client Maintenance | `Views/Identities/ClientMaintenance/Index.cshtml` | High |
| Client 360 View | `Views/Identities/Client360/Index.cshtml` | Medium |
| Loan Maintenance | `Views/Loans/LoanMaintenance/Index.cshtml` | Medium |
| Product Maintenance | `Views/Product/Index.cshtml` | Medium |

## Testing After Migration

1. **Visual Test**: Sidebar appears and looks correct
2. **Toggle Test**: Sidebar collapse/expand works
3. **Search Test**: Submodule search filters correctly
4. **Section Test**: Sections expand/collapse properly
5. **Submodule Test**: Clicking items opens overlay
6. **Theme Test**: Child forms inherit theme correctly
7. **State Test**: Main record validation works
8. **Close Test**: Closing child form returns to main form
9. **Badge Test**: Badge counts are correct

## Common Issues & Solutions

### Issue: Sidebar appears but doesn't work

**Cause**: Scripts section not rendered properly

**Solution**: Ensure layout has `@await RenderSectionAsync("Scripts", required: false)`

---

### Issue: Child forms don't open

**Cause**: Missing overlay container

**Solution**: Add to your view:
```razor
<div class="child-inline" data-child-inline hidden>
    <iframe class="child-iframe-inline" data-child-iframe></iframe>
</div>
```

---

### Issue: Multiple script loads

**Cause**: Partial included multiple times or manual reference added

**Solution**: 
- Include partial only once per view
- Remove manual `sidebar.js` references

---

### Issue: SidebarManager not defined

**Cause**: Partial not included or scripts blocked

**Solution**: 
- Verify `@await Html.PartialAsync("_SideBarPartial")` is present
- Check browser console for script errors
- Ensure path to `sidebar.js` is correct

---

## Benefits Summary

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines per view | ~200 (sidebar HTML) | 1 (partial call) | 99.5% reduction |
| Script references | Manual in each view | Automatic from partial | Zero maintenance |
| Consistency | HTML may drift | Always up-to-date | Perfect sync |
| Updates | Change N files | Change 1 file | N× faster |
| Testability | Test each view | Test partial once | N× easier |

## Questions?

See also:
- `SIDEBAR_README.md` - Complete API documentation
- `_SideBarPartial.cshtml` - Partial view source
- `sidebar.js` - JavaScript implementation

---

**TL;DR**: Replace 200+ lines of sidebar HTML and script references with one line:
```razor
@await Html.PartialAsync("_SideBarPartial")
```

That's it! The partial handles everything else. ??
