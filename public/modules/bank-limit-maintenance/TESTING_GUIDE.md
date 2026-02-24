# Bank Limit Maintenance - Testing Guide

## Overview
This document provides a comprehensive guide for testing the Bank Limit Maintenance module integration with the OtherStaticDataService.

## Setup

### 1. Service Dependencies
The module requires the following services to be loaded:
- `CoreApi` - Core API communication layer
- `OtherStaticDataService` - Bank limit CRUD operations
- `ServiceLoader` - Dynamic service loading

### 2. Test Page
Open the test page at:
```
http://localhost:5500/public/modules/bank-limit-maintenance/test-bank-limit.html
```

## Test Scenarios

### Test 1: Data Fetching (GET)
**Purpose**: Verify bank limit data can be retrieved from the backend

**Steps**:
1. Set test context using the test panel:
   - Bank ID: `BNK001`
   - Client ID: `CLI001`
   - Branch ID: `BRN001`
   - Operator ID: `OPR001`
2. Click "Set Context"
3. Click "Test Fetch"

**Expected Result**:
- Console shows: `📥 OtherStaticDataService.getBankLimit called with:`
- Response data populates the grid
- Behind The Scene fields are populated
- Status: ✅ Success or ⚠️ No data

**API Call**:
```javascript
{
  "RequestID": "dbo.p_GetBankLimit",
  "FormId": "dbo.p_GetBankLimit",
  "RequestData": {
    "BankID": "BNK001",
    "ClientBranchID": "BRN001",
    "ClientID": "CLI001",
    "LimitType": "",
    "OperatorID": "OPR001",
    "CurrencyID": ""
  },
  "RequestTime": "02/05/2026 HH:mm:ss",
  "AppName": "PROJECT_KAIRO"
}
```

### Test 2: Adding New Limit (POST/INSERT)
**Purpose**: Verify new bank limit records can be created

**Steps**:
1. Click "New" button in grid actions
2. Fill in form fields:
   - Type: Select "CREDIT"
   - Currency ID: `USD`
   - Limit: `100000`
   - Expiry Date: `31/Dec/2026`
   - Remarks: `Test credit limit`
3. Click "Update" button

**Expected Result**:
- Console shows: `💾 OtherStaticDataService.addEditBankLimit called with:`
- Success alert: "Bank limit saved successfully"
- Grid refreshes with new data
- Form clears and disables

**API Call**:
```javascript
{
  "RequestID": "dbo.p_AddEditBankLimit",
  "FormId": "dbo.p_AddEditBankLimit",
  "RequestData": {
    "BankID": "BNK001",
    "ClientID": "CLI001",
    "LimitType": "CREDIT",
    "CurrencyID": "USD",
    "CreatedBy": "OPR001",
    "CreatedOn": "2026-02-05T...",
    "ModifiedBy": "OPR001",
    "ModifiedOn": "2026-02-05T...",
    "SupervisedBy": "",
    "SupervisedOn": "",
    "UpdateCount": 0,
    "DetailRecords": "<DetailRecords><Record>...</Record></DetailRecords>"
  },
  "RequestTime": "02/05/2026 HH:mm:ss",
  "AppName": "PROJECT_KAIRO"
}
```

### Test 3: Editing Existing Limit (POST/UPDATE)
**Purpose**: Verify existing bank limit records can be modified

**Steps**:
1. Click on a row in the grid to select it
2. Click "Alter" button
3. Modify form fields (e.g., change limit amount)
4. Click "Update" button

**Expected Result**:
- Console shows: `💾 OtherStaticDataService.addEditBankLimit called with:`
- UpdateCount incremented
- Success alert shown
- Grid refreshes with updated data

### Test 4: Deleting Limit (DELETE)
**Purpose**: Verify bank limit records can be deleted

**Steps**:
1. Click on a row in the grid to select it
2. Click "Remove" button
3. Confirm deletion in the popup

**Expected Result**:
- Console shows: `🗑️ OtherStaticDataService.deleteBankLimit called with:`
- Confirmation dialog appears
- Success alert: "Bank limit deleted successfully"
- Row removed from grid
- Grid refreshes

**API Call**:
```javascript
{
  "RequestID": "dbo.p_DeleteBankLimit",
  "FormId": "dbo.p_DeleteBankLimit",
  "RequestData": {
    "BankID": "BNK001",
    "ClientBranchID": "BRN001",
    "ClientID": "CLI001",
    "LimitType": "CREDIT",
    "UpdateCount": 1
  },
  "RequestTime": "02/05/2026 HH:mm:ss",
  "AppName": "PROJECT_KAIRO"
}
```

