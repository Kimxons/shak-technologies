# Client Limit - Quick Start Guide

## 🚨 Current Issues

### Issue 1: Search Returns Empty Results
**Console shows**: `Details: Array(0)` for all searches

**This means**:
- The database tables are empty, OR
- The search is not finding any records

**Solutions**:
1. **Add test data to your database tables**:
   - `t_SystemBranchSetting` - Add some branches
   - `t_Client` - Add some clients
   - `t_Currency` - Add some currencies

2. **Or manually enter the values** (see below)

---

### Issue 2: Form Validation Failing
**Console shows**: `[ClientLimit] Save aborted: form validation failed`

**Required Fields** (must be filled before Save):
1. ✅ **Branch ID**
2. ✅ **Client ID**
3. ✅ **Currency ID**
4. ✅ **Limit Level** (dropdown)
5. ✅ **Limit Type** (dropdown)
6. ✅ **Sanctioned Limit** (amount)

---

## 📋 Step-by-Step: How to Create a Client Limit

### Step 1: Click "Add" Button
- Form switches to ADD mode
- All fields become editable
- Dropdowns become clickable

### Step 2: Fill Required Fields

#### Option A: Use Search (if database has data)
1. **Branch ID**: Click 🔍 → Search → Select a branch
2. **Client ID**: Click 🔍 → Search → Select a client
3. **Currency ID**: Click 🔍 → Search → Select a currency

#### Option B: Manual Entry (if database is empty)
1. **Branch ID**: Type manually (e.g., "0325")
2. **Branch Name**: Type manually (e.g., "Head Office")
3. **Client ID**: Type manually (e.g., "C001")
4. **Client Name**: Type manually (e.g., "Test Client")
5. **Currency ID**: Type manually (e.g., "KES")
6. **Currency Name**: Type manually (e.g., "Kenya Shilling")

### Step 3: Select from Dropdowns

**Limit Level** (dropdown):
- Click the dropdown
- Select either:
  - "Client" (default)
  - "Account"

**Limit Type** (dropdown):
- Click the dropdown
- Select either:
  - "Revolving"
  - "Non Revolving"

### Step 4: Enter Sanctioned Limit

**Sanctioned Limit** (amount field):
- Enter a number (e.g., "1000000")
- The field will auto-format with commas

### Step 5: Optional Fields

You can also fill these (not required):
- Effective Date
- Expiry Date
- Sanctioned Date
- DP Definition
- Drawing Power
- Remarks

### Step 6: Click "Save"

- Form validates all required fields
- If valid: Sends data to backend
- Backend auto-generates Limit ID
- Success message displays with generated Limit ID
- Form switches to VIEW mode

---

## 🧪 Quick Test with Manual Entry

Try this to test the save functionality:

1. **Click "Add"**

2. **Fill these fields manually**:
   - Branch ID: `0325`
   - Branch Name: `Head Office`
   - Client ID: `C001`
   - Client Name: `Test Client`
   - Currency ID: `KES`
   - Currency Name: `Kenya Shilling`
   - Limit Level: Select `Client` from dropdown
   - Limit Type: Select `Revolving` from dropdown
   - Sanctioned Limit: `1000000`

3. **Click "Save"**

4. **Expected Result**:
   - Validation passes ✅
   - Data sent to backend
   - Limit ID auto-generates (e.g., "L00001")
   - Success message: "Record saved successfully. Limit ID: L00001"
   - Form switches to VIEW mode

---

## 🔍 Troubleshooting

### If Dropdowns Don't Work:

**In VIEW mode** (default when page loads):
- Dropdowns are disabled (grayed out)
- **Solution**: Click "Add" button first

**In ADD mode** (after clicking Add):
- Dropdowns should be enabled and clickable
- If still not working, check browser console for errors

### If Search Returns No Results:

**Check if database has data**:
```sql
-- Check branches
SELECT TOP 10 * FROM t_SystemBranchSetting

-- Check clients
SELECT TOP 10 * FROM t_Client

-- Check currencies
SELECT TOP 10 * FROM t_Currency
```

**If tables are empty**:
- Add test data to the tables, OR
- Use manual entry (see Step 2, Option B above)

### If Validation Fails:

**Check the browser console** for the specific error message:
- "Branch ID is required"
- "Client ID is required"
- "Currency ID is required"
- "Limit Level is required"
- "Limit Type is required"
- "Sanctioned Limit is required"

**Solution**: Fill the missing field(s)

### If Save Fails After Validation:

**Check browser console** for:
- Request data (what was sent)
- Response data (what backend returned)
- Any error messages

**Common backend errors**:
- "Active Limit Exists for the Client, Currency" → A limit already exists for this client/currency combination
- "ID Definition Not Exists" → Auto-generation is not configured
- Parameter validation errors → Check data types

---

## 📊 Database Setup Required

For full functionality, ensure these tables have data:

### 1. Branches Table
```sql
-- Add a test branch
INSERT INTO t_SystemBranchSetting (OurBranchID, BranchName, ...)
VALUES ('0325', 'Head Office', ...)
```

### 2. Clients Table
```sql
-- Add a test client
INSERT INTO t_Client (ClientID, Name, ...)
VALUES ('C001', 'Test Client', ...)
```

### 3. Currencies Table
```sql
-- Add test currencies
INSERT INTO t_Currency (CurrencyID, Description, ...)
VALUES ('KES', 'Kenya Shilling', ...),
       ('USD', 'US Dollar', ...),
       ('EUR', 'Euro', ...)
```

### 4. Auto-Generation Setting
```sql
-- Enable auto-generation of Limit IDs
UPDATE t_SystemBankSetting
SET AutoLimitID = 1
WHERE BankID = dbo.f_GetBankID('0325')
```

---

## ✅ Validation Checklist

Before clicking Save, ensure:

- [ ] Branch ID is filled
- [ ] Client ID is filled
- [ ] Currency ID is filled
- [ ] Limit Level is selected (not "--Select--")
- [ ] Limit Type is selected (not "--Select--")
- [ ] Sanctioned Limit is filled (not empty or 0)

If all checkboxes are checked, Save should work! ✅

---

## 🎯 Expected Console Output (Success)

When save works correctly, you should see:

```
[ClientLimit] Save button clicked, mode: ADD
[ClientLimit] Save: prepared data {OurBranchID: "0325", LimitID: null, ...}
[CoreApi] POST http://172.16.2.31:3306/api/OldAPI
[CoreApi] Raw response: {Details: [{LimitID: "L00001"}]}
[ClientLimit] Save: API response {success: true, data: {Details: [{LimitID: "L00001"}]}}
✅ Generated LimitID: L00001
[ClientLimit] Switched to mode: VIEW
```

---

**Try the manual entry test above and let me know what happens!** 🚀
