# Loan Approvals Service Integration Guide

## Overview
The Loan Approvals module now uses `LoanApprovalsService` to fetch and manage loan approval data from the database using the stored procedure `p_AddEditWFLoanApplications`.

## Service Location
- **Service File**: `/assets/js/services/workflow/loanApprovalsService.js`
- **Service Loader**: Added to `/assets/js/services/shared/serviceLoader.js`
- **HTML Integration**: `loan-approvals.html` loads serviceLoader before the main script
- **Module Script**: `loan-approvals.js` uses the service

## Available Service Methods

### 1. `getWFLoanApprovals(requestData)`
Fetches loan approval data from the database.

**Request Parameters:**
```javascript
{
  OurBranchID: "0101",           // Branch ID
  ApplicationID: "APP12345",     // Application ID (optional)
  ApplicationDate: "2026-01-20", // Date
  WFAdvTypeID: "1",              // Workflow Advance Type ID
  IsExistingClient: true,        // Boolean
  // ... (all other fields from SP)
}
```

**Response Format:**
```javascript
{
  success: true,      // or false
  code: "00",         // "00" = success
  message: "Success", // Human-readable message
  data: [...]         // Array of loan approval records
}
```

### 2. `addEditLoanApplication(requestData)`
Creates or updates a loan application.

**Full Request Schema:**
```javascript
{
  OurBranchID: "BranchID",              // Required
  ApplicationID: "ApplicationID",        // Required for edit
  ApplicationDate: "smalldatetime",      // Required
  WFAdvTypeID: "nvarchar",              // Workflow type
  IsExistingClient: "bit",              // Boolean
  ClientID: "ClientID",                 // Client identifier
  ProductID: "ProductID",               // Product identifier
  RepaymentAccountID: "AccountID",      // Account for repayment
  PurposeCodeID: "UserSubID",           // Purpose code
  CreditOfficerID: "OperatorID",        // Credit officer
  SalesOfficerID: "OperatorID",         // Sales officer
  LoanAmount: "Amount",                 // Loan amount
  LoanTerm: "smallint",                 // Term period
  LoanPeriodID: "SystemSubID",          // Period type
  DisbursementDate: "smalldatetime",    // Disbursement date
  BusinessLineID: "UserSubID",          // Business line
  AccountClassID: "nvarchar",           // Account class
  FileNumber: "nvarchar",               // File number
  InterestRate: "Rate",                 // Interest rate
  BusinessDetails: "nvarchar",          // Business details
  CommissionRate: "Rate",               // Commission rate
  TaxRate: "Rate",                      // Tax rate
  EffectiveRate: "Rate",                // Effective rate
  Penalty: "Amount",                    // Penalty amount
  CreatedBy: "OperatorID",              // Creator ID
  CreatedOn: "smalldatetime",           // Creation date
  ModifiedBy: "OperatorID",             // Modifier ID
  ModifiedOn: "smalldatetime",          // Modification date
  LoanTypeID: "SystemSubID",            // Loan type
  UpdateCount: "tinyint",               // Update counter
  ProductEffective: "Rate",             // Product effective rate
  DonorID: "varchar",                   // Donor ID
  GroupID: "varchar",                   // Group ID
  SubGroupID: "varchar",                // Sub-group ID
  LoanSchemeID: "nvarchar",             // Loan scheme
  IsOutPutRequired: "bit"               // Output required flag
}
```

### 3. `approveLoanApplication(requestData)`
Approves a loan application.

### 4. `rejectLoanApplication(requestData)`
Rejects a loan application.

## Usage Examples

### Example 1: Fetch Loan Approval Data
```javascript
async function fetchLoanApproval() {
  try {
    const result = await LoanApprovalsService.getWFLoanApprovals({
      OurBranchID: "0101",
      ApplicationID: "APP12345",
      ApplicationDate: "2026-01-20",
      WFAdvTypeID: "1",
      IsExistingClient: true,
      IsOutPutRequired: true
      // ... other fields with default values
    });

    if (result.success) {
      console.log('Data:', result.data);
      // Populate form with result.data
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Failed:', error);
  }
}
```

