# Transaction Details Population Implementation

## Summary
Implemented automatic population of transaction details (Debit Trx ID and Credit Trx ID) in the Rule Details grid using the `dbo.p_GetProductAcRuleTrx` stored procedure.

## Changes Made

### 1. Added Service Method (productLgLcService.js)
**New method:** `getProductAcRuleTrx(requestData)`

```javascript
/**
 * Get Product Accounting Rule Transaction Details.
 * Stored procedure: dbo.p_GetProductAcRuleTrx
 * @param {object} requestData - { BankID, ProductID, EventID, Module }
 */
getProductAcRuleTrx(requestData) {
  const formId = "dbo.p_GetProductAcRuleTrx";
  const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
  return CoreApi.post(PRODUCT_ENDPOINT, envelope);
}
```

**Request Format:**
```json
{
  "RequestID": "dbo.p_GetProductAcRuleTrx",
  "FormId": "dbo.p_GetProductAcRuleTrx",
  "RequestData": {
    "BankID": "00",
    "ProductID": "ProductTypeID",
    "EventID": "EventID",
    "Module": "ProductTypeID"
  },
  "RequestTime": "01/30/2026 17:18:37",
  "AppName": "PROJECT_KAIRO",
  "Checksum": ""
}
```

### 2. Added Transaction Enrichment Function (rule-details.embedded.js)
**New function:** `enrichRowsWithTransactionDetails(rows, BankID, EventID)`

**Purpose:** Fetches transaction details and merges them with grid rows

**Process:**
1. Calls `ProductLgLcService.getProductAcRuleTrx()` with BankID, ProductID, EventID, Module
2. Extracts transaction records from response
3. Creates a lookup map by ComponentID
4. Enriches each row with matching debit and credit transaction descriptions
5. Returns enriched rows

**Code Flow:**
```javascript
async function enrichRowsWithTransactionDetails(rows, BankID, EventID) {
  // 1. Fetch transaction details
  const response = await ProductLgLcService.getProductAcRuleTrx({
    BankID, ProductID, EventID, Module
  });
  
  // 2. Extract transactions
  const transactions = response.data.Details;
  
  // 3. Create lookup map by ComponentID
  const trxMap = {};
  transactions.forEach(trx => {
    trxMap[trx.ComponentID] = trxMap[trx.ComponentID] || [];
    trxMap[trx.ComponentID].push(trx);
  });
  
  // 4. Enrich rows
  return rows.map(row => {
    const componentTrxs = trxMap[row.ComponentID] || [];
    const debitTrx = componentTrxs.find(t => t.TrxType === 'DR');
    const creditTrx = componentTrxs.find(t => t.TrxType === 'CR');
    
    return {
      ...row,
      DebitTrxID: debitTrx?.TrxDescription || '',
      CreditTrxID: creditTrx?.TrxDescription || ''
    };
  });
}
```

### 3. Integrated into Grid Loading (rule-details.embedded.js)
**Modified:** `loadRuleDetailsGrid()` function

**Added:**
```javascript
// Fetch transaction details for each row to populate Debit Trx ID and Credit Trx ID
if (rows.length > 0) {
  console.log('[RuleDetails] Fetching transaction details for', rows.length, 'rows');
  rows = await enrichRowsWithTransactionDetails(rows, BankID, sysEventID);
}
```

## How It Works

### Step-by-Step Flow:

1. **User clicks View button**
   - Selects an Event from dropdown
   - Clicks View to load rule details

2. **System loads rule details**
   - Calls `p_GetProductAcRuleDetail` to get grid rows
   - Extracts rows from response (Details01)

3. **System fetches transaction details**
   - Calls `p_GetProductAcRuleTrx` with BankID, ProductID, EventID, Module
   - Gets transaction records for the event

4. **System enriches rows**
   - Creates lookup map of transactions by ComponentID
   - For each row:
     - Finds matching transactions by ComponentID
     - Finds debit transaction (TrxType = 'DR')
     - Finds credit transaction (TrxType = 'CR')
     - Adds transaction descriptions to row