### Test 5: Form Validation
**Purpose**: Verify required field validation works

**Steps**:
1. Click "New" button
2. Leave fields empty
3. Click "Update" button

**Expected Result**:
- Alert: "Please select a Type"
- Form doesn't submit
- Fields remain editable

**Validation Rules**:
- Type: Required (dropdown selection)
- Currency ID: Required
- Limit: Required

### Test 6: Grid Selection
**Purpose**: Verify grid row selection and form population

**Steps**:
1. Ensure grid has data (fetch first if needed)
2. Click on different rows

**Expected Result**:
- Row highlights (selected class added)
- Form fields populate with row data
- Previous selection clears

### Test 7: Clear Functionality
**Purpose**: Verify form can be cleared

**Steps**:
1. Fill in form fields (New or Alter mode)
2. Click "Clear" button

**Expected Result**:
- All form fields reset to default values
- Form becomes disabled
- No grid selection

## Debug Tools

### Console Commands
Access debug interface via browser console:

```javascript
// Check current state
window.BankLimitMaintenanceDebug.getState()

// Get bank context
window.BankLimitMaintenanceDebug.getBankContext()

// Manually trigger data load
await window.BankLimitMaintenanceDebug.loadData()

// Test save operation
await window.BankLimitMaintenanceDebug.testSave()

// Test delete operation
await window.BankLimitMaintenanceDebug.testDelete()
```

### State Inspection
```javascript
// View current form state
console.log(window.BankLimitMaintenanceDebug.getState())

// Expected output:
// {
//   isEditing: false,
//   originalData: {},
//   gridData: [...],
//   bankData: {...},
//   updateCount: 0
// }
```

## Error Scenarios

### Error 1: Service Not Loaded
**Symptom**: Alert "Error: OtherStaticDataService not available"

**Solution**: 
- Ensure serviceLoader.js is included before bank-limit-maintenance.js
- Check environment.js and coreApi.js are loaded
- Verify API endpoint in environment.js

### Error 2: Network Error
**Symptom**: Console error "Failed to fetch" or timeout

**Solution**:
- Check API server is running
- Verify BASE_URL in environment.js
- Check network tab for failed requests

### Error 3: Invalid Response
**Symptom**: "Failed to load bank limit data" or StatusCode !== '00'

**Solution**:
- Check backend stored procedure exists
- Verify database connection
- Review API response in network tab
- Check console for response details

### Error 4: XML Building Error
**Symptom**: Save fails with "DetailRecords" error

**Solution**:
- Check escapeXml function is working
- Verify gridData contains valid records
- Review XML structure in console logs

## Success Criteria

✅ **Module loads successfully**
- No console errors on page load
- Services loaded message appears
- Debug interface available

✅ **Data fetching works**
- getBankLimit called with correct parameters
- Grid populates with response data
- Behind The Scene fields show audit info

✅ **Data creation works**
- New records can be added
- Form validation prevents invalid data
- Grid updates after save

✅ **Data editing works**
- Existing records can be modified
- UpdateCount increments correctly
- Changes persist after save

✅ **Data deletion works**
- Records can be deleted
- Confirmation dialog appears
- Grid refreshes after delete

✅ **UI interactions work**
- Buttons enable/disable correctly
- Grid selection highlights properly
- Form fields enable/disable based on mode

## Integration with Maintain Banks

To integrate with the main Maintain Banks module:

1. Ensure bank context is passed from parent:
```javascript
window.currentBankID = parentBankID;
window.currentClientID = parentClientID;
window.currentBranchID = parentBranchID;
window.currentOperatorID = parentOperatorID;
```

2. Module auto-loads data on initialization
3. All CRUD operations use the bank context
4. UpdateCount managed automatically for optimistic concurrency

## Next Steps

1. ✅ Complete service integration
2. ✅ Test fetch operation
3. ✅ Test save operation
4. ✅ Test delete operation
5. ⏳ Test with real backend API
6. ⏳ Integration with parent Maintain Banks module
7. ⏳ Add currency search modal
8. ⏳ Add date picker functionality

## Notes

- All API calls are logged to console with emoji prefixes (🏦💾🗑️📥)
- XML escaping is handled automatically for DetailRecords
- Optimistic concurrency uses UpdateCount field
- Module exposes debug interface for testing: `window.BankLimitMaintenanceDebug`
