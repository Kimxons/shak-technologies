# BANK RECONCILIATION MANUAL - TEST CHECKLIST

## URL to test:
http://localhost:8087/modules/bank-reconciliation-manual/bank-reconciliation-manual.html

## TEST CHECKLIST:

### ✅ Initial State Test
- [ ] Open the page
- [ ] Verify all checkboxes in both tables are DISABLED (greyed out)
- [ ] Verify Edit button is DISABLED
- [ ] Verify Reconcile button is DISABLED
- [ ] Verify Save button is DISABLED
- [ ] Only View button should be ENABLED

### ✅ View Button Test
- [ ] Enter Branch ID (e.g., "0101")
- [ ] Click "View" button
- [ ] Verify alert shows: "Data loaded successfully. Click Edit to activate checkboxes."
- [ ] Click OK on alert
- [ ] Verify data is loaded in both tables
- [ ] Verify Edit button is now ENABLED
- [ ] Verify checkboxes are still DISABLED

### ✅ Edit Button Test
- [ ] Click "Edit" button
- [ ] Verify alert shows: "Checkboxes activated. You can now select transactions to reconcile."
- [ ] Click OK on alert
- [ ] Verify ALL checkboxes in GL table are now ENABLED
- [ ] Verify ALL checkboxes in Bank table are now ENABLED
- [ ] Verify Reconcile button is now ENABLED
- [ ] Verify Edit button is now DISABLED

### ✅ Checkbox Selection Test
- [ ] Check one or more checkboxes in GL Transaction table
- [ ] Check one or more checkboxes in Bank Account Transaction table
- [ ] Verify checkboxes can be checked/unchecked freely
- [ ] No alerts should appear during selection

### ✅ Reconcile Button Test
- [ ] Click "Reconcile" button
- [ ] Verify alert shows: "X transaction(s) reconciled successfully. Click Save to continue."
- [ ] Click OK on alert
- [ ] Verify ALL checkboxes are now DISABLED again (locked)
- [ ] Verify Reconcile button is now DISABLED
- [ ] Verify Save button is now ENABLED

### ✅ Save Button Test
- [ ] Click "Save" button
- [ ] Verify alert shows: "Reconciliation saved successfully!"
- [ ] Click OK on alert
- [ ] Verify Save button is now DISABLED
- [ ] Verify Edit button is now ENABLED (ready for next reconciliation)
- [ ] Check console for any errors

### ✅ Error Handling Tests
- [ ] Click View without entering Branch ID
- [ ] Verify alert: "Please enter Branch ID"
- [ ] Click Edit before loading data
- [ ] Verify alert: "Please load data first using the View button"
- [ ] Click Reconcile without selecting any checkboxes
- [ ] Verify alert: "Please select at least one transaction to reconcile"

### ✅ API Call Verification (Check Browser DevTools Network Tab)
- [ ] View action calls: p_GetBankReconlManual
- [ ] Save action calls: p_AddBankReconlManual
- [ ] Save parameters include: BankID, OurBranchID, AccountID, BatchNo, BankStmtDetail, AccountTrxDetail
- [ ] Save parameters DO NOT include: OperatorID (this was causing the error)

## EXPECTED BEHAVIOR SUMMARY:

1. **Checkboxes are DISABLED by default**
2. **Edit button activates checkboxes** → Shows ONE alert
3. **User selects transactions** → No alerts
4. **Reconcile locks selections** → Shows ONE alert, enables Save
5. **Save persists data** → Shows ONE alert, resets for next cycle

## KNOWN FIXES APPLIED:

✅ Fixed: "Procedure has too many arguments" - Removed OperatorID parameter
✅ Fixed: Bank Account Transaction checkboxes not activating - Added proper data attributes
✅ Fixed: Checkboxes enabled by default - Now disabled until Edit is clicked
✅ Fixed: Multiple alerts - Each button now shows only ONE alert message
✅ Fixed: Checkbox selection tracking - Added data-table and data-index attributes

## Common Issues to Watch For:

1. If checkboxes don't enable on Edit:
   - Check browser console for errors
   - Verify tables are populated with data first

2. If Save gives "too many arguments" error:
   - Check that OperatorID is NOT in the request

3. If Reconcile doesn't capture selections:
   - Verify checkboxes have data-table and data-index attributes
   - Check browser console for logged selected indices
