# Sidebar Manager Module

The Sidebar Manager is a standalone JavaScript module that handles all sidebar-related functionality including navigation, submodule management, and child form overlays.

## Features

- **Dynamic Submodule Loading** - Load submodules with automatic cache busting
- **Search & Filter** - Real-time search across all submodule items
- **Section Management** - Collapsible sections with expand/collapse animation
- **Child Form Overlay** - Modal-like overlay system for submodule content
- **Theme Propagation** - Automatically applies theme variables to iframe content
- **Badge Updates** - Dynamic badge counts for sections
- **State Management** - Tracks main record loading state and active submodules
- **Message Handling** - PostMessage API for iframe communication

## Installation

1. Include the script in your layout or page:

```html
<script src="/js/modules/shared/sidebar.js"></script>
```

2. Ensure required DOM structure exists (sidebar, overlay containers, etc.)

## Basic Usage

### Auto-Initialization

The sidebar automatically initializes when the DOM is ready if a sidebar element exists:

```javascript
// Sidebar will auto-init if #main-sidebar exists
```

### Manual Initialization

```javascript
// Initialize with options
SidebarManager.init({
  moduleName: 'Account Maintenance',
  isMainRecordLoaded: false,
  primaryRecordId: null
});
```

### Opening Child Forms

```javascript
// Basic usage
SidebarManager.openChildForm('path/to/submodule.html');

// With options
SidebarManager.openChildForm('path/to/submodule.html', {
  requireMainRecord: true,  // Require main record to be loaded
  mainRecordName: 'account',    // Name for error messages
  cacheBust: true // Add cache-busting query param
});
```

### Closing Child Forms

```javascript
SidebarManager.closeChildForm();
```

### State Management

```javascript
// Set main record loaded state
SidebarManager.setMainRecordLoaded(true, '12345');

// Get current state
const state = SidebarManager.getState();
// Returns: { isMainRecordLoaded, primaryRecordId, moduleName, activeSubmodule }
```

### Other Operations

```javascript
// Toggle expand/collapse of child overlay
SidebarManager.toggleChildExpand();

// Update badge counts
SidebarManager.updateBadgeCounts();

// Reset to default state (close forms, clear state)
SidebarManager.resetToDefaultState();

// Apply theme to iframe
SidebarManager.applyThemeVarsToChildIframe();

// Control sections programmatically
SidebarManager.setSectionOpen(sectionElement, true);
```

## DOM Structure

### Required Elements

```html
<!-- Main Sidebar -->
<div class="sidebar" id="main-sidebar">
  <!-- Sidebar Header -->
  <div class="sidebar-header">
    <span class="sidebar-header__title">
   <i class="bi bi-grid-3x3-gap-fill"></i>SUBMODULES
    </span>
 <button type="button" class="sidebar-toggle" id="sidebarToggle">
      <i class="bi bi-list"></i>
    </button>
  </div>

  <!-- Search -->
  <div class="sidebar-search">
    <input type="text" class="sidebar-search__input" id="submoduleSearch" 
       placeholder="Search submodules...">
    <i class="bi bi-search sidebar-search__icon"></i>
    <button type="button" class="sidebar-search__clear" 
            id="submoduleSearchClear">
      <i class="bi bi-x-circle"></i>
</button>
  </div>

  <!-- Content -->
  <div class="sidebar-content">
    <!-- Sections -->
    <div class="nav-section nav-section--card" data-nav-section>
      <div class="nav-header nav-header--card">
     <div class="nav-header__content">
          <i class="bi bi-folder-fill nav-header__icon"></i>
  <span class="nav-label nav-label--card">Section Name</span>
        </div>
        <div class="nav-header__badge">
          <span class="nav-badge">0</span>
          <button type="button" class="nav-arrow nav-arrow--card">
 <i class="bi bi-chevron-down"></i>
  </button>
        </div>
      </div>
   
      <div class="nav-items nav-items--card">
<!-- Items -->
      <div class="sidebar-item sidebar-item--enhanced" 
     data-child-form="path/to/form.html">
  <div class="sidebar-item__content">
            <i class="bi bi-file-text sidebar-item__icon"></i>
   <div class="sidebar-item__text">
   <div class="sidebar-item__title">Item Title</div>
        <div class="sidebar-item__description">Description</div>
  </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Child Form Overlay -->
<div class="child-inline" data-child-inline hidden>
  <iframe class="child-iframe-inline" data-child-iframe 
     title="DataEntry Submodule"></iframe>
</div>

<!-- Optional: Loading Overlay -->
<div id="pageLoadingOverlay" hidden>
  <div class="loading-spinner">
    <i class="bi bi-arrow-repeat"></i>
    <span id="pageLoadingText">Loading...</span>
  </div>
</div>
```

## Events

### Custom Events

The sidebar emits custom events that you can listen for:

```javascript
// Reset event (fired when resetToDefaultState is called)
document.addEventListener('sidebar:reset', (e) => {
  console.log('Sidebar reset at:', e.detail.timestamp);
  // Handle cleanup in parent module
});
```

### Message Events (PostMessage API)

The sidebar listens for window messages from iframes:

