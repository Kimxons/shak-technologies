# Search Not Pulling Data - Diagnostic Guide

## 🔍 Issue: Searches Return Empty Arrays

**Console shows**: `Details: Array(0)` for all searches

**But we know data exists** because:
- Client `0000000130` exists (save detected duplicate)
- Currency `ETB` exists (save detected duplicate)

---

## 📋 What We Need to Check

### 1. What Parameters is the Search Sending?

Open browser console (F12) and look at the Network tab:
1. Click a search button (e.g., Client search)
2. In Network tab, find the API call
3. Click on it
4. Look at "Request Payload"

**Share the request payload** - it should look like:
```json
{
  "procedureName": "dbo.p_SearchTable",
  "parameters": {
    "TableID": "t_Client",
    "WhereStmt": "",
    "SearchField1": "ClientID",
    "SearchValue1": "",
    ...
  }
}
```

---

## 🔧 Possible Issues

### Issue 1: Wrong Search Stored Procedure

The search might be calling a stored procedure that doesn't exist or has different parameters.

**Check**: What stored procedure does your database use for search?
- `p_SearchTable`?
- `p_GenericSearch`?
- `p_Search`?
- Something else?

### Issue 2: Wrong Table Names

We're using:
- `t_SystemBranchSetting` for branches
- `t_Client` for clients
- `t_Currency` for currencies
- `t_Limit` for limits

**Verify these table names exist** in your database:
```sql
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('t_SystemBranchSetting', 't_Client', 't_Currency', 't_Limit')
```

### Issue 3: Wrong Column Names

We're searching by:
- Branches: `OurBranchID`, `BranchName`
- Clients: `ClientID`, `Name`
- Currencies: `CurrencyID`, `Description`

**Verify these columns exist**:
```sql
-- Check Client table columns
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 't_Client'

-- Check Currency table columns
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 't_Currency'

-- Check Branch table columns
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 't_SystemBranchSetting'
```

### Issue 4: Search Stored Procedure Parameters

The search service might expect different parameters than we're sending.

**Check your search stored procedure signature**. It might be something like:
```sql
CREATE PROCEDURE p_SearchTable
(
    @TableID varchar(50),
    @WhereStmt varchar(max),
    @SearchField1 varchar(50),
    @SearchValue1 varchar(50),
    @SearchField2 varchar(50),
    @SearchValue2 varchar(50),
    ...
)
```

---

## 🧪 Quick Diagnostic Tests

### Test 1: Check if Data Exists

Run these SQL queries:
```sql
-- Check clients
SELECT TOP 10 ClientID, Name FROM t_Client

-- Check currencies  
SELECT TOP 10 CurrencyID, Description FROM t_Currency

-- Check branches
SELECT TOP 10 OurBranchID, BranchName FROM t_SystemBranchSetting
```

**Share the results** - do you see data?

### Test 2: Check Search Request in Network Tab

1. Open Client Limit screen
2. Open browser DevTools (F12)
3. Go to Network tab
4. Click Client search button (🔍)
5. Click "Search" in the modal (even with empty fields)
6. In Network tab, find the API call
7. Click on it
8. Look at:
   - **Request URL**
   - **Request Payload** (what parameters are being sent)
   - **Response** (what the server returned)

**Share these details** and I can tell you exactly what's wrong.

---

## 📝 What I Need From You

To fix the search issue, please provide:

1. **SQL query results**: Do the tables have data?
   ```sql
   SELECT COUNT(*) FROM t_Client
   SELECT COUNT(*) FROM t_Currency
   SELECT COUNT(*) FROM t_SystemBranchSetting
   ```

2. **Network tab screenshot or details**:
   - What parameters are being sent in the search request?
   - What response is coming back?

3. **Search stored procedure name**: What's it called in your database?
   - Look for procedures like `p_Search*` or `p_GenericSearch`

4. **Search stored procedure code** (if possible): Share the SQL code

With this information, I can fix the search configurations to match your database exactly!

---

## 🎯 Most Likely Issue

Based on the fact that:
- Save works (so API connection is fine)
- Duplicate detection works (so data exists)
- But search returns empty

**Most likely**: The search is using wrong table names, column names, or the search stored procedure expects different parameters than we're sending.

**Next step**: Share the network request details and I'll fix it immediately! 🔧
