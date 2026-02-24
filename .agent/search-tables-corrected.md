# Search Table Names - CORRECTED ✅

## Summary of Changes

All search configurations have been updated with the **correct database table and column names**.

---

## ✅ Updated Search Configurations

### 1. Branch Search
**BEFORE:**
- Table: `Branches`
- Columns: `BranchID`, `BranchName`

**AFTER:**
- Table: `t_SystemBranchSetting` ✅
- Columns: `OurBranchID`, `BranchName` ✅

**Search Fields:**
- Branch ID → searches `OurBranchID` column
- Branch Name → searches `BranchName` column

---

### 2. Limit Search
**BEFORE:**
- Table: `ClientLimits`
- Columns: `LimitID`, `ClientID`

**AFTER:**
- Table: `t_Limit` ✅
- Columns: `LimitID` ✅

**Search Fields:**
- Limit ID → searches `LimitID` column

**Note:** Removed `ClientID` search field as it's not needed for limit search. The limit table is searched by LimitID only.

---

### 3. Client Search
**BEFORE:**
- Table: `Clients`
- Columns: `ClientID`, `Name`

**AFTER:**
- Table: `t_Client` ✅
- Columns: `ClientID`, `Name` ✅

**Search Fields:**
- Client ID → searches `ClientID` column
- Client Name → searches `Name` column

---

### 4. Currency Search
**BEFORE:**
- Table: `Currencies`
- Columns: `CurrencyID`, `CurrencyName`

**AFTER:**
- Table: `t_Currency` ✅
- Columns: `CurrencyID`, `Description` ✅

**Search Fields:**
- Currency ID → searches `CurrencyID` column
- Description → searches `Description` column (not `CurrencyName`)

**Note:** The currency table uses `Description` column, not `CurrencyName`. The search field label is now "Description" to match the actual column.

---

## 📋 Complete Table Mapping Reference

| Search Type | Table Name | Primary Column | Secondary Column |
|------------|------------|----------------|------------------|
| Branch | `t_SystemBranchSetting` | `OurBranchID` | `BranchName` |
| Limit | `t_Limit` | `LimitID` | - |
| Client | `t_Client` | `ClientID` | `Name` |
| Currency | `t_Currency` | `CurrencyID` | `Description` |

---

## 🔧 Additional Information Provided

### Auto-Generate Limit ID
You mentioned: `p_GetNextLimitID` - stored procedure to auto-generate the next limit ID

**Implementation Note:**
This stored procedure can be called when the user clicks "Add" to automatically generate a new Limit ID. This would require:

1. Add a button or auto-call when entering ADD mode
2. Call the stored procedure via the service
3. Populate the Limit ID field with the generated value

**Example Implementation (if needed):**
```javascript
async function generateNextLimitId() {
    try {
        const result = await LimitsCollateralService.getNextLimitId();
        if (result.success && result.data) {
            const nextId = result.data.NextLimitID || result.data.LimitID;
            setElValue(els.limitId, nextId);
            showMessage('Limit ID generated', 'success');
        }
    } catch (err) {
        console.error('Error generating Limit ID:', err);
        showMessage('Failed to generate Limit ID', 'error');
    }
}
```

**Would you like me to implement this auto-generation feature?**

---

## ✅ What Works Now

### Branch Search
1. Click Branch search button (🔍)
2. Modal opens with search fields:
   - Branch ID (searches `OurBranchID`)
   - Branch Name (searches `BranchName`)
3. Search executes against `t_SystemBranchSetting` table
4. Results display
5. Select a branch → populates Branch ID and Branch Name fields

### Limit Search
1. Click Limit ID search button (🔍)
2. Modal opens with search field:
   - Limit ID (searches `LimitID`)
3. Search executes against `t_Limit` table
4. Results display all existing limits
5. Select a limit → populates Limit ID field

### Client Search
1. Click Client ID search button (🔍)
2. Modal opens with search fields:
   - Client ID (searches `ClientID`)
   - Client Name (searches `Name`)
3. Search executes against `t_Client` table
4. Results display
5. Select a client → populates Client ID and Client Name fields

### Currency Search
1. Click Currency ID search button (🔍)
2. Modal opens with search fields:
   - Currency ID (searches `CurrencyID`)
   - Description (searches `Description`)
3. Search executes against `t_Currency` table
4. Results display
5. Select a currency → populates Currency ID and Currency Name fields

---

## 🧪 Testing Checklist

### Test 1: Branch Search
- [ ] Click Branch search button
- [ ] Modal opens
- [ ] Enter branch ID or name
- [ ] Click Search
- [ ] Results display from `t_SystemBranchSetting` table
- [ ] Click a row
- [ ] Branch ID and Name populate correctly
- [ ] Modal closes

### Test 2: Limit Search
- [ ] Click Limit ID search button
- [ ] Modal opens
- [ ] Enter limit ID (or leave blank to see all)
- [ ] Click Search
- [ ] Results display from `t_Limit` table
- [ ] Click a row
- [ ] Limit ID populates correctly
- [ ] Modal closes

### Test 3: Client Search
- [ ] Click Client ID search button
- [ ] Modal opens
- [ ] Enter client ID or name
- [ ] Click Search
- [ ] Results display from `t_Client` table
- [ ] Click a row
- [ ] Client ID and Name populate correctly
- [ ] Modal closes

### Test 4: Currency Search
- [ ] Click Currency ID search button
- [ ] Modal opens
- [ ] Enter currency ID or description
- [ ] Click Search
- [ ] Results display from `t_Currency` table
- [ ] Click a row
- [ ] Currency ID and Description populate correctly
- [ ] Modal closes

---

## 🔍 Troubleshooting

### If searches still don't work:

1. **Check browser console (F12)** for errors
2. **Check Network tab** for API responses
3. **Verify table names** match your database exactly (case-sensitive)
4. **Verify column names** match your database exactly (case-sensitive)
5. **Check database permissions** - ensure the user can query these tables

### Common Issues:

**Issue:** "Invalid object name 't_SystemBranchSetting'"
**Solution:** Table name might be case-sensitive or have a different schema prefix (e.g., `dbo.t_SystemBranchSetting`)

**Issue:** "Invalid column name 'OurBranchID'"
**Solution:** Column name might be different (check actual database schema)

**Issue:** No results returned
**Solution:** Table might be empty, or WHERE clause might be too restrictive

---

## 📝 Files Modified

**File:** `client-limit.js`
**Lines Modified:** 959-1026
**Changes:**
- Updated `branch.tableID` from `'Branches'` to `'t_SystemBranchSetting'`
- Updated `branch` column from `'BranchID'` to `'OurBranchID'`
- Updated `limit.tableID` from `'ClientLimits'` to `'t_Limit'`
- Removed `ClientID` search field from limit search
- Updated `client.tableID` from `'Clients'` to `'t_Client'`
- Updated `currency.tableID` from `'Currencies'` to `'t_Currency'`
- Updated `currency` column from `'CurrencyName'` to `'Description'`
- Updated currency field label from `'Currency Name'` to `'Description'`

---

## ✅ Status

**Search Configurations:** ✅ UPDATED with correct table and column names
**Ready for Testing:** ✅ YES
**Expected Result:** All searches should now work correctly

---

## 🚀 Next Steps

1. **Reload the page** to ensure the updated JavaScript is loaded
2. **Test each search button** using the checklist above
3. **Report any issues** with specific error messages from the console
4. **Consider implementing** the auto-generate Limit ID feature (optional)

---

**Updated:** 2026-01-26
**Status:** ✅ COMPLETE
**All search table names corrected!** 🎉
