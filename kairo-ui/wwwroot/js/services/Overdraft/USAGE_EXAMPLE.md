# Overdraft Service - getApplicationDocuments Usage

## Service Method Added
`OverdraftService.getApplicationDocuments(requestData)`

## Request Parameters

```javascript
const requestData = {
  OurBranchID: "0325",           // Branch ID
  AccountID: "0101391000001",    // Account ID
  ApplicationID: "0101000001",   // Application ID
  DocumentID: "",                // Optional - specific document ID or empty for all
  OperatorID: "USR001",          // Operator ID
  Direction: 1                   // Direction (smallint)
};
```

## Usage in Your Page

### Step 1: Load Services in HTML
```html
<script src="../../assets/js/services/shared/serviceLoader.js"></script>
<script src="../../assets/js/pages/yourModule/your-page.js"></script>
```

### Step 2: Page JS Implementation
```javascript
// pages/overdraft/overdraft-documents.js
(async function() {
  const { ServiceLoader } = window;
  
  // Load required services
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOverdraftService();
  await ServiceLoader.loadLookupService();  // If using dropdowns
  
  // Get services
  const OverdraftService = window.OverdraftService;
  const LookupService = window.LookupService;
  
  // Function to fetch documents
  async function fetchDocuments() {
    const requestData = {
      OurBranchID: document.getElementById("branchId").value,
      AccountID: document.getElementById("accountId").value,
      ApplicationID: document.getElementById("applicationId").value,
      DocumentID: document.getElementById("documentId").value || "",
      OperatorID: "web_portal",
      Direction: 1
    };
    
    const result = await OverdraftService.getApplicationDocuments(requestData);
    
    if (result.success) {
      const parsed = OverdraftService.parseDocumentResponse(result);
      displayDocuments(parsed.documents); // Details02 array
    } else {
      alert(`Error: ${result.message}`);
    }
  }
  
  // Function to display documents in the form
  function displayDocuments(documents) {
    if (!documents || documents.length === 0) {
      console.log("No documents found");
      return;
    }
    
    // Get the first document (or loop through all)
    const doc = documents[0];
    
    // Populate form fields
    document.getElementById("ourBranchID").value = doc.OurBranchID || "";
    document.getElementById("applicationID").value = doc.ApplicationID || "";
    document.getElementById("accountID").value = doc.AccountID || "";
    document.getElementById("documentID").value = doc.DocumentID || "";
    document.getElementById("documentClassID").value = doc.DocumentClassID || "";
    document.getElementById("description").value = doc.Description || "";
    document.getElementById("documentTypeID").value = doc.DocumentTypeID || "";
    document.getElementById("receivedBy").value = doc.ReceivedBy || "";
    document.getElementById("receivedDate").value = doc.ReceivedDate || "";
    document.getElementById("imageID").value = doc.ImageID || "";
    document.getElementById("locationID").value = doc.LocationID || "";
    document.getElementById("remarks").value = doc.Remarks || "";
    document.getElementById("createdBy").value = doc.CreatedBy || "";
    document.getElementById("createdOn").value = doc.CreatedOn || "";
    document.getElementById("modifiedBy").value = doc.ModifiedBy || "";
    document.getElementById("modifiedOn").value = doc.ModifiedOn || "";
    document.getElementById("supervisedBy").value = doc.SupervisedBy || "";
    document.getElementById("supervisedOn").value = doc.SupervisedOn || "";
    document.getElementById("updateCount").value = doc.UpdateCount || 0;
    
    console.log("Document loaded successfully");
  }
  
  // Function to display multiple documents in a table
  function displayDocumentsTable(documents) {
    const tbody = document.getElementById("documentsTableBody");
    tbody.innerHTML = "";
    
    documents.forEach(doc => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${doc.DocumentID}</td>
        <td>${doc.DocumentClassID}</td>
        <td>${doc.Description}</td>
        <td>${doc.DocumentTypeID}</td>
        <td>${doc.ReceivedDate}</td>
        <td>${doc.LocationID}</td>
        <td>
          <button onclick="viewDocument('${doc.DocumentID}')">View</button>
          <button onclick="editDocument('${doc.DocumentID}')">Edit</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }
  
  // Initialize page
  function initPage() {
    // Attach event listeners
    document.getElementById("searchBtn")?.addEventListener("click", fetchDocuments);
    
    // Load dropdowns if needed
    loadDropdowns();
  }
  
  async function loadDropdowns() {
    // Example: Load document class dropdown
    const docClasses = await LookupService.getSystemCodeOptions("DocumentClassID");
    const select = document.getElementById("documentClassID");
    if (select) {
      select.innerHTML = '<option value="">Select Document Class...</option>';
      docClasses.forEach(opt => {
        select.innerHTML += `<option value="${opt.value}">${opt.label}</option>`;
      });
    }
  }
  
  initPage();
})();
```

