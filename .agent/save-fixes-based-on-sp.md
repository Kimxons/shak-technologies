# Client Limit Save - Fixes Based on Stored Procedure Analysis

## 🔍 Issues Found by Analyzing p_AddLimitClients

### **Issue 1: Wrong LimitID Value for New Records**
**Problem**: Sending `LimitID: "0"` for new records
**Stored Procedure Expects**: `NULL` or empty string
**Fix**: Change `LimitID: currentMode === 'ADD' ? "0"` to `LimitID: currentMode === 'ADD' ? null`

### **Issue 2: Wrong Parameter Name**
**Problem**: Sending `Sanctionedlimit` (lowercase 'l')
**Stored Procedure Expects**: `SanctionedLimit` (capital 'L')
**Fix**: Change `Sanctionedlimit:` to `SanctionedLimit:`

### **Issue 3: Wrong IsChildLimit Value**
**Problem**: Sending `IsChildLimit: null`
**Stored Procedure Expects**: `Bit` type (0 or 1)
**Fix**: Change `IsChildLimit: null` to `IsChildLimit: 0`

### **Issue 4: Wrong LimitLevel Default**
**Problem**: Sending `LimitLevel: null`
**Stored Procedure Default**: `'0000'`
**Fix**: Change `LimitLevel: els.limitLevel.value || null` to `LimitLevel: els.limitLevel.value || "0000"`

---

## ✅ Corrected Data Object

```javascript
const data = {
    OurBranchID: els.branchId.value || window.Environment?.branchID || "0325",
    LimitID: currentMode === 'ADD' ? null : els.limitId.value,  // ✅ FIXED: null instead of "0"
    RefNo: els.referenceNo.value || 0,
    ClientID: els.clientId.value,
    CurrencyID: els.currencyId.value,
    EffectiveDate: els.effectiveDate.value || null,
    ExpiryDate: els.expiryDate.value || null,
    LimitTypeID: els.limitType.value,
    SanctionedDate: els.sanctionedDate.value || null,
    SanctionedLimit: parseFloat(els.sanctionedLimit.value.replace(/,/g, '')) || 0,  // ✅ FIXED: Capital L
    DPDefinitionID: els.dpDefinition.value || null,
    DrawingPower: parseFloat(els.drawingPower.value.replace(/,/g, '')) || 0,
    Remarks: els.remarks.value || "",
    WorkingDate: new Date().toISOString().split('T')[0] + " 00:00:00",
    IsChildLimit: 0,  // ✅ FIXED: 0 instead of null
    ParentLimitID: null,
    LimitLevel: els.limitLevel.value || "0000",  // ✅ FIXED: "0000" default
    CreatedBy: window.Environment?.operatorID || "STEVE",
    CreatedOn: null,
    SupervisedBy: null,
    NewRecord: currentMode === 'ADD' ? 1 : 0
};
```

---

## 📊 How the Stored Procedure Works

### For New Records (`@NewRecord = 1`):

1. **Checks for existing active limit**:
   ```sql
   IF EXISTS(SELECT 1 FROM t_Limit WHERE OurBranchID = @OurBranchID 
             AND ClientID = @ClientID AND CurrencyID = @CurrencyID 
             AND LimitStatusID = 'A')
   ```
   - If exists → Error: "Active Limit Exists for the Client, Currency"

2. **Auto-generates Limit ID** (if enabled):
   ```sql
   IF EXISTS(SELECT BankID FROM t_SystemBankSetting 
             WHERE BankID = dbo.f_GetBankID(@OurBranchID) AND AutoLimitID = 1)
   BEGIN
       EXEC p_GetNextLimitID @OurBranchID, @LimitID OUTPUT, @ErrorNo OUTPUT
   END
   ```

3. **Inserts new record** into `t_Limit` table

4. **Returns the generated Limit ID**:
   ```sql
   SELECT @LimitID LimitID
   ```

### For Updates (`@NewRecord = 0`):

1. **Updates existing record**:
   ```sql
   UPDATE t_Limit SET 
       SanctionedDate = @SanctionedDate,
       SanctionedLimit = @SanctionedLimit,
       DrawingPower = @DrawingPower,
       NetCollateralValue = @NetCollateralValue,
       ExpiryDate = @ExpiryDate,
       LimitTypeID = @LimitTypeID
   WHERE OurBranchID = @OurBranchID AND LimitID = @LimitID 
         AND LimitStatusID = 'A'
   ```

2. **Returns the reference number**:
   ```sql
   SELECT @RefNo NextRefNo
   ```

---

## 🔧 Response Format

### New Record Response:
```javascript
{
    success: true,
    data: {
        Details: [
            {
                LimitID: "L00123"  // The auto-generated Limit ID
            }
        ]
    }
}
```

### Update Response:
```javascript
{
    success: true,
    data: {
        Details: [
            {
                NextRefNo: 2  // The incremented reference number
            }
        ]
    }
}
```