```javascript
// From iframe: Close the submodule
window.parent.postMessage({ type: 'submoduleClose' }, '*');

// From iframe: Open another submodule
window.parent.postMessage({ 
  type: 'submoduleOpen', 
  submoduleUrl: 'path/to/form.html' 
}, '*');

// From iframe: Reset to default state
window.parent.postMessage({ type: 'submoduleReset' }, '*');
```

## Integration Examples

### Account Maintenance Integration

```javascript
// In account-maintenance.js

// Initialize sidebar with module name
SidebarManager.init({
  moduleName: 'Account Maintenance'
});

// When account is loaded
function loadAccount(accountId) {
  // ... load account logic ...
  
  // Update sidebar state
  SidebarManager.setMainRecordLoaded(true, accountId);
}

// When account is cleared
function clearAccount() {
  // ... clear account logic ...
  
  // Reset sidebar
  SidebarManager.resetToDefaultState();
}
```

### Client Maintenance Integration

```javascript
// In client-maintenance.js

// Listen for sidebar reset
document.addEventListener('sidebar:reset', () => {
  clearClientForm();
  resetClientState();
});

// Custom child form opener with validation
function openClientSubmodule(url) {
  const clientId = document.getElementById('ClientID').value;
  
  if (!clientId) {
  alert('Please load a client first');
    return;
  }
  
  // Set state and open
  SidebarManager.setMainRecordLoaded(true, clientId);
  SidebarManager.openChildForm(url, {
    requireMainRecord: true,
    mainRecordName: 'client'
  });
}
```

## Styling

The sidebar module uses CSS classes that should be defined in your main stylesheet:

- `.sidebar` - Main sidebar container
- `.sidebar-header` - Header section
- `.sidebar-content` - Scrollable content area
- `.nav-section--card` - Section container
- `.nav-header--card` - Section header
- `.nav-items--card` - Section items container
- `.sidebar-item--enhanced` - Individual item
- `.child-inline` - Overlay container
- `.child-iframe-inline` - Iframe element

See `modern-account-maintenance.css` or `styles.css` for reference implementations.

## Theme Variables

The following CSS variables are automatically propagated to iframe content:

- `--copilot-bg-gradient`
- `--copilot-primary`
- `--copilot-primary-hover`
- `--copilot-text-main`
- `--copilot-text-muted`
- `--copilot-card-bg`
- `--kairo-border-color`
- `--kairo-font-family`
- `--kairo-font-size`
- `--kairo-form-canvas-bg`
- `--kairo-form-surface-bg`
- `--kairo-form-actions-bg`
- `--color-header`
- `--color-primary`
- `--ktb-bg`
- `--ktb-bg-dark`
- `--am-primary`
- `--am-primary-dark`

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

Requires support for:
- CSS Grid
- CSS Custom Properties
- ES6 (const/let, arrow functions, template literals)
- PostMessage API
- Custom Events

## Troubleshooting

### Submodule won't open

1. Check console for error messages
2. Verify `data-child-form` attribute exists on sidebar item
3. Ensure main record is loaded if `requireMainRecord` is true
4. Check that overlay container exists in DOM

### Theme not applying to iframe

1. Verify CSS variables are defined in parent document
2. Check for CORS issues (iframe must be same-origin)
3. Call `applyThemeVarsToChildIframe()` after iframe loads

### Search not working

1. Verify `submoduleSearch` element exists
2. Check that items have `data-child-form` attribute
3. Ensure `.sidebar-item__title` elements contain searchable text

## Migration from Dashboard.js

If migrating from the old dashboard.js implementation:

1. Replace function calls:
   - `openChildForm()` ? `SidebarManager.openChildForm()`
   - `closeChildForm()` ? `SidebarManager.closeChildForm()`
   - `resetToDefaultState()` ? `SidebarManager.resetToDefaultState()`
   - `updateBadgeCounts()` ? `SidebarManager.updateBadgeCounts()`

2. Update state management:
   ```javascript
// Old
   window.AccountMaintenanceState.isAccountLoaded = true;
   
   // New
   SidebarManager.setMainRecordLoaded(true, accountId);
   ```

3. Remove duplicate code from your module files

## API Reference

### Methods

| Method | Parameters | Description |
|--------|-----------|-------------|
| `init(options)` | `{ moduleName, isMainRecordLoaded, primaryRecordId }` | Initialize sidebar |
| `openChildForm(url, options)` | `url: string, options: object` | Open submodule overlay |
| `closeChildForm()` | - | Close current submodule |
| `resetToDefaultState()` | - | Reset sidebar and close forms |
| `setMainRecordLoaded(isLoaded, id)` | `isLoaded: boolean, id: string` | Update record state |
| `getState()` | - | Get current state object |
| `toggleChildExpand()` | - | Toggle overlay expand/collapse |
| `updateBadgeCounts()` | - | Recalculate badge counts |
| `setSectionOpen(section, isOpen)` | `section: Element, isOpen: boolean` | Control section state |
| `applyThemeVarsToChildIframe()` | - | Apply theme to iframe |

## License

Internal use only - Part of Kairo Core Banking System

## Support

For issues or questions, contact the development team.