### Example 2: Create/Edit Loan Application
```javascript
async function saveLoanApplication(formData) {
  try {
    const result = await LoanApprovalsService.addEditLoanApplication({
      OurBranchID: formData.branchId,
      ApplicationID: formData.applicationId || '',
      ApplicationDate: formData.applicationDate,
      WFAdvTypeID: formData.workflowTypeId,
      IsExistingClient: formData.isExisting,
      ClientID: formData.clientId,
      ProductID: formData.productId,
      LoanAmount: parseFloat(formData.loanAmount),
      LoanTerm: parseInt(formData.loanTerm),
      InterestRate: parseFloat(formData.interestRate),
      CreatedBy: 'web_portal',
      CreatedOn: new Date().toISOString(),
      IsOutPutRequired: true
      // ... all other required fields
    });

    if (result.success) {
      alert('Loan application saved successfully!');
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (error) {
    console.error('Save failed:', error);
  }
}
```

### Example 3: Approve Application
```javascript
async function approveApplication(applicationId, branchId) {
  try {
    const result = await LoanApprovalsService.approveLoanApplication({
      ApplicationID: applicationId,
      OurBranchID: branchId,
      ApprovedBy: 'web_portal',
      ApprovedOn: new Date().toISOString(),
      Remarks: 'Approved via web portal'
    });

    if (result.success) {
      alert('Application approved successfully!');
    } else {
      alert(`Error: ${result.message}`);
    }
  } catch (error) {
    console.error('Approval failed:', error);
  }
}
```

## Testing the Service

### 1. Open Browser Console
Open the Loan Approvals page and check the console for:
```
✅ All services loaded successfully
🔵 LoanApprovalsService.getWFLoanApprovals
📤 Request Data: {...}
📦 Request Envelope: {...}
📥 Response: {...}
```

### 2. Test API Call
In the browser console, run:
```javascript
// Test fetching data
const result = await LoanApprovalsService.getWFLoanApprovals({
  OurBranchID: "0101",
  ApplicationID: "",
  ApplicationDate: "2026-01-20",
  WFAdvTypeID: "1",
  IsOutPutRequired: true
});
console.log(result);
```

### 3. Check Network Tab
- Open Network tab in DevTools
- Look for POST request to `/api/OldAPI`
- Check request payload and response

## Error Handling

The service automatically handles errors and returns normalized responses:

```javascript
// Success response
{
  success: true,
  code: "00",
  message: "Success",
  data: [...]
}

// Error response
{
  success: false,
  code: "01", // or other error code
  message: "Error description",
  data: null
}
```

Always check `result.success` before using `result.data`:

```javascript
const result = await LoanApprovalsService.getWFLoanApprovals(data);

if (result.success) {
  // Use result.data
  populateForm(result.data);
} else {
  // Handle error
  showError(result.message);
}
```

## Integration Flow

1. **HTML** loads `serviceLoader.js`
2. **serviceLoader.js** provides `loadLoanApprovalsService()` function
3. **loan-approvals.js** calls:
   ```javascript
   await ServiceLoader.loadCore();
   await ServiceLoader.loadLoanApprovalsService();
   ```
4. **LoanApprovalsService** becomes available on `window` object
5. Use service methods to interact with API

## Notes

- The service uses `CoreApi.makeRequestEnvelope()` to format requests automatically
- All responses are normalized by CoreApi
- Console logging is enabled for debugging (can be disabled in production)
- The service handles both GET (fetch) and POST (add/edit) operations using the same SP `p_AddEditWFLoanApplications`

## Cheat Sheet Reference

For more patterns and examples, see:
- `/assets/js/services/CHEAT_SHEET.md`
- `/assets/js/services/MODULE_CREATION_GUIDE.md`
