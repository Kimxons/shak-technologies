# Alter Button Implementation - Rule Details

## Summary
Fixed the Alter button functionality to properly handle editing of grid records. The button now:
1. Populates dropdowns with values from the selected grid row
2. Enables all fields for editing
3. Allows user to make amendments
4. Updates the grid row when Update button is clicked

## Changes Made

### 1. Enhanced Alter Button (Lines 1632-1695)
**File:** `rule-details.embedded.js`

**What was changed:**
- Made the click handler `async` to support dropdown population
- Added call to `loadEventSpecificDropdowns()` to ensure dropdowns are populated
- Added call to `populateInputFieldsFromRow()` to populate form fields from the selected row
- Added `rowIndex` to `rdState.selectedCombo` to track which row is being edited

**Flow:**
```
User clicks Alter button
  ↓
Check if a row is selected
  ↓
Load dropdowns for the current event (async)
  ↓
Populate form fields from selected row data
  ↓
Enable all input fields
  ↓
Set mode to EDIT
  ↓
Store row data and index for later update
```

### 2. Fixed Update Button in EDIT Mode (Lines 1797-1860)
**File:** `rule-details.embedded.js`

**What was changed:**
- Replaced the incorrect logic that was just populating fields
- Now properly updates the record in `rdState.rules` array
- Refreshes the grid with updated data
- Clears form and resets to VIEW mode after successful update

**Flow:**
```
User clicks Update button (in EDIT mode)
  ↓
Get amended values from dropdowns
  ↓
Validate required fields
  ↓
Find record in rdState.rules using rowIndex
  ↓
Update the record with new values
  ↓
Refresh grid display
  ↓
Clear form and reset to VIEW mode
  ↓
Show success message
```

## How It Works

### Step-by-Step User Flow:

1. **User clicks View button**
   - Grid populates with existing records for the selected event

2. **User clicks on a grid row**
   - Row is highlighted (table-active class)
   - Row data is stored in dataset attributes

3. **User clicks Alter button**
   - System loads dropdowns for the current event
   - Form fields are populated with values from the selected row
   - All dropdowns show the current values
   - Fields are enabled for editing
   - Mode changes to EDIT

4. **User makes amendments**
   - User can change Component dropdown
   - User can change Debit Account Tag dropdown
   - User can change Credit Account Tag dropdown
   - User can edit Narration field

5. **User clicks Update button**
   - System validates all required fields are filled
   - System updates the record in the internal array
   - Grid refreshes to show updated values
   - Form clears and returns to VIEW mode
   - Success message is displayed

## Technical Details

### Key Functions Used:

1. **`loadEventSpecificDropdowns()`**
   - Populates Component, Debit Tag, and Credit Tag dropdowns
   - Filters components based on selected event
   - Uses data from `rdState.comboData`

2. **`populateInputFieldsFromRow(row)`**
   - Reads data from row's dataset attributes
   - Matches values in dropdowns by ID and text
   - Sets dropdown values to match row data
   - Populates narration field

3. **`setFormMode(mode)`**
   - Enables/disables form fields based on mode
   - Updates button states
   - Mode can be VIEW, ADD, or EDIT

### State Management:

```javascript
rdState.selectedCombo = {
  rowElement: selectedRow,      // Reference to DOM element
  rowIndex: rowIndex,            // Index in rdState.rules array
  componentID: '...',            // Original component ID
  drAccountTagID: '...',         // Original debit tag ID
  crAccountTagID: '...',         // Original credit tag ID
  narration: '...'               // Original narration
}
```

## Testing Checklist

- [ ] Click Alter without selecting a row → Shows warning
- [ ] Click Alter with row selected → Dropdowns populate correctly
- [ ] Dropdowns show current values from grid row
- [ ] All fields are enabled for editing
- [ ] Change Component dropdown → Value changes
- [ ] Change Debit Tag dropdown → Value changes
- [ ] Change Credit Tag dropdown → Value changes
- [ ] Edit Narration field → Value changes
- [ ] Click Update → Grid updates with new values
- [ ] Click Update → Form clears and returns to VIEW mode
- [ ] Grid shows updated values correctly
- [ ] Can edit multiple rows in sequence

## Notes

- The Alter button is the second button in the action buttons array (index 1)
- The Update button is the fourth button in the action buttons array (index 3)
- The same Update button handles both ADD and EDIT modes
- In ADD mode: Creates new record and adds to grid
- In EDIT mode: Updates existing record in grid
