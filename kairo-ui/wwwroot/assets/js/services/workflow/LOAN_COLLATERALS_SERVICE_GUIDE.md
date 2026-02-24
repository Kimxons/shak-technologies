# Loan Collaterals Service Guide

## Overview
The Loan Collaterals Service handles database operations for the Workflow Loan Collaterals module using the `p_GetWFAdvCollaterals` stored procedure.

## Service Location
`/assets/js/services/workflow/loanCollateralsService.js`

## Usage

### 1. Load the Service
```javascript
await ServiceLoader.loadCore();
await ServiceLoader.loadLoanCollateralsService();

const LoanCollateralsService = window.LoanCollateralsService;
```

### 2. Get Workflow Advanced Collaterals

#### Method
```javascript
LoanCollateralsService.getWFAdvCollaterals(requestData)
```

#### Request Parameters
```javascript
{
  ModuleID: "1",                    // Module ID (smallint)
  OurBranchID: "0603",              // Branch ID
  ApplicationID: "0603165013",      // Application ID
  CollateralID: "",                 // Collateral ID (optional, use "" for all)
  OperatorID: "web_portal",         // Operator ID
  Direction: "1"                    // Direction: 1 = forward, 0 = backward
}
```

#### Example Usage
```javascript
const result = await LoanCollateralsService.getWFAdvCollaterals({
  ModuleID: "1",
  OurBranchID: window.sessionStorage.getItem("branchID") || "0603",
  ApplicationID: "0603165013",
  CollateralID: "",
  OperatorID: window.sessionStorage.getItem("operatorID") || "web_portal",
  Direction: "1"
});

if (result.success) {
  console.log("Collaterals data:", result.data);
  
  // Expected structure:
  // Details01: Collateral details (Owner, Type, Value, Currency, etc.)
  // Details02: Loan details (Sanction Amount, Currency)
  // Details03: Assigned collaterals grid data
} else {
  console.error("Error:", result.message);
}
```

#### Response Structure
```javascript
{
  success: true,
  code: "00",
  message: "Success",
  data: {
    Details01: [
      {
        Owner: "John Doe",
        OwnerName: "John Doe",
        CollateralType: "Land Title",
        CollateralTypeName: "Land Title",
        CollateralValue: 5000000.00,
        CurrencyID: "KES",
        UsedCollateralValue: 2000000.00
      }
    ],
    Details02: [
      {
        SanctionAmount: 1500000.00,
        LoanAmount: 1500000.00,
        CurrencyID: "KES",
        LoanCurrencyID: "KES"
      }
    ],
    Details03: [
      {
        CollateralID: "COLL001",
        ApportionedRatio: 0.5,
        ApportionedValue: 2500000.00,
        Margin: 0.6,
        ApportionedCollateralValue: 1500000.00,
        LoanCollateralValue: 1500000.00,
        ReferenceNo: "REF123",
        RefNo: "REF123",
        AssignedDate: "2026-01-15",
        ExchangeRate: 1.0
      }
      // ... more assigned collaterals
    ]
  }
}
```

### 3. Add/Edit Loan Collateral

#### Method
```javascript
LoanCollateralsService.addEditLoanCollateral(requestData)
```

#### Example
```javascript
const result = await LoanCollateralsService.addEditLoanCollateral({
  ApplicationID: "0603165013",
  CollateralID: "COLL001",
  ApportionedRatio: 0.5,
  ApportionedValue: 2500000.00,
  Margin: 0.6,
  ReferenceNo: "REF123",
  AssignedDate: "2026-01-15",
  ExchangeRate: 1.0,
  OperatorID: "web_portal"
});

if (result.success) {
  alert("Collateral saved successfully!");
}
```

### 4. Delete Loan Collateral

#### Method
```javascript
LoanCollateralsService.deleteLoanCollateral(requestData)
```

#### Example
```javascript
const result = await LoanCollateralsService.deleteLoanCollateral({
  ApplicationID: "0603165013",
  CollateralID: "COLL001",
  OperatorID: "web_portal"
});

if (result.success) {
  alert("Collateral deleted successfully!");
}
```

### 5. Withdraw Collateral

#### Method
```javascript
LoanCollateralsService.withdrawCollateral(requestData)
```

