# Sidebar Quick Reference Card

## ?? For View Developers

### Include Sidebar (One Line!)
```razor
@await Html.PartialAsync("_SideBarPartial")
```

### Required DOM Structure
```html
<div class="main-container">
    <!-- Sidebar partial here -->
    <div class="form-content" data-main-form>
        <!-- Your form -->
    </div>
    <div class="child-inline" data-child-inline hidden>
        <iframe class="child-iframe-inline" data-child-iframe></iframe>
    </div>
</div>
```

---

## ?? For JavaScript Developers

### Initialize
```javascript
SidebarManager.init({ moduleName: 'Account Maintenance' });
```

### Common Operations
```javascript
// Enable submodules (after loading record)
SidebarManager.setMainRecordLoaded(true, recordId);

// Open a child form
SidebarManager.openChildForm('documents');

// Close child form
SidebarManager.closeChildForm();

// Reset everything
SidebarManager.resetToDefaultState();

// Update badge counts
SidebarManager.updateBadgeCounts();
```

### Get State
```javascript
const state = SidebarManager.getState();
// { isMainRecordLoaded, primaryRecordId, moduleName, activeSubmodule }
```

---

## ?? For Module Maintainers

### When to Update Sidebar Partial

Only update `_SideBarPartial.cshtml` when:
- Adding/removing submodule items
- Changing section structure
- Modifying sidebar layout

**All views automatically get the update!**

### When to Update sidebar.js

Only update `sidebar.js` when:
- Adding new API methods
- Changing behavior logic
- Fixing bugs in sidebar functionality

**All modules automatically get the update!**

---

## ?? Cache Configuration

### Current Settings
- **Submodules cache**: 6 hours
- **Cache location**: Distributed + Memory
- **Priority**: High
- **Compression**: No (small payloads)

### Update Cache Duration
Edit `CachingConstants.cs`:
```csharp
public const int EXPIRATION_MODULES = 360; // 6 hours in minutes
```

---

## ?? Troubleshooting

| Problem | Solution |
|---------|----------|
| Sidebar doesn't appear | Include `_SideBarPartial` in view |
| Submodules won't open | Add overlay container: `[data-child-inline]` |
| SidebarManager undefined | Partial not included or scripts blocked |
| Theme not applying | Call `applyThemeVarsToChildIframe()` |
| Search not working | Verify `submoduleSearch` input exists |
| Scripts load twice | Remove manual `sidebar.js` references |

---

## ?? Documentation Files

| File | Purpose |
|------|---------|
| `SIDEBAR_README.md` | Complete API documentation |
| `_SIDEBAR_PARTIAL_USAGE.md` | How to use partial in views |
| `_SIDEBAR_MIGRATION_GUIDE.md` | Migrate existing views |
| `SIDEBAR_REFACTORING_SUMMARY.md` | Overview of all changes |

---

## ? Checklist for New Module

- [ ] Include `@await Html.PartialAsync("_SideBarPartial")` in view
- [ ] Add `<div class="main-container">` wrapper
- [ ] Add child form overlay container
- [ ] Initialize `SidebarManager` in your JS
- [ ] Call `setMainRecordLoaded()` when loading records
- [ ] Call `resetToDefaultState()` when clearing
- [ ] Test sidebar toggle, search, and submodules

---

## ?? Key Principles

1. **Partial owns its scripts** - Self-contained
2. **SidebarManager is the API** - All sidebar operations go through it
3. **State drives behavior** - Main record loaded = submodules enabled
4. **Cache for performance** - 6-hour cache reduces API calls
5. **Document everything** - Clear guides for all developers

---

## ?? Quick Links

- **Sidebar Partial**: `Views/Shared/_SideBarPartial.cshtml`
- **Sidebar Logic**: `wwwroot/js/modules/shared/sidebar.js`
- **Cache Config**: `Services/CachingConstants.cs`
- **Dashboard Controller**: `Controllers/Dashboard/DashboardController.cs`

---

**Last Updated**: 2024
**Version**: 1.0.0
**Status**: Production Ready ?
