# UI Standardization Cheat Sheet (Non-Negotiable Rulebook)

## Primary Goal
Every Data Entry, View, and Submodule form must be visually identical to Account Maintenance (layout, spacing, alignment, typography, colors, borders, shadows, buttons, collapsible behavior, action rail, messages, hierarchy). Zero visual difference.

## Absolute Constraints
- Only one stylesheet: styles.css (imports maincss.css). No additional CSS files, no inline styles, no <style> blocks, no per-form overrides.
- Do not rename controls, IDs, names, bindings, validation, or logic. No service/business logic changes.
- Reuse existing classes only; no new classes.

## Mandatory Layout Structure
- Root shell: .window
  - .am-header (title bar) with window controls (Refresh, Minimize, Maximize, Close)
  - .main-container (flex row)
    - .sidebar (left submodules panel)
    - .form-content (main content area)
    - .action-panel (right action rail)

## Section Container Pattern
- Wrap form content in .form-card.
- Each logical block: .form-section
  - Header: .section-header with .section-header__title and .section-toggle-btn (chevron). Icons/padding must match Account Maintenance.
  - Body: .section-content.

## Form Grid Usage
- Use the same grid classes: .form-row.two-col and .form-row.four-col; rely on existing responsive rules in styles.css.
- Labels: same label class (e.g., .label-blue) and alignment as Account Maintenance.
- Controls: textboxes, selects, checkboxes, textareas, search fields, readonly fields all use the existing Account Maintenance classes. No new classes.

## Action Rail Usage
- Right rail is .action-panel, third child of .main-container.
- Buttons live in .action-buttons (and nav groups if used).
- Button sizes, colors, spacing, and icons must match Account Maintenance defaults in styles.css. No new variants.

## Button Rules
- Reuse existing button classes (e.g., .btn-action, .btn-view, .btn-cancel, .btn-nav).
- Keep icon + text spacing identical; use the same markup pattern as Account Maintenance.

## Message Placement
- Use the shared message component (e.g., .am-message-panel) in the same location as Account Maintenance.
- No inline error text; no custom banners.

## Behind the Scene (Audit) Rules
- Must render as a multi-column summary grid using the shared audit pattern.
- Use .audit-section (or .audit-section--summary if present) with labels above values and the shared .audit-label / .audit-value styling.
- Three columns on desktop; only collapse per existing responsive rules in styles.css. No stacked single-column variants unless the global responsive rules apply.

## Checklist Before Submitting a Form
1) Layout: .window → .am-header → .main-container with .sidebar, .form-content, .action-panel in that order.
2) Sections: Each block is a .form-section with .section-header + .section-toggle-btn, and .section-content.
3) Grids: Use .form-row.two-col/.four-col as in Account Maintenance; labels and controls use the same classes.
4) Controls: All inputs/selects/checkboxes/textareas/search/readonly use the exact Account Maintenance classes.
5) Action Rail: Present on the right as .action-panel with standard buttons/icons and spacing.
6) Messages: Use the shared message area (.am-message-panel); no inline or custom banners.
7) Behind the Scene: Three-column audit summary with labels above values, using the shared audit classes; no custom layouts.
8) Styles: Only styles.css (imports maincss.css); no new CSS, no inline styles, no overrides.
9) Visual Match: Spacing, typography, colors, borders, shadows, collapsible behavior, and buttons must be indistinguishable from Account Maintenance. If it looks different, it is wrong.
