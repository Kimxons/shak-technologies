# Search Table Names - Correction Needed

## Current Table Names (Possibly Incorrect)

I implemented the search functionality with these table names:

### 1. Branch Search
```javascript
tableID: 'Branches'
```
**Searches for**: Branch ID and Branch Name

### 2. Limit ID Search
```javascript
tableID: 'ClientLimits'
```
**Searches for**: Limit ID and Client ID

### 3. Client Search
```javascript
tableID: 'Clients'
```
**Searches for**: Client ID and Client Name

### 4. Currency Search
```javascript
tableID: 'Currencies'
```
**Searches for**: Currency ID and Currency Name

---

## ❓ What Are the Correct Table Names?

Please provide the correct table names for each search:

### Branch Search
- **Current**: `Branches`
- **Correct**: _________________ (e.g., `tblBranches`, `OurBranches`, `SystemBranches`, etc.)

### Limit Search
- **Current**: `ClientLimits`
- **Correct**: _________________ (e.g., `tblLimitClients`, `LimitClients`, `ClientLimitMaster`, etc.)

### Client Search
- **Current**: `Clients`
- **Correct**: _________________ (e.g., `tblClients`, `ClientMaster`, `Customers`, etc.)

### Currency Search
- **Current**: `Currencies`
- **Correct**: _________________ (e.g., `tblCurrencies`, `CurrencyMaster`, `SystemCurrencies`, etc.)

---

## 🔍 How to Find the Correct Table Names

### Option 1: Check the Database
Run this SQL query in your database:
```sql
-- List all tables
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE'
AND TABLE_NAME LIKE '%branch%'
OR TABLE_NAME LIKE '%client%'
OR TABLE_NAME LIKE '%currency%'
OR TABLE_NAME LIKE '%limit%'
ORDER BY TABLE_NAME;
```

### Option 2: Check Existing Search Implementations
Look at other screens that have working search functionality and see what table names they use.

### Option 3: Check the Backend API
Look at the search service or stored procedures to see what table names are expected.

---

## 📋 Column Names Also Need Verification

For each table, I also need to verify the column names:

### Branches Table
**Current columns I'm using**:
- `BranchID`
- `BranchName`

**Correct columns**: _________________

### Client Limits Table
**Current columns I'm using**:
- `LimitID`
- `ClientID`

**Correct columns**: _________________

### Clients Table
**Current columns I'm using**:
- `ClientID`
- `Name`

**Correct columns**: _________________

### Currencies Table
**Current columns I'm using**:
- `CurrencyID`
- `CurrencyName`

**Correct columns**: _________________

---

## 🛠️ Once You Provide the Correct Names

I will update the search configurations in `client-limit.js` with the correct table and column names.

The fix will be in this section (around line 950-1030):

```javascript
const searchConfigs = {
    branch: {
        tableID: 'CORRECT_TABLE_NAME_HERE',  // ← Will update this
        whereStmt: '',
        searchFields: [
            { name: 'branchId', label: 'Branch ID', column: 'CORRECT_COLUMN_NAME' },  // ← And this
            { name: 'branchName', label: 'Branch Name', column: 'CORRECT_COLUMN_NAME' }  // ← And this
        ],
        // ... rest of config
    },
    // ... other configs
};
```

---

## 🚨 Error Messages to Look For

If you're seeing errors like:
- "Invalid object name 'Branches'"
- "Table 'Branches' does not exist"
- "Cannot find table 'ClientLimits'"

This confirms the table names are wrong.

Check the browser console (F12) → Network tab → Look at the search API response for the exact error message.

---

## 📝 Please Provide

1. **Correct table names** for:
   - Branches
   - Client Limits
   - Clients
   - Currencies

2. **Correct column names** for each table

3. **Any error messages** you're seeing in the browser console

Once I have this information, I'll update the code immediately!
