# Sidebar Partial View Usage Guide

## Overview

The `_SideBarPartial.cshtml` is a self-contained, reusable sidebar component that includes:
- Sidebar HTML structure
- Automatic loading of `sidebar.js` for functionality
- Search, navigation sections, and submodule items

## Benefits of Self-Contained Partial

? **Separation of Concerns**: Sidebar manages its own dependencies
? **Reusability**: Include in any view without worrying about script references
? **Maintainability**: Changes to sidebar only need to be made in one place
? **Clean Code**: Parent views don't need to know about sidebar scripts

## Basic Usage

### 1. Include in Your View

```razor
@* In your view (e.g., Account Maintenance, Client Maintenance, etc.) *@

<div class="main-container">
    @* Include the sidebar partial *@
    @await Html.PartialAsync("_SideBarPartial")
    
    @* Your main content *@
    <div class="form-content">
        <!-- Your form/content here -->
    </div>
</div>
```

### 2. No Script References Needed

The partial automatically loads its own JavaScript:

```razor
@* ? DON'T DO THIS - Not needed anymore! *@
<script src="~/js/modules/shared/sidebar.js"></script>

@* ? Just include the partial, scripts are handled automatically *@
@await Html.PartialAsync("_SideBarPartial")
```

## Complete Example

### Account Maintenance View

```razor
@model AccountMaintenanceViewModel
@{
    ViewData["Title"] = "Account Maintenance";
    Layout = "_ApplicationLayout";
}

<div class="window">
    <div class="main-container">
      @* Include sidebar - that's it! *@
        @await Html.PartialAsync("_SideBarPartial")
        
        <div class="form-content">
    <div class="form-card" data-main-form>
      <!-- Account form fields -->
  <div class="form-section">
     <label>Account ID</label>
         <input type="text" id="AccountID" />
                </div>
            </div>
      </div>

   @* Child form overlay (managed by sidebar.js) *@
        <div class="child-inline" data-child-inline hidden>
       <iframe class="child-iframe-inline" data-child-iframe></iframe>
  </div>
    </div>
</div>

@* Your module-specific scripts *@
@section Scripts {
    <script src="~/js/modules/accountsmaintenance/account-maintenance.js"></script>
}
```

### Client Maintenance View

```razor
@model ClientMaintenanceViewModel
@{
    ViewData["Title"] = "Client Maintenance";
Layout = "_ApplicationLayout";
}

<div class="window">
    <div class="main-container">
        @* Sidebar with all its functionality *@
        @await Html.PartialAsync("_SideBarPartial")
        
        <div class="form-content">
   <!-- Client form content -->
        </div>
    </div>
</div>

@section Scripts {
<script src="~/js/modules/identities/client-maintenance.js"></script>
}
```

## Customizing Sidebar Content

If you need module-specific sidebar items, you can pass a model:

### Option 1: Use Existing Items (Default)

```razor
@* Uses the default sidebar items (Account Maintenance focused) *@
@await Html.PartialAsync("_SideBarPartial")
```

### Option 2: Pass Custom Items (Future Enhancement)

```razor
@{
    var sidebarModel = new SidebarViewModel
    {
   Sections = new List<SidebarSection>
     {
            new SidebarSection
     {
            Name = "Client Operations",
      Items = new List<SidebarItem>
      {
   new SidebarItem { Title = "Documents", Url = "client-documents", Icon = "bi-file" },
     new SidebarItem { Title = "Addresses", Url = "client-addresses", Icon = "bi-pin-map" }
  }
            }
        }
 };
}

@await Html.PartialAsync("_SideBarPartial", sidebarModel)
```

## Working with Sidebar in JavaScript

The sidebar automatically initializes when included. Use the `SidebarManager` API:

```javascript
// In your module's JS file (e.g., account-maintenance.js)

// Initialize with module name
SidebarManager.init({
    moduleName: 'Account Maintenance',
    isMainRecordLoaded: false
});

// When record is loaded
function loadAccount(accountId) {
    // ... load account logic ...
    
    // Update sidebar state
    SidebarManager.setMainRecordLoaded(true, accountId);
}

// Open a submodule
document.getElementById('openDocsBtn').addEventListener('click', () => {
    SidebarManager.openChildForm('documents', {
        requireMainRecord: true,
        mainRecordName: 'account'
    });
});
```

## Migration from Old Code

### Before (Manual Script Loading)

