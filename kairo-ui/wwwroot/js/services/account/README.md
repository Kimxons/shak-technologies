# Account Classification Service

A complete service implementation for managing Account Classifications following the project's service layer architecture.

## 📁 File Structure

```
kairo/
├── public/
│   ├── assets/
│   │   └── js/
│   │       ├── services/
│   │       │   ├── account/
│   │       │   │   └── accountClassificationService.js  ← Service Layer
│   │       │   └── shared/
│   │       │       └── serviceLoader.js                  ← Updated with loader
│   │       └── pages/
│   │           └── account/
│   │               └── account-classification-example.js ← Page Logic
│   └── pages/
│       └── account/
│           └── account-classification-example.html       ← HTML Page
```

## 🚀 Quick Start

### 1. In Your HTML File

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>Account Classification</title>
</head>
<body>
    <!-- Your HTML content here -->
    
    <!-- ONLY 2 scripts needed! -->
    <script src="../../assets/js/services/shared/serviceLoader.js"></script>
    <script src="../../assets/js/pages/account/account-classification-example.js"></script>
</body>
</html>
```

### 2. In Your Page JS File

```javascript
(async function() {
  const { ServiceLoader } = window;
  
  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadAccountClassificationService();
  await ServiceLoader.loadLookupService(); // If needed for dropdowns
  
  // Get service
  const AccountClassificationService = window.AccountClassificationService;
  
  // Use the service
  const result = await AccountClassificationService.getAccountClassification({
    BankID: '001',
    OurBranchID: '0101',
    ClassificationID: '',
    OperatorID: 'SYSTEM',
    Direction: 'N'
  });
  
  if (result.success) {
    console.log('Classifications:', result.data);
  }
})();
```

## 📖 Available Methods

### Get Classifications

```javascript
const result = await AccountClassificationService.getAccountClassification({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: '', // Empty for all
  OperatorID: 'SYSTEM',
  Direction: 'N'
});
```

### Save (Add) New Classification

```javascript
const result = await AccountClassificationService.saveAccountClassification({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: 'CLS001',
  ClassificationName: 'Premium',
  Description: 'Premium account classification',
  CreatedBy: 'SYSTEM',
  CreatedOn: '02/09/2026',
  OperatorID: 'SYSTEM',
  NewRecord: 1
});
```

### Edit Existing Classification

```javascript
const result = await AccountClassificationService.editAccountClassification({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: 'CLS001',
  ClassificationName: 'Premium Plus',
  Description: 'Updated description',
  CreatedBy: 'SYSTEM',
  CreatedOn: '02/09/2026',
  ModifiedBy: 'SYSTEM',
  ModifiedOn: '02/09/2026',
  SupervisedBy: 'SYSTEM',
  NewRecord: 0
});
```

### Delete Classification

```javascript
const result = await AccountClassificationService.deleteAccountClassification({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: 'CLS001',
  OperatorID: 'SYSTEM'
});
```

### Search Classifications

```javascript
const result = await AccountClassificationService.searchAccountClassifications({
  BankID: '001',
  OurBranchID: '0101',
  SearchTerm: 'Premium',
  OperatorID: 'SYSTEM'
});
```

### Get Classification Details

```javascript
const result = await AccountClassificationService.getAccountClassificationDetails({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: 'CLS001',
  OperatorID: 'SYSTEM'
});
```

### Get Classification Types

```javascript
const result = await AccountClassificationService.getAccountClassificationTypes({
  BankID: '001',
  OurBranchID: '0101',
  OperatorID: 'SYSTEM'
});
```

### Assign Classification to Accounts

```javascript
const result = await AccountClassificationService.assignClassificationToAccounts({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: 'CLS001',
  AccountIDs: 'ACC001,ACC002,ACC003', // Comma-separated
  OperatorID: 'SYSTEM'
});
```

### Get Accounts by Classification

```javascript
const result = await AccountClassificationService.getAccountsByClassification({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: 'CLS001',
  OperatorID: 'SYSTEM'
});
```

### Validate Classification

```javascript
const result = await AccountClassificationService.validateAccountClassification({
  BankID: '001',
  ClassificationID: 'CLS001',
  OperatorID: 'SYSTEM'
});
```

### Get Classification Statistics

```javascript
const result = await AccountClassificationService.getClassificationStatistics({
  BankID: '001',
  OurBranchID: '0101',
  ClassificationID: 'CLS001',
  OperatorID: 'SYSTEM'
});
```

## 📊 Response Format

All methods return a normalized response:

```javascript
{
  success: true,        // or false
  code: "00",          // "00" = success, others = error codes
  message: "Success",  // Human-readable message
  data: {              // Response payload
    Details: [...]     // Usually array of records
  }
}
```

### Usage Pattern

```javascript
const result = await AccountClassificationService.getAccountClassification({...});