## Response Structure

The API returns data in this format:

```javascript
{
  success: true,
  code: "00",
  message: "Success",
  data: {
    Details: [
      {
        OperatorID: "",
        EventID: 0,
        NewData: "",
        CreatedOn: "",
        UpdateCount: 0
      }
    ],
    Details01: [],
    Details02: [  // Main document records
      {
        OurBranchID: "0325",
        ApplicationID: "0101000001",
        AccountID: "0101391000001",
        DocumentID: "DOC1",
        DocumentClassID: "IDENTITY",
        Description: "Updated Identity Document",
        DocumentTypeID: "ID_CARD",
        ReceivedBy: "USR001",
        ReceivedDate: "2026-01-15",
        ImageID: null,
        LocationID: "LOC_VAULT_A",
        Remarks: "National ID - Clear copy",
        CreatedBy: "USR001",
        CreatedOn: "2026-01-15T09:32:00",
        ModifiedBy: null,
        ModifiedOn: null,
        SupervisedBy: "SUP001",
        SupervisedOn: "2026-01-15T10:00:00",
        UpdateCount: 2
      }
    ],
    Details03: []
  }
}
```

## Using the Helper Method

The service includes a helper method to parse the response:

```javascript
const result = await OverdraftService.getApplicationDocuments(requestData);
const parsed = OverdraftService.parseDocumentResponse(result);

// parsed structure:
// {
//   documents: [...],  // Details02 array - main documents
//   details: [...],    // Details array
//   details01: [...],  // Details01 array
//   details03: [...]   // Details03 array
// }
```

## Complete Example with Error Handling

```javascript
async function loadDocumentData() {
  try {
    // Show loading indicator
    showLoading();
    
    const requestData = {
      OurBranchID: "0325",
      AccountID: "0101391000001",
      ApplicationID: "0101000001",
      DocumentID: "",
      OperatorID: "web_portal",
      Direction: 1
    };
    
    const result = await OverdraftService.getApplicationDocuments(requestData);
    
    if (result.success) {
      const parsed = OverdraftService.parseDocumentResponse(result);
      
      if (parsed.documents.length > 0) {
        // Display the documents
        displayDocuments(parsed.documents);
      } else {
        showMessage("No documents found for this application");
      }
    } else {
      showError(`Failed to load documents: ${result.message}`);
    }
  } catch (error) {
    console.error("Error loading documents:", error);
    showError("An unexpected error occurred");
  } finally {
    hideLoading();
  }
}
```

## Form Field Mapping

Map the response fields to your HTML form inputs:

| Response Field | Form Input ID | Data Type | Description |
|---------------|---------------|-----------|-------------|
| OurBranchID | ourBranchID | string | Branch ID |
| ApplicationID | applicationID | string | Application ID |
| AccountID | accountID | string | Account ID |
| DocumentID | documentID | string | Document ID |
| DocumentClassID | documentClassID | string | Document class |
| Description | description | string | Description |
| DocumentTypeID | documentTypeID | string | Document type |
| ReceivedBy | receivedBy | string | Received by |
| ReceivedDate | receivedDate | date | Received date |
| ImageID | imageID | string | Image ID |
| LocationID | locationID | string | Location ID |
| Remarks | remarks | string | Remarks |
| CreatedBy | createdBy | string | Created by |
| CreatedOn | createdOn | datetime | Created on |
| ModifiedBy | modifiedBy | string | Modified by |
| ModifiedOn | modifiedOn | datetime | Modified on |
| SupervisedBy | supervisedBy | string | Supervised by |
| SupervisedOn | supervisedOn | datetime | Supervised on |
| UpdateCount | updateCount | number | Update count |

## Tips

1. **Always check `result.success`** before accessing `result.data`
2. **Use the parseDocumentResponse helper** for cleaner code
3. **Handle empty results gracefully** - user feedback is important
4. **Log errors** to the console for debugging
5. **Show loading indicators** during API calls for better UX
6. **Validate input** before making API calls
7. **The main document data is in Details02 array** - that's what you'll display in the form

## Environment Setup

Make sure your `environment.js` has the correct base URL:

```javascript
const Environment = {
  baseUrlCommon: "http://172.16.2.31:3306",
  // ... other configs
};
```