```razor
@* Old way - scripts scattered across views *@
<div class="main-container">
    <div class="sidebar">
        <!-- Sidebar HTML copied in each view -->
    </div>
</div>

@section Scripts {
    <script src="~/js/modules/shared/sidebar.js"></script>
    <script src="~/js/modules/accountsmaintenance/account-maintenance.js"></script>
}
```

### After (Self-Contained Partial)

```razor
@* New way - clean and simple *@
<div class="main-container">
    @await Html.PartialAsync("_SideBarPartial")
</div>

@section Scripts {
    <script src="~/js/modules/accountsmaintenance/account-maintenance.js"></script>
}
```

## Layout Integration

### In _ApplicationLayout.cshtml

The layout should NOT include sidebar.js globally:

```razor
<!DOCTYPE html>
<html>
<head>
    <!-- Common scripts -->
    <script src="~/lib/jquery/dist/jquery.min.js"></script>
    <script src="~/lib/bootstrap/dist/js/bootstrap.bundle.min.js"></script>
    
    @* ? DON'T add sidebar.js here *@
</head>
<body>
    @RenderBody()
    
    @* Scripts section for view-specific scripts *@
    @await RenderSectionAsync("Scripts", required: false)
</body>
</html>
```

## File Structure

```
Views/
??? Shared/
?   ??? _SideBarPartial.cshtml      (Sidebar HTML + script reference)
??? AccountsMaintenance/
?   ??? Index.cshtml      (Includes sidebar partial)
??? Identities/
? ??? ClientMaintenance.cshtml     (Includes sidebar partial)
??? Dashboard/
    ??? Index.cshtml         (May or may not use sidebar)

wwwroot/js/modules/
??? shared/
?   ??? sidebar.js    (Sidebar logic - loaded by partial)
?   ??? SIDEBAR_README.md
??? accountsmaintenance/
?   ??? account-maintenance.js       (Module-specific logic)
??? identities/
    ??? client-maintenance.js(Module-specific logic)
```

## Troubleshooting

### Sidebar not working?

1. **Check if partial is included:**
   ```razor
 @await Html.PartialAsync("_SideBarPartial")
   ```

2. **Verify required DOM elements exist:**
   - `.main-container` - Container for sidebar and content
   - `[data-child-inline]` - Overlay container for submodules
   - `[data-child-iframe]` - Iframe for submodule content

3. **Check browser console:**
   ```javascript
   // Should see:
   [Sidebar] Initializing...
   [Sidebar] Initialized successfully
   ```

### Script loading twice?

Remove duplicate references:

```razor
@* ? Remove this if you have it *@
<script src="~/js/modules/shared/sidebar.js"></script>

@* ? Partial loads it automatically *@
@await Html.PartialAsync("_SideBarPartial")
```

## Best Practices

1. **Always use the partial** - Don't copy/paste sidebar HTML
2. **Let the partial manage scripts** - Don't manually load sidebar.js
3. **Initialize SidebarManager** in your module's JS file
4. **Update state** when loading/clearing records
5. **Use consistent DOM structure** for proper overlay behavior

## Advanced: Dynamic Sidebar Items

For dynamic sidebar items from database/API:

### Controller Action

```csharp
public class SideBarController : Controller
{
    private readonly IApiCachedService _apiCachedService;

    [HttpGet]
    public async Task<IActionResult> GetSidebarItems(string moduleName)
    {
        // Get submodules from cached API
      var submodules = await _apiCachedService.GetSubModulesAsync(
      parentModuleId, 
  userName
    );

        var model = new SidebarViewModel
        {
            Sections = MapToSidebarSections(submodules)
        };

        return PartialView("_SideBarPartial", model);
    }
}
```

### View Usage

```razor
@* Load sidebar items dynamically *@
<div id="sidebarContainer">
    @* Loaded via AJAX or rendered server-side *@
</div>

@section Scripts {
    <script>
        // Load sidebar dynamically if needed
        fetch('/Shared/GetSidebarItems?moduleName=AccountMaintenance')
      .then(response => response.text())
         .then(html => {
  document.getElementById('sidebarContainer').innerHTML = html;
         });
    </script>
}
```

## Summary

The self-contained sidebar partial provides:

- ? **Zero configuration** - Just include the partial
- ? **Automatic script loading** - No manual script references
- ? **Consistent behavior** - Same sidebar across all modules
- ? **Easy updates** - Change once, affects all modules
- ? **Clean separation** - Sidebar owns its dependencies

**Usage**: Simply add `@await Html.PartialAsync("_SideBarPartial")` to any view that needs a sidebar!