if (result.success) {
  // Success - use result.data
  const classifications = result.data.Details || result.data || [];
  console.log('Classifications:', classifications);
} else {
  // Error - show result.message
  console.error('Error:', result.message);
  alert('Failed: ' + result.message);
}
```

## 🔧 Configuration

### Environment Setup

Add to your `environment.js`:

```javascript
const Environment = {
  // Existing config...
  
  // Account Classification Service URL (optional - defaults to baseUrlCommon)
  baseUrlAccountClassification: "http://localhost:5000",
  
  // Or use common URL for all services
  baseUrlCommon: "http://localhost:5000"
};
```

### Base URL Priority

The service uses this priority for base URL:

1. `Environment.baseUrlAccountClassification` (specific)
2. `Environment.baseUrlCommon` (shared)
3. `"http://localhost:5000"` (fallback)

## 🎯 Common Operations Example

### Full CRUD Workflow

```javascript
(async function() {
  const { ServiceLoader } = window;
  
  // 1. Load services
  await ServiceLoader.loadCore();
  await ServiceLoader.loadAccountClassificationService();
  
  const service = window.AccountClassificationService;
  
  // 2. Create (Add)
  const createResult = await service.saveAccountClassification({
    BankID: '001',
    OurBranchID: '0101',
    ClassificationID: 'CLS001',
    ClassificationName: 'Premium',
    Description: 'Premium accounts',
    CreatedBy: 'SYSTEM',
    CreatedOn: new Date().toLocaleDateString('en-US'),
    OperatorID: 'SYSTEM',
    NewRecord: 1
  });
  
  if (createResult.success) {
    console.log('Created successfully!');
    
    // 3. Read (Get)
    const getResult = await service.getAccountClassification({
      BankID: '001',
      OurBranchID: '0101',
      ClassificationID: 'CLS001',
      OperatorID: 'SYSTEM',
      Direction: 'N'
    });
    
    if (getResult.success) {
      const classifications = getResult.data.Details || [];
      console.log('Found:', classifications.length);
      
      // 4. Update (Edit)
      const updateResult = await service.editAccountClassification({
        BankID: '001',
        OurBranchID: '0101',
        ClassificationID: 'CLS001',
        ClassificationName: 'Premium Plus',
        Description: 'Updated premium accounts',
        CreatedBy: 'SYSTEM',
        CreatedOn: new Date().toLocaleDateString('en-US'),
        ModifiedBy: 'SYSTEM',
        ModifiedOn: new Date().toLocaleDateString('en-US'),
        SupervisedBy: 'SYSTEM',
        NewRecord: 0
      });
      
      if (updateResult.success) {
        console.log('Updated successfully!');
        
        // 5. Delete
        const deleteResult = await service.deleteAccountClassification({
          BankID: '001',
          OurBranchID: '0101',
          ClassificationID: 'CLS001',
          OperatorID: 'SYSTEM'
        });
        
        if (deleteResult.success) {
          console.log('Deleted successfully!');
        }
      }
    }
  }
})();
```

## 🧪 Testing the Service

### Open the Example Page

1. Navigate to: `http://localhost:[port]/pages/account/account-classification-example.html`
2. Open browser console (F12)
3. You should see:
   ```
   Account Classification Service loaded: true
   Initializing Account Classification page...
   Loading classifications...
   ```

### Test Operations

1. **View**: Classifications load automatically on page load
2. **Search**: Enter search term and click Search button
3. **Add**: Click "Add New" button, enter details, click "Save"
4. **Edit**: Select a row, click "Edit", modify fields, click "Save"
5. **Delete**: Select a row, click "Delete", confirm

## 📝 Notes

### NewRecord Flag

- `NewRecord: 1` = Creating a new record (Add/Save operation)
- `NewRecord: 0` = Updating existing record (Edit operation)

### Date Format

Always use MM/DD/YYYY format:

```javascript
const now = new Date();
const formattedDate = now.toLocaleDateString('en-US');
// Example: "02/09/2026"
```

### Error Handling

Always check `result.success`:

```javascript
const result = await service.someMethod({...});

if (!result.success) {
  console.error('Error code:', result.code);
  console.error('Error message:', result.message);
  alert('Operation failed: ' + result.message);
  return; // Stop processing
}

// Continue with success logic
const data = result.data;
```

## 🔗 Related Services

When building Account Classification pages, you might also need:

```javascript
// Load related services
await ServiceLoader.loadLookupService();    // For dropdowns
await ServiceLoader.loadSearchService();     // For search functionality
await ServiceLoader.loadGeneralLedgerService(); // For GL account operations
```

## 🎓 Learning Resources

- **Service Layer Cheat Sheet**: `/assets/js/services/CHEAT_SHEET.md`
- **Service Architecture**: `/assets/js/services/README.md`
- **Example Implementation**: See `account-classification-example.js`

## ✅ Checklist for New Pages

- [ ] Created service file in `services/account/`
- [ ] Added loader function to `serviceLoader.js`
- [ ] Exported loader in ServiceLoader object
- [ ] Created page JS file in `pages/account/`
- [ ] Created HTML file in `pages/account/`
- [ ] Loaded only 2 scripts in HTML (serviceLoader + page JS)
- [ ] Used async IIFE pattern in page JS
- [ ] Loaded dependencies before using services
- [ ] Checked `result.success` before using data
- [ ] Handled errors gracefully

---

**Created**: February 9, 2026  
**Service**: Account Classification Service  
**Version**: 1.0.0