5. **Grid displays enriched data**
   - Debit Trx ID column shows debit transaction description
   - Credit Trx ID column shows credit transaction description

## Transaction Matching Logic

### By ComponentID:
```javascript
// Group transactions by ComponentID
trxMap = {
  'COMP001': [
    { ComponentID: 'COMP001', TrxType: 'DR', TrxDescription: 'Debit Customer Account' },
    { ComponentID: 'COMP001', TrxType: 'CR', TrxDescription: 'Credit Income Account' }
  ],
  'COMP002': [...]
}

// Match to row
row.ComponentID = 'COMP001'
→ Find transactions for COMP001
→ DebitTrxID = 'Debit Customer Account'
→ CreditTrxID = 'Credit Income Account'
```

### Transaction Type Detection:
The function looks for multiple field variations:
- `TrxType === 'DR'` or `TrxType === 'Debit'`
- `DrCr === 'DR'`
- For credit: `TrxType === 'CR'` or `TrxType === 'Credit'`
- `DrCr === 'CR'`

### Description Field Mapping:
Tries multiple field names for transaction description:
- `TrxDescription`
- `Description`
- Falls back to existing row data if not found

## Grid Columns Populated

| Column | Source | Example Value |
|--------|--------|---------------|
| Component | p_GetProductAcRuleDetail | "Interest" |
| Debit Account Tag | p_GetProductAcRuleDetail | "Customer Account" |
| Credit Account Tag | p_GetProductAcRuleDetail | "Income Account" |
| **Debit Trx ID** | **p_GetProductAcRuleTrx** | **"Debit Customer Account"** |
| **Credit Trx ID** | **p_GetProductAcRuleTrx** | **"Credit Income Account"** |

## Error Handling

### Service Not Available:
```javascript
if (!global.ProductLgLcService?.getProductAcRuleTrx) {
  console.warn('Service not available');
  return rows; // Return original rows
}
```

### API Call Fails:
```javascript
if (!response?.success) {
  console.warn('Failed to load transaction details');
  return rows; // Return original rows
}
```

### Exception Handling:
```javascript
try {
  // Enrich rows
} catch (err) {
  console.error('Error enriching rows:', err);
  return rows; // Return original rows on error
}
```

**Result:** Grid always displays, even if transaction details fail to load

## Response Structure Handling

The function handles multiple response structures:

```javascript
// Try Details
if (Array.isArray(trxData?.Details)) {
  transactions = trxData.Details;
}
// Try Details01
else if (Array.isArray(trxData?.Details01)) {
  transactions = trxData.Details01;
}
// Try direct array
else if (Array.isArray(trxData)) {
  transactions = trxData;
}
```

## Console Logging

For debugging, the function logs:
- Request parameters
- Response data
- Number of transactions found
- Transaction map structure
- Enriched rows

**Example logs:**
```
[RuleDetails] Fetching transaction details for 3 rows
[RuleDetails] Fetching transaction details with: {BankID: "00", ProductID: "PROD001", EventID: "EVT001", Module: "PROD001"}
[RuleDetails] Transaction details response: {success: true, data: {...}}
[RuleDetails] Found 6 transaction records
[RuleDetails] Transaction map: {COMP001: [...], COMP002: [...]}
[RuleDetails] Enriched rows with transaction details: [...]
```

## Benefits

1. **Automatic Population** - Transaction details load automatically with grid
2. **No Manual Entry** - Users don't need to manually enter transaction IDs
3. **Data Consistency** - Transaction details come from centralized source
4. **Error Resilient** - Grid displays even if transaction fetch fails
5. **Flexible Matching** - Handles multiple response structures and field names

## Testing Checklist

- [ ] View button loads grid with transaction details
- [ ] Debit Trx ID column shows correct descriptions
- [ ] Credit Trx ID column shows correct descriptions
- [ ] Grid displays even if transaction service fails
- [ ] Console shows transaction enrichment logs
- [ ] Multiple rows all get their transaction details
- [ ] Transaction details match the component
- [ ] Empty transactions don't break the grid