#### Example
```javascript
const result = await LoanCollateralsService.withdrawCollateral({
  ApplicationID: "0603165013",
  CollateralID: "COLL001",
  WithdrawnReason: "No longer required",
  OperatorID: "web_portal"
});

if (result.success) {
  alert("Collateral withdrawn successfully!");
}
```

## Complete Page Integration Example

```javascript
(async function () {
  // Load services
  const { ServiceLoader } = window;
  
  await ServiceLoader.loadCore();
  await ServiceLoader.loadLoanCollateralsService();
  
  const LoanCollateralsService = window.LoanCollateralsService;
  
  // Get ApplicationID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const applicationID = urlParams.get("ApplicationID");
  
  if (!applicationID) {
    console.warn("No ApplicationID provided");
    return;
  }
  
  // Load collaterals data
  const result = await LoanCollateralsService.getWFAdvCollaterals({
    ModuleID: "1",
    OurBranchID: window.sessionStorage.getItem("branchID") || "0603",
    ApplicationID: applicationID,
    CollateralID: "",
    OperatorID: window.sessionStorage.getItem("operatorID") || "web_portal",
    Direction: "1"
  });
  
  if (result.success) {
    // Populate collateral details
    if (result.data.Details01 && result.data.Details01.length > 0) {
      const details = result.data.Details01[0];
      document.getElementById("Owner").value = details.Owner || "";
      document.getElementById("CollateralType").value = details.CollateralType || "";
      document.getElementById("CollateralValue").value = details.CollateralValue || "";
    }
    
    // Populate loan details
    if (result.data.Details02 && result.data.Details02.length > 0) {
      const loanDetails = result.data.Details02[0];
      document.getElementById("SanctionAmount").value = loanDetails.SanctionAmount || "";
      document.getElementById("LoanCurrencyID").value = loanDetails.CurrencyID || "";
    }
    
    // Populate assigned collaterals grid
    if (result.data.Details03 && result.data.Details03.length > 0) {
      const tbody = document.querySelector("[data-lcol-rows]");
      result.data.Details03.forEach(item => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${item.CollateralID}</td>
          <td class="text-end">${item.ApportionedValue}</td>
          <td class="text-end">${item.Margin}</td>
        `;
        tbody.appendChild(row);
      });
    }
  }
})();
```

## Testing with CURL

### Test GET Request
```bash
curl -X 'POST' \
  'http://172.16.2.31:3306/api/OldAPI' \
  -H 'accept: */*' \
  -H 'Content-Type: application/json' \
  -d '{
  "RequestID": "dbo.p_GetWFAdvCollaterals",
  "FormId": "dbo.p_GetWFAdvCollaterals",
  "RequestData": {
    "ModuleID": "1",
    "OurBranchID": "0603",
    "ApplicationID": "0603165013",
    "CollateralID": "",
    "OperatorID": "web_portal",
    "Direction": "1"
  },
  "RequestTime": "01/20/2026 13:00:05",
  "AppName": "PROJECT_KAIRO",
  "Checksum": ""
}'
```

## Key Features

✅ **Auto-normalized responses** - All responses follow `{ success, code, message, data }` format
✅ **Error handling** - Automatic error detection and user-friendly messages
✅ **Request envelope** - CoreApi automatically builds proper request structure
✅ **Type safety** - JSDoc annotations for better IDE support
✅ **Consistent patterns** - Follows CHEAT_SHEET.md guidelines

## Notes

- The service automatically handles request envelope creation via `CoreApi.makeRequestEnvelope()`
- All responses are normalized by `CoreApi.post()`
- Response structure may vary based on backend implementation - check `Details01`, `Details02`, `Details03` arrays
- Direction parameter: `1` = forward/next, `0` = backward/previous

## Related Files

- Service: `/assets/js/services/workflow/loanCollateralsService.js`
- Service Loader: `/assets/js/services/shared/serviceLoader.js`
- Page JS: `/assets/js/pages/loans/loan-maintenance/dataentry/loan-collaterals.js`
- Page HTML: `/modules/loans/loan-maintenance/dataentry/loan-collaterals.html`

---

**Happy Coding! 🚀**
