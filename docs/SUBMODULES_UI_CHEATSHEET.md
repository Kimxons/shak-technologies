# Account Notes - UI/UX Gold Standard Cheatsheet

**Version**: 1.0 | **Date**: February 2, 2026  
**Purpose**: Single source of truth for replicating Account Notes UI in other submodules  
**Reference Module**: `public/modules/account-maintenance/DataEntry/account-notes.html`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Window Structure](#window-structure)
3. [Title Bar (Header)](#title-bar-header)
4. [Form Layout](#form-layout)
5. [Form Sections](#form-sections)
6. [Audit Section](#audit-section)
7. [Action Panel](#action-panel)
8. [Typography & Colors](#typography--colors)
9. [Spacing & Sizing](#spacing--sizing)
10. [States & Behaviors](#states--behaviors)
11. [CSS Classes Reference](#css-classes-reference)

---

## Overview

Account Notes is a lightweight submodule that demonstrates the **gold standard** for:
- Minimal, clean form layout
- Proper audit trail display
- Professional visual hierarchy
- Disabled-state handling
- Read-only field styling

**Key Characteristics**:
- Single primary field (textarea for notes)
- Behind-the-Scene section (always present)
- Collapsible audit section
- Floating action panel on the right
- Status bar at bottom
- Loading overlay for async operations
ui
---

## Window Structure

### Root Element
```html
<div class="window">
  <!-- All content goes here -->
</div>
```

**CSS**: `.window` enforces `filter: none !important` to prevent blur/filter stacking.

### Main Layout
```html
<div class="window">
  <div class="am-header"><!-- Title bar --></div>
  <main class="main-container">
    <div class="form-content">
      <!-- Form sections and cards -->
    </div>
    <div class="action-panel">
      <!-- Action buttons -->
    </div>
  </main>
  <div class="am-message-panel"><!-- Toast messages --></div>
  <div class="loading-overlay"><!-- Spinner overlay --></div>
</div>
```

---

## Title Bar (Header)

### HTML Structure
```html
<div class="am-header" role="banner" aria-label="Window title bar">
  <div class="am-header__left">
    <i class="bi bi-journal-text am-header__icon" aria-hidden="true"></i>
    <span class="am-header__title">Account Notes</span>
  </div>
  <div class="am-header__right" role="toolbar" aria-label="Window controls">
    <button class="am-btn" type="button" data-action="refresh" title="Refresh" aria-label="Refresh data">
      <i class="bi bi-arrow-clockwise"></i>
    </button>
    <button class="am-btn" type="button" data-action="maximize" title="Maximize" aria-label="Maximize window">
      <i class="bi bi-square"></i>
    </button>
    <button class="am-btn am-btn--close" type="button" data-action="close" title="Close" aria-label="Close window">
      <i class="bi bi-x-lg"></i>
    </button>
  </div>
</div>
```

### Styling (styles.css lines 18-101)

| Property | Value | Notes |
|----------|-------|-------|
| Display | `flex` | Horizontal layout |
| Justify | `space-between` | Left and right sections separated |
| Align | `center` | Vertical center alignment |
| Background | `linear-gradient(180deg, #4a7c95 0%, #3d6a80 100%)` | Blue-teal gradient |
| Color | `#fff` | White text |
| Height | Auto (implicit) | ~32-36px based on content |
| Padding | Implicit via button sizing | |
| Filters | `filter: none !important` | No blur/effects |

### Left Section (`.am-header__left`)
- Display: `flex`
- Gap: `10px`
- Align items: `center`
- **Icon** (`.am-header__icon`): `font-size: 16px`
- **Title** (`.am-header__title`):
  - `font-size: 14px`
  - `font-weight: 700`
  - `text-transform: uppercase`
  - `letter-spacing: 1px`
  - `color: #ffffff !important`

### Right Section (`.am-header__right`)
- Display: `flex`
- Gap: `4px` (compact button spacing)
- Align items: `center`

#### Buttons (`.am-btn`)
```css
.am-header__right .am-btn {
  background: #ffffff;
  border: 1px solid #e0e0e0;
  color: #3d6a80;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  filter: none !important;
  opacity: 1 !important;
}

.am-header__right .am-btn:hover {
  background: #f5f5f5;
  border-color: #b0b0b0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.am-header__right .am-btn:active {
  background: #eeeeee;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
  transform: scale(0.95);
}

.am-header__right .am-btn i {
  font-size: 14px;
}

/* CLOSE BUTTON - EXCEPTION: Red background */
.am-header__right .am-btn--close {
  background: #e74c3c;
  border-color: #c0392b;
  color: #ffffff;
}

.am-header__right .am-btn--close:hover {
  background: #c0392b;
  border-color: #a93226;
}

.am-header__right .am-btn--close:active {
  background: #a93226;
}
```

**Button Sequence**: Refresh → Maximize → Close (left to right)

---

## Form Layout

### Main Container Structure
```html
<main class="main-container" aria-label="Account Notes form">
  <div class="form-content" role="region" aria-label="Account Notes form">
    <div class="form-card" data-main-form>
      <!-- Form sections -->
    </div>
  </div>
  <div class="action-panel">
    <!-- Buttons -->
  </div>
</main>
```

### CSS Layout
```css
.main-container {
  display: flex;
  flex-direction: row;
  width: 100%;
  height: calc(100vh - /* header height */);
}

.form-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  /* Scrollable form content */
}

.form-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.action-panel {
  width: var(--action-panel-width);  /* ~110-150px */
  flex: 0 0 var(--action-panel-width);
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(8px);
  border-left: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.03);
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
```

**Key Points**:
- Form is **flex: 1** (takes all available space)
- Action panel is **fixed width** (typically 130-150px)
- Both are horizontally adjacent
- Action panel scrolls independently if content exceeds height

---

## Form Sections

### Section Structure
```html
<div class="form-section" data-section="note-details">
  <!-- Collapsible header -->
  <div class="section-header" data-section-toggle>
    <span class="section-header__title"><i class="bi bi-journal-text"></i>Note Details</span>
    <!-- Optional toggle button appears only on collapsible sections -->
  </div>
  
  <!-- Collapsible content -->
  <div class="section-content" data-section-content>
    <!-- Form fields -->
  </div>
</div>
```

### Section Header Styling
```css
.form-card .section-header {
  background: linear-gradient(135deg, var(--theme-primary) 0%, var(--theme-primary-hover) 100%);
  color: var(--theme-contrast-text) !important;
  padding: 5px 14px !important;
  font-weight: 600 !important;
  font-size: 10px !important;
  letter-spacing: 0.4px !important;
  min-height: 28px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  border-radius: 0 !important;
  cursor: pointer;
  transition: background 0.2s ease;
  user-select: none;
}

.form-card .section-header:hover {
  background: linear-gradient(135deg, var(--theme-primary-hover) 0%, 
    color-mix(in srgb, var(--theme-primary-hover) 85%, #000000 15%) 100%);
}
```

| Property | Value |
|----------|-------|
| Background | Primary color gradient |
| Text Color | Contrast text (usually white) |
| Font Size | 10px |
| Font Weight | 600 |
| Letter Spacing | 0.4px |
| Text Transform | Uppercase (via `.section-header__title`) |
| Min Height | 28px |
| Padding | 5px 14px |
| Border Radius | 0px (flush with card edges) |

### Section Title (`.section-header__title`)
```css
.form-card .section-header__title {
  display: flex;
  align-items: center;
  gap: 6px;
  text-transform: uppercase;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
}

.form-card .section-header__title i {
  font-size: 11px;
  opacity: 0.85;
}
```

### Section Toggle Button (`.section-toggle-btn`)
```css
.section-toggle-btn {
  background: transparent;
  border: none;
  color: var(--theme-contrast-text);
  padding: 4px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.15);
}

.section-toggle-btn i {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 14px;
}

/* Collapsed state: chevron rotates 180° */
.form-section.collapsed .section-toggle-btn i {
  transform: rotate(180deg);
}

/* Collapsed content: smooth collapse animation */
.form-section.collapsed .section-content {
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
  opacity: 0;
  overflow: hidden;
}

/* Expanded content: smooth expand animation */
.form-section .section-content {
  max-height: 2000px;
  opacity: 1;
  transition: max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s ease,
              padding 0.3s ease;
}
```

### Section Content (`.section-content`)
```css
.section-content {
  display: flex;
  flex-direction: column;
  width: 100%;
  /* padding inherited from parent context */
}
```

### Form Row & Columns (Two-Column Layout)
```html
<!-- Two equal columns side-by-side -->
<div class="form-row">
  <div class="col">
    <label class="label-blue" for="field1">Field Label 1</label>
    <input id="field1" type="text" class="bs-input-text form-control" />
  </div>
  <div class="col">
    <label class="label-blue" for="field2">Field Label 2</label>
    <input id="field2" type="text" class="bs-input-text form-control" />
  </div>
</div>

<!-- Single column (full-width) -->
<div class="form-row">
  <div class="col">
    <label class="label-blue" for="notes">Notes</label>
    <textarea id="notes" name="notes" class="bs-textarea" placeholder="Enter account notes..."></textarea>
  </div>
  <div class="col"></div>  <!-- Empty column provides visual balance -->
</div>
```

```css
.form-row {
  display: flex;
  flex-direction: row;
  gap: 12px;
  padding: 14px;
}

.col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1 1 50%;  /* Two equal columns */
}

.bs-textarea {
  flex: 1;
  height: 100%;
  min-height: 400px;
  resize: vertical;
}
```

**Layout Pattern**:
- **Two-column layout**: Two `<div class="col">` containers side-by-side, each takes 50% width
- **Single-column layout**: One `<div class="col">` with empty `<div class="col"></div>` for balance (provides visual symmetry)
- **All fields in 2-column pairs** whenever possible (width permitting)
- Flexible: One empty col on right for future expansion

---

## Audit Section

### HTML Structure
```html
<div class="form-section" data-section="behind-scene">
  <div class="section-header" data-section-toggle>
    <span class="section-header__title"><i class="bi bi-gear"></i>Behind the Scene</span>
    <button type="button" class="section-toggle-btn" aria-label="Toggle Behind the Scene" aria-expanded="true">
      <i class="bi bi-chevron-up"></i>
    </button>
  </div>
  <div class="section-content" data-section-content>
    <div class="audit-section audit-section--summary">
      <div class="audit-cell">
        <span class="audit-label">Created By</span>
        <span class="audit-value" id="CreatedBy" data-field="createdBy"></span>
      </div>
      <div class="audit-cell">
        <span class="audit-label">Modified By</span>
        <span class="audit-value" id="ModifiedBy" data-field="modifiedBy"></span>
      </div>
      <!-- ... more audit cells ... -->
    </div>
  </div>
</div>
```

### Audit Section Styling (maincss.css lines 1640-1670)
```css
.audit-section--summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-auto-rows: auto;
  background: #f9fbfd;
  border-radius: 8px;
  border: 1px solid var(--theme-border);
  overflow: hidden;
  padding: 0;
  margin: 0;
}

.audit-section--summary .audit-cell {
  padding: 10px 14px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  border-right: 1px solid var(--theme-border);
}

/* Remove right border from every 3rd cell (last column) */
.audit-section--summary .audit-cell:nth-child(3n) {
  border-right: none;
}

/* Add top border to cells in rows 2+ */
.audit-section--summary .audit-cell:nth-child(n + 4) {
  border-top: 1px solid var(--theme-border);
}

.audit-section--summary .audit-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--am-text-muted);
  letter-spacing: 0.1px;
  text-transform: uppercase;
}

.audit-section--summary .audit-value {
  font-size: 13px;
  font-weight: 800;
  color: var(--theme-text-primary);
  word-break: break-word;
  line-height: 1.2;
}
```

### Key Characteristics
- **Grid**: 3 columns, auto rows
- **Cell Spacing**: 10px top/bottom, 14px left/right
- **Borders**: Right and bottom borders between cells (removed on edges)
- **Background**: Light blue (`#f9fbfd`)
- **Label**: Small (12px), bold (600), uppercase, muted color
- **Value**: Larger (13px), extra bold (800), primary text color

### Typical Layout (6 cells = 2 rows × 3 columns)
```
┌─────────────┬─────────────┬──────────────┐
│ Created By  │ Modified By │ Supervised By│
├─────────────┼─────────────┼──────────────┤
│ Created On  │ Modified On │ Supervised On│
└─────────────┴─────────────┴──────────────┘
```

---

## Action Panel

### HTML Structure
```html
<div class="action-panel" aria-label="Form actions">        
  <div class="action-buttons">
    <button class="btn-action btn-view" type="button" data-action="view">
      <i class="bi bi-eye me-1"></i>View
    </button>          
    <button class="btn-action" type="button" data-action="edit">
      <i class="bi bi-pencil-square me-1"></i>Edit
    </button>
    <button class="btn-action" type="button" data-action="save">
      <i class="bi bi-check-lg me-1"></i>Save
    </button>
    <button class="btn-action btn-cancel" type="button" data-action="cancel">
      <i class="bi bi-x-lg me-1"></i>Cancel
    </button>          
  </div>
</div>
```

### Styling (maincss.css lines 1804-1880)

#### Base Button (`.btn-action`)
```css
.action-panel .btn-action {
  padding: 6px 6px !important;
  font-size: 10px !important;
  border: 1px solid var(--am-border-light) !important;
  background: var(--am-bg-card) !important;
  color: var(--am-text-secondary) !important;
  border-radius: 4px !important;
  cursor: pointer;
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 2px !important;
  transition: all 0.15s ease !important;
  width: 100%;
  font-weight: 500 !important;
  box-shadow: none !important;
  height: 50px !important;
  min-height: 50px !important;
  line-height: 1.1 !important;
}

.action-panel .btn-action i {
  font-size: 16px !important;
  line-height: 1 !important;
}
```

| Property | Value |
|----------|-------|
| Height | 50px (fixed) |
| Width | 100% (fill panel) |
| Padding | 6px (compact) |
| Gap | 2px (icon-text spacing) |
| Font Size | 10px |
| Font Weight | 500 |
| Icon Size | 16px |
| Border Radius | 4px |
| Transition | 0.15s ease |
| Layout | Flex column (icon over text) |

#### Default Button (`btn-view`)
```css
.action-panel .btn-action.btn-view,
.action-panel .btn-action[data-action="view"] {
  background: linear-gradient(180deg, var(--am-primary) 0%, var(--theme-primary-hover) 100%) !important;
  border-color: transparent !important;
  color: var(--theme-contrast-text) !important;
  font-weight: 600 !important;
}

.action-panel .btn-action.btn-view:hover {
  background: linear-gradient(180deg, var(--theme-primary-hover) 0%, #2d5566 100%) !important;
  border-color: transparent !important;
  color: var(--theme-contrast-text) !important;
}

.action-panel .btn-action.btn-view:focus-visible {
  box-shadow: 0 0 0 2px rgba(74, 124, 149, 0.5) !important;
}
```

**Characteristics**:
- Primary color gradient background
- White/contrast text
- Receives initial focus
- Enter key triggers this button

#### Standard State
```css
.action-panel .btn-action:hover {
  background: rgba(74, 124, 149, 0.06) !important;
  border-color: var(--am-primary) !important;
  color: var(--am-primary) !important;
  box-shadow: none !important;
  transform: none;
}
```

#### Disabled State
```css
.action-panel .btn-action:disabled,
.action-panel .btn-action:disabled:hover {
  background: var(--am-bg-card) !important;
  border-color: var(--am-border-light) !important;
  color: var(--am-text-muted) !important;
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none !important;
  transform: none !important;
}
```

#### Focus/Active States
```css
.action-panel .btn-action:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(74, 124, 149, 0.18) !important;
}

.action-panel .btn-action:active {
  background: rgba(74, 124, 149, 0.1) !important;
}

.action-panel .btn-action:focus-visible {
  outline: none !important;
  box-shadow: 0 0 0 2px var(--am-primary) !important;
}
```

#### Save Button (`.btn-save`)
```css
.action-panel .btn-action.btn-save,
.action-panel .btn-action[data-action="save"] {
  background: var(--am-success-light) !important;
  border-color: var(--am-success) !important;
  color: var(--am-success-dark) !important;
  font-weight: 600 !important;
}

.action-panel .btn-action.btn-save:hover {
  background: var(--am-success) !important;
  border-color: var(--am-success) !important;
  color: white !important;
}
```

#### Cancel Button (`.btn-cancel`)
```css
.action-panel .btn-action.btn-cancel,
.action-panel .btn-action[data-action="cancel"] {
  background: var(--am-danger-light) !important;
  border-color: var(--am-danger) !important;
  color: var(--am-danger-dark) !important;
  font-weight: 600 !important;
}

.action-panel .btn-action.btn-cancel:hover {
  background: var(--am-danger) !important;
  border-color: var(--am-danger) !important;
  color: white !important;
}
```

### Button Sequence & Ordering
```
1. View (default, primary action)
2. Edit
3. Save (hidden when not editing)
4. Cancel (hidden when not editing)
```

---

## Typography & Colors

### Font Stack
```css
--kairo-font-family: 'Segoe UI', Tahoma, Arial, sans-serif
```

### Font Sizes (by component)
| Component | Size | Weight | Letter Spacing |
|-----------|------|--------|-----------------|
| Header Title | 14px | 700 | 1px |
| Section Header | 10px | 600 | 0.4px |
| Section Title Icon | 11px | - | - |
| Field Label | 12px | 600 | 0.1px |
| Audit Label | 12px | 600 | 0.1px |
| Audit Value | 13px | 800 | - |
| Button Text | 10px | 500/600 | - |
| Button Icon | 16px | - | - |
| Textarea | 14px | 400 | - |

### Color Palette

| Component | Variable | Hex Value | Usage |
|-----------|----------|-----------|-------|
| Header BG | gradient | #4a7c95 → #3d6a80 | Title bar |
| Section Header BG | `var(--theme-primary)` | Primary color | Active section |
| Primary Text | `var(--theme-text-primary)` | #2c3e50 | Main content |
| Muted Text | `var(--am-text-muted)` | Gray | Labels, secondary |
| Audit BG | - | #f9fbfd | Audit section |
| Audit Border | `var(--theme-border)` | Light gray | Cell dividers |
| Success | `var(--am-success)` | Green | Save button |
| Danger | `var(--am-danger)` | Red | Cancel button |
| Info | `var(--am-info)` | Blue | Messages |
| Contrast Text | `var(--theme-contrast-text)` | #ffffff | On dark backgrounds |

### CSS Variables Used
```css
--theme-primary: Primary color for section headers
--theme-primary-hover: Darker primary for hover states
--theme-contrast-text: Text color on primary backgrounds (usually white)
--theme-text-primary: Main text color
--theme-border: Border color for cards/sections
--am-primary: Primary action color (#4a7c95)
--am-text-muted: Muted/label text
--am-bg-card: Card/button background
--am-border-light: Light borders
--am-success: Success state color
--am-danger: Danger/error color
```

---

## Spacing & Sizing

### Padding Standards
| Element | Padding | Notes |
|---------|---------|-------|
| Header | Implicit | 8px vertical (via buttons) |
| Section Header | 5px 14px | Compact header |
| Section Content | 14px | Form row padding |
| Audit Cell | 10px 14px | Centered cell content |
| Button | 6px | Button padding |
| Form Row | 12px gap | Between form elements |

### Heights
| Element | Height | Notes |
|---------|--------|-------|
| Header | ~32-36px | Auto from content |
| Section Header | 28px | Min height for consistency |
| Button | 50px | Fixed action panel button |
| Textarea | min-height: 400px | Expandable |

### Widths
| Element | Width | Notes |
|---------|-------|-------|
| Action Panel | 110-150px | `var(--action-panel-width)` |
| Form Content | Flex: 1 | Takes remaining space |
| Section Content | 100% | Full card width |
| Audit Cell | 1fr (grid) | 3 equal columns |

### Gaps & Margins
| Element | Gap | Notes |
|---------|-----|-------|
| Header sections | 10px left, 4px right buttons | Compact buttons |
| Form row | 12px | Between field groups |
| Audit cells | 6px vertical | Label-value spacing |
| Button text/icon | 2px | Icon above text |
| Action panel buttons | 10px | Between buttons |

---

## States & Behaviors

### Form States

#### View State (Default)
- All inputs are **disabled** (read-only)
- **View** button is active (default action)
- Edit, Save, Cancel buttons available
- Fields display with slightly grayed appearance

#### Edit State
- Inputs become **enabled** (editable)
- **Save** and **Cancel** buttons become prominent
- Textarea is editable with full height
- Cursor focus on first editable field

#### Loading State
```html
<div class="loading-overlay" id="loadingOverlay" hidden>
  <div class="loading-spinner">
    <i class="bi bi-arrow-repeat"></i>
    <span>Loading notes...</span>
  </div>
</div>
```
- Overlay covers entire form
- Spinner with rotating icon
- Message below spinner
- Prevents interaction

### Disabled State Behavior
```css
input:disabled,
textarea:disabled,
select:disabled {
  background: var(--am-bg-disabled);
  border-color: var(--am-border-disabled);
  color: var(--am-text-muted);
  cursor: not-allowed;
  opacity: 0.8;
}
```

### Collapsible Sections
- **Expanded**: Content visible, chevron points up
- **Collapsed**: Content hidden (max-height: 0, opacity: 0)
- **Transition**: 0.4s cubic-bezier(0.4, 0, 0.2, 1)
- **Toggle Icon**: Rotates 180°

### Hover States

#### Section Header
```css
.form-card .section-header:hover {
  background: darker-gradient;
  /* Gradient darkens slightly */
}
```

#### Toggle Button
```css
.section-toggle-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  /* Subtle highlight for visual feedback */
}
```

#### Action Buttons
```css
.btn-action:hover {
  background: rgba(74, 124, 149, 0.06);
  border-color: var(--am-primary);
  color: var(--am-primary);
}

/* View button (primary) darkens */
.btn-action.btn-view:hover {
  background: darker-gradient;
  color: white;
}
```

### Focus States

#### Keyboard Navigation
```css
.btn-action:focus-visible {
  outline: none !important;
  box-shadow: 0 0 0 2px var(--am-primary) !important;
  /* Bright ring around button */
}
```

#### Initial Focus
- **View** button receives initial focus
- Indicates it's the default action
- Enter key triggers View button

### Window Control Behaviors

#### Maximize Button Behavior
```javascript
// Maximize toggles form to full screen and collapses sidebar
case 'maximize':
  const windowEl = document.querySelector('.window');
  const isMaximized = windowEl.classList.toggle('maximized');
  
  // Update button icon
  const icon = btn.querySelector('i');
  icon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
  btn.title = isMaximized ? 'Restore' : 'Maximize';
  
  // Notify parent to collapse/expand sidebar
  window.parent.postMessage({ 
    action: 'toggleSidebarForMaximize',
    maximize: isMaximized
  }, '*');
```

**Visual Effects**:
- Form expands to fill available space
- Sidebar collapses (`.collapsed` class added)
- Main container adjusts (`.sidebar-collapsed` class added)
- Icon changes from square to fullscreen-exit
- Restoring reverses all actions

#### Refresh Button Behavior
```javascript
case 'refresh':
  // Clear validation errors
  document.querySelectorAll('[class*="invalid"]').forEach(el => {
    el.classList.remove(...validationClasses);
  });
  // Reload page
  window.location.reload();
```

**Behavior**: Clears form state and reloads data

#### Close Button Behavior
```javascript
case 'close':
  // Notify parent that submodule is closing
  window.parent.postMessage({ 
    action: 'submoduleClosed',
    source: 'Account Documents'  // or module name
  }, '*');
  // Parent removes blur and allows other forms to open
```

### Parent/Child Interaction (Blur & Modal Behavior)

#### When Submodule Opens
1. **Child Form sends message**:
   ```javascript
   window.parent.postMessage({ 
     action: 'submoduleOpened',
     source: 'Account Documents'
   }, '*');
   ```

2. **Parent receives message and**:
   - Applies blur filter to sidebar: `filter: blur(3px)`
   - Disables sidebar interaction: `pointerEvents: none`
   - Stores active submodule reference
   - Blocks opening other submodules with toast message

3. **Visual Result**:
   - Sidebar becomes blurred and unclickable
   - User must interact only with child form
   - Enforces single-submodule-open pattern

#### When Submodule Closes
1. **Child Form sends message**:
   ```javascript
   window.parent.postMessage({ 
     action: 'submoduleClosed',
     source: 'Account Documents'
   }, '*');
   ```

2. **Parent receives message and**:
   - Removes blur filter from sidebar: `filter: none`
   - Re-enables sidebar interaction: `pointerEvents: auto`
   - Clears active submodule reference
   - Allows opening other submodules again

3. **Visual Result**:
   - Sidebar returns to normal clarity
   - Sidebar becomes clickable
   - User can navigate to other submodules

#### When Maximize is Clicked
1. **Child Form sends message**:
   ```javascript
   window.parent.postMessage({ 
     action: 'toggleSidebarForMaximize',
     maximize: true  // or false on restore
   }, '*');
   ```

2. **Parent receives message and**:
   - If maximizing:
     - Adds `.collapsed` class to sidebar
     - Adds `.sidebar-collapsed` class to main container
     - Sets aria-expanded to "false"
   - If restoring:
     - Removes `.collapsed` class from sidebar
     - Removes `.sidebar-collapsed` class from main container
     - Sets aria-expanded to "true"

3. **CSS Effects**:
   ```css
   .window.maximized {
     /* Form takes full window space */
   }
   
   .sidebar.collapsed {
     width: var(--sidebar-collapsed-width); /* ~60px */
     /* Items hidden, only icons visible */
   }
   
   .main-container.sidebar-collapsed {
     /* Flex basis adjusts to fill space */
     flex: 1 1 auto;
   }
   ```

### Read-Only vs Editable

| Aspect | Read-Only | Editable |
|--------|-----------|----------|
| Textarea | Disabled (no cursor) | Enabled (blue focus) |
| Background | Slightly gray | White |
| Border | Light gray | Blue on focus |
| Cursor | Not-allowed | Text/pointer |
| Opacity | 0.8 | 1.0 |
| User Selection | None | Normal |

---

## CSS Classes Reference

### Core Classes
```css
.window                 /* Root container, no filters */
.am-header              /* Title bar */
.am-header__left        /* Left section (icon + title) */
.am-header__right       /* Right section (buttons) */
.am-header__icon        /* Icon in title */
.am-header__title       /* Title text */
.am-btn                 /* Header button */
.am-btn--close          /* Close button (red) */
.am-btn i               /* Icon in button */

.main-container         /* Main flex container */
.form-content           /* Form area (scrollable) */
.form-card              /* Card wrapper */
.form-section           /* Section block */
.section-header         /* Section title bar */
.section-header__title  /* Title text */
.section-toggle-btn     /* Collapse/expand button */
.section-content        /* Section body */
.form-row               /* Row of fields */
.col                    /* Column in row */

.audit-section          /* Audit container */
.audit-section--summary /* Summary audit grid */
.audit-cell             /* Grid cell */
.audit-label            /* Label text */
.audit-value            /* Value text */

.action-panel           /* Button panel */
.action-buttons         /* Button container */
.btn-action             /* Action button */
.btn-action.btn-view    /* View button (primary) */
.btn-action.btn-save    /* Save button (green) */
.btn-action.btn-cancel  /* Cancel button (red) */
.btn-action.btn-edit    /* Edit button */
.btn-action.btn-add     /* Add button */

.am-message-panel       /* Toast/message area */
.loading-overlay        /* Loading spinner overlay */
.loading-spinner        /* Spinner component */

.label-blue             /* Field label */
.bs-textarea            /* Textarea control */
.bs-input-text          /* Text input */
```

### State Classes
```css
.form-section.collapsed    /* Section is collapsed */
.btn-action:disabled       /* Button is disabled */
.btn-action:hover          /* Button hover state */
.btn-action:active         /* Button active/pressed */
.btn-action:focus-visible  /* Button keyboard focus */
input:disabled             /* Disabled input */
textarea:disabled          /* Disabled textarea */
```

### Data Attributes (Important for JS)
```html
data-section="behind-scene"    <!-- Section identifier -->
data-section-toggle            <!-- Header is clickable -->
data-section-content           <!-- Content container -->
data-action="view"             <!-- Button action type -->
data-action="edit"
data-action="save"
data-action="cancel"
data-main-form                 <!-- Main form card -->
data-field="createdBy"         <!-- Audit field mapping -->
```

---

## Implementation Checklist

When replicating Account Notes in another submodule:

### ✅ HTML Structure
- [ ] Root `.window` wrapper with `filter: none !important`
- [ ] `.am-header` with left (icon + title) and right (3 buttons)
- [ ] `.main-container` flex layout
- [ ] `.form-content` scrollable area
- [ ] `.form-card` for form sections
- [ ] `.action-panel` on the right
- [ ] Message panel and loading overlay at bottom

### ✅ Form Sections
- [ ] Each section has `.section-header` (clickable toggle)
- [ ] Header contains icon, title, and toggle button
- [ ] `.section-content` wraps all fields
- [ ] Two-column layout with empty right column for balance
- [ ] At least one "Behind the Scene" section

### ✅ Audit Section
- [ ] `.audit-section--summary` grid layout
- [ ] 6 audit cells (Created By/On, Modified By/On, Supervised By/On)
- [ ] 3-column grid that wraps to 2 rows
- [ ] Proper borders (right on columns, top on rows 2+)

### ✅ Action Panel
- [ ] Fixed width (110-150px)
- [ ] 4 buttons: View, Edit, Save, Cancel
- [ ] View is default (primary styling, receives focus)
- [ ] Buttons stack vertically
- [ ] Proper disabled/enabled states

### ✅ Styling
- [ ] All colors from CSS variables (not hardcoded)
- [ ] Section headers use primary color gradient
- [ ] Audit section has light blue background (#f9fbfd)
- [ ] Proper font sizes and weights applied
- [ ] Transitions for collapsible sections (0.4s)
- [ ] Focus rings for keyboard navigation

### ✅ Behavior
- [ ] Sections are collapsible (click header to toggle)
- [ ] Toggle icon rotates 180°
- [ ] Content collapses smoothly (not instant)
- [ ] Buttons have proper hover/active/focus states
- [ ] Read-only fields are visually distinct from editable
- [ ] Loading overlay appears during async operations

### ✅ Accessibility
- [ ] ARIA labels on sections and buttons
- [ ] Proper heading hierarchy (data-section-toggle)
- [ ] Focus indicators visible (outline + shadow)
- [ ] Icons have `aria-hidden="true"`
- [ ] Buttons have `type="button"` (not form submit)
- [ ] Role attributes on main containers

---

## Common Gotchas & Tips

### ❌ Don't
- Don't add inline styles (use CSS classes)
- Don't change button IDs or data-action values
- Don't modify the action button sequence
- Don't add shadows or filters to `.window`
- Don't use different color schemes for consistency
- Don't hard-code colors (use CSS variables)
- Don't make audit sections editable
- Don't remove the action panel
- Don't combine form sections without proper structure
- Don't forget the toggle button on collapsible sections

### ✅ Do
- Use consistent spacing (14px padding, 12px gaps)
- Apply theme variables for colors
- Keep section headers uppercase and bold
- Make View button the default action
- Ensure loading overlay covers entire form
- Use proper grid for audit sections (3 columns)
- Include proper transition timings (0.4s for collapse/expand)
- Test keyboard navigation (Tab, Enter, Space)
- Match font sizes exactly (10px labels, 14px body)
- Provide visual feedback for all interactions
-Remove any Inline or form specific css, only reference to styling should be from styles.css

### Performance Notes
- Section collapsing uses `max-height` + `opacity` (GPU friendly)
- Transitions use `cubic-bezier(0.4, 0, 0.2, 1)` (standard easing)
- No large shadows or blur filters (performance impact)
- Loading overlay uses simple spinner (not animated GIF)

---

## Quick Reference: Copy-Paste Snippets

### Header
```html
<div class="am-header" role="banner" aria-label="Window title bar">
  <div class="am-header__left">
    <i class="bi bi-journal-text am-header__icon" aria-hidden="true"></i>
    <span class="am-header__title">Module Name</span>
  </div>
  <div class="am-header__right" role="toolbar" aria-label="Window controls">
    <button class="am-btn" type="button" data-action="refresh" title="Refresh" aria-label="Refresh data"><i class="bi bi-arrow-clockwise"></i></button>
    <button class="am-btn" type="button" data-action="maximize" title="Maximize" aria-label="Maximize window"><i class="bi bi-square"></i></button>
    <button class="am-btn am-btn--close" type="button" data-action="close" title="Close" aria-label="Close window"><i class="bi bi-x-lg"></i></button>
  </div>
</div>
```

### Form Section with Toggle
```html
<div class="form-section" data-section="section-id">
  <div class="section-header" data-section-toggle>
    <span class="section-header__title"><i class="bi bi-icon-name"></i>Section Title</span>
    <button type="button" class="section-toggle-btn" aria-label="Toggle Section" aria-expanded="true">
      <i class="bi bi-chevron-up"></i>
    </button>
  </div>
  <div class="section-content" data-section-content>
    <!-- Fields go here -->
  </div>
</div>
```

### Action Buttons
```html
<div class="action-panel" aria-label="Form actions">        
  <div class="action-buttons">
    <button class="btn-action btn-view" type="button" data-action="view"><i class="bi bi-eye me-1"></i>View</button>          
    <button class="btn-action" type="button" data-action="edit"><i class="bi bi-pencil-square me-1"></i>Edit</button>
    <button class="btn-action" type="button" data-action="save"><i class="bi bi-check-lg me-1"></i>Save</button>
    <button class="btn-action btn-cancel" type="button" data-action="cancel"><i class="bi bi-x-lg me-1"></i>Cancel</button>          
  </div>
</div>
```

### Audit Grid
```html
<div class="audit-section audit-section--summary">
  <div class="audit-cell">
    <span class="audit-label">Created By</span>
    <span class="audit-value" id="CreatedBy" data-field="createdBy">-</span>
  </div>
  <div class="audit-cell">
    <span class="audit-label">Modified By</span>
    <span class="audit-value" id="ModifiedBy" data-field="modifiedBy">-</span>
  </div>
  <div class="audit-cell">
    <span class="audit-label">Supervised By</span>
    <span class="audit-value" id="SupervisedBy" data-field="supervisedBy">-</span>
  </div>
  <div class="audit-cell">
    <span class="audit-label">Created On</span>
    <span class="audit-value" id="CreatedOn" data-field="createdOn">-</span>
  </div>
  <div class="audit-cell">
    <span class="audit-label">Modified On</span>
    <span class="audit-value" id="ModifiedOn" data-field="modifiedOn">-</span>
  </div>
  <div class="audit-cell">
    <span class="audit-label">Supervised On</span>
    <span class="audit-value" id="SupervisedOn" data-field="supervisedOn">-</span>
  </div>
</div>
```

---

## File References

### Source Files
- **HTML**: `public/modules/account-maintenance/DataEntry/account-notes.html`
- **CSS**: `public/assets/css/styles.css` (lines 1-120 for header)
- **CSS**: `public/assets/css/maincss.css` (lines 760-1900 for sections/buttons)
- **JS**: `public/modules/account-maintenance/DataEntry/account-notes.js`

### Related Modules Using Same Pattern
- Account Classification
- Account Nomination
- Account Freeze/Release
- Account Activation
- User Defined Fields
- Account Interest Rates
- Card Maintenance

---

## Conclusion

Account Notes demonstrates the **proven, production-ready UI pattern** for data entry submodules. Use this cheatsheet as the definitive reference when:

1. Creating new data entry forms
2. Refactoring existing submodules
3. Maintaining visual consistency
4. Training new developers
5. Code reviewing submissions

**Key Principle**: If unsure about styling, spacing, or layout—copy from Account Notes.

---

**Last Updated**: February 2, 2026  
**Maintenance**: Update this document whenever Account Notes styling changes  
**Owner**: UI/UX Team