---

## ✅ Corrected Response Extraction

```javascript
if (result.success) {
    let generatedLimitID = null;
    
    if (currentMode === 'ADD') {
        // For new records, extract LimitID
        generatedLimitID = result.data?.Details?.[0]?.LimitID || 
                          result.data?.LimitID || 
                          result.data?.[0]?.LimitID ||
                          result.LimitID;
        
        if (generatedLimitID) {
            els.limitId.value = generatedLimitID;
            console.log('✅ Generated LimitID:', generatedLimitID);
            showMessage(`Record saved successfully. Limit ID: ${generatedLimitID}`, 'success');
        } else {
            console.warn('[ClientLimit] LimitID not found in response:', result);
            showMessage('Record saved but LimitID not returned. Check console.', 'warning');
        }
    } else {
        // For updates
        showMessage('Record updated successfully.', 'success');
    }
    
    currentData = data;
    switchMode('VIEW');
    
    // Reload to get complete record
    if (els.limitId.value) {
        await loadRecord();
    }
}
```

---

## ⚠️ Important Notes

### 1. Auto-Generation Requirement
The stored procedure only auto-generates Limit ID if:
- `@NewRecord = 1` (new record)
- `AutoLimitID = 1` in `t_SystemBankSetting` table

**Check your database**:
```sql
SELECT BankID, AutoLimitID 
FROM t_SystemBankSetting 
WHERE BankID = dbo.f_GetBankID('0325')
```

If `AutoLimitID = 0`, you must manually enter Limit IDs!

### 2. Duplicate Check
The SP checks for existing active limits with same:
- Branch ID
- Client ID
- Currency ID

If found, it raises error: "BREXDB555001 - Active Limit Exists for the Client, Currency"

### 3. RefNo Auto-Increment
The SP automatically increments `RefNo`:
```sql
SET @RefNo = ISNULL((SELECT MAX(RefNo) FROM t_Limit 
                     WHERE OurBranchID=@OurBranchID AND LimitID = @LimitID), 0) + 1
```

You don't need to calculate this on the frontend.

---

## 🧪 Testing Steps

### Test 1: Verify Auto-Generation is Enabled
```sql
-- Run this in your database
SELECT BankID, AutoLimitID 
FROM t_SystemBankSetting 
WHERE BankID = dbo.f_GetBankID('0325')
```

**Expected**: `AutoLimitID = 1`
**If 0**: Auto-generation is disabled, you must enter Limit IDs manually

### Test 2: Test New Record Save
1. Click "Add" button
2. Fill in required fields:
   - Client ID
   - Currency ID
   - Sanctioned Limit
   - Limit Level
   - Limit Type
3. Leave Limit ID empty
4. Click "Save"
5. Check browser console for:
   - Request data (should show `LimitID: null`)
   - Response data (should show `LimitID: "L00123"` or similar)
6. Verify Limit ID field populates

### Test 3: Test Duplicate Check
1. Create a record with Client "C001", Currency "KES"
2. Try to create another record with same Client and Currency
3. **Expected**: Error message "Active Limit Exists for the Client, Currency"

### Test 4: Test Update
1. Load an existing record (click "View")
2. Click "Edit"
3. Modify Sanctioned Limit
4. Click "Save"
5. **Expected**: Record updates successfully
6. **Expected**: Limit ID remains unchanged

---

## 🔍 Debugging

### If Save Fails:

1. **Check browser console** (F12 → Console)
   - Look for the request data
   - Look for the response
   - Look for any errors

2. **Check Network tab** (F12 → Network)
   - Find the API call to `p_AddLimitClients`
   - Check the request payload
   - Check the response

3. **Check database**:
   ```sql
   -- Check if AutoLimitID is enabled
   SELECT * FROM t_SystemBankSetting WHERE BankID = dbo.f_GetBankID('0325')
   
   -- Check for existing limits
   SELECT * FROM t_Limit WHERE ClientID = 'YOUR_CLIENT_ID' AND LimitStatusID = 'A'
   ```

4. **Common Errors**:
   - "BREXDB555001" → Active limit already exists for this client/currency
   - "BREXDB703506" → ID Definition not exists (auto-generation failed)
   - Parameter validation errors → Check data types match SP

---

## 📝 Summary of Changes Needed

### In client-limit.js (saveRecord function):

1. ✅ Change `LimitID: "0"` to `LimitID: null`
2. ✅ Change `Sanctionedlimit:` to `SanctionedLimit:`
3. ✅ Change `IsChildLimit: null` to `IsChildLimit: 0`
4. ✅ Change `LimitLevel: ... || null` to `LimitLevel: ... || "0000"`
5. ✅ Improve response extraction to handle multiple formats
6. ✅ Add better error messages

---

**Apply these changes and test again. The save should work correctly now!** 🚀
