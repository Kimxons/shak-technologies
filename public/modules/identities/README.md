# Identities - Client Maintenance Module

## Overview
This module provides the **Identities - Client Maintenance** screen, which is a conversion of the Client Limit Verification form to the identities workflow. The screen maintains the same format and field positions as specified in the original screenshot.

## Files Created

### 1. HTML Template
- **Location**: `public/modules/identities/client-maintenance.html`
- **Purpose**: Main form template with all fields displayed in the exact layout from the screenshot
- **Fields Included**:
  - **Header Section**:
    - Branch ID (with default value "0101")
    - Head Office (read-only, default "Head Office")
    - WorkFlow Type ID
    - Application ID (with search button)
    - Application Date (date picker)
    - Client ID
  - **Behind The Scene Section**:
    - Loan Type
    - Created By
    - Created On (read-only)
    - Verified By
    - Verified On (read-only)
  - **Action Buttons**:
    - View
    - Verify
    - Cancel

### 2. JavaScript Logic
- **Location**: `public/assets/js/pages/identities/client-maintenance.js`
- **Purpose**: Handles all form interactions and business logic
- **Features**:
  - Form initialization and field binding
  - View mode - display record data
  - Verify mode - mark record as verified with timestamp
  - Cancel mode - reset form to initial state
  - Client data loading when Client ID is entered
  - Form validation for required fields
  - Toast notifications for user feedback
  - Read-only toggle for form fields

### 3. CSS Styling
- **Location**: `public/assets/css/styles.css` (appended)
- **Purpose**: Styling specific to identities-client-maintenance page
- **Features**:
  - 2-column grid layout for header fields
  - 2-column grid layout for "Behind The Scene" section
  - Blue labels for header section (#1d4ed8)
  - Gray labels for "Behind The Scene" section (#374151)
  - Styled action buttons with hover effects
  - Right-side actions rail layout
  - Responsive design for mobile/tablet devices
  - Proper spacing and typography

## Layout Details

### Header Grid (2 columns)
```
[Branch ID]          [Head Office]
[WorkFlow Type ID]   [Application ID (with search)]
[Application Date]   [Client ID]
```

### Behind The Scene Grid (2 columns)
```
[Loan Type]     [Created By]
[Created On]    [Verified By]
[Verified On]   [Additional fields...]
```

### Right Actions Rail
- View button
- Verify button
- Cancel button

## How to Use

### 1. Opening the Page
The page can be accessed directly via the URL:
```
/public/modules/identities/client-maintenance.html
```

### 2. Form Operations

**View Mode**:
- Click the "View" button to display existing record data
- Fields become read-only
- Shows existing client information

**Verify Mode**:
- Click the "Verify" button to verify a record
- Automatically populates "Verified By" with current user
- Automatically sets "Verified On" timestamp
- Shows success notification

**Cancel**:
- Click the "Cancel" button to reset the form
- Clears all fields
- Resets to initial state

### 3. Client Data Loading
- Enter a Client ID and press Tab or click elsewhere
- System automatically loads associated client data
- Populates "Loan Type", "Created By", and "Created On" fields

## Styling Consistency

All styling matches the existing application theme:
- Uses Bootstrap 5.3.3 for base styling
- Bootstrap Icons for button icons
- Consistent color palette with existing forms
- Same label styling and typography
- Proper spacing and alignment

## Responsive Behavior

The layout is fully responsive:
- On desktop (>1024px): Two-column grid for fields
- On tablet/mobile (<1024px): Single-column layout
- Action buttons stack vertically on smaller screens

## Form Validation

Required fields:
- Branch ID
- Application ID
- Client ID

The system validates these before allowing verify operations.

## Integration Points

The module is designed to integrate with:
- `window.ClientService` - for client data operations
- `window.SearchService` - for search functionality
- `window.getAuthSession()` - for user authentication
- Existing core API infrastructure

## Notes

- All timestamps use local browser time formatting
- Form is non-submit (no actual backend integration in this version)
- Can be extended with actual API calls as needed
- CSS classes follow the existing naming convention (icm-* for identities-client-maintenance)
