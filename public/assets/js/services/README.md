## Service Layer Architecture

## Table of Contents
1. [Architecture Pattern](#architecture-pattern)
2. [Directory Structure](#directory-structure)
3. [Core Components](#core-components)
4. [Creating Services](#creating-a-new-module-service)
5. [Templates](#templates)

## Architecture Pattern

```
services/
├── shared/                     # Shared/common services
│   ├── coreApi.js             # Core API utility (request/response handling)
│   ├── lookupService.js       # System codes and lookup data
│   └── searchService.js       # Search functionality
├── client/                    # Client module services
│   └── clientService.js       # Client CRUD operations
├── clientService.js           # DEPRECATED - Use client/clientService.js
└── lookupService.js           # DEPRECATED - Use shared/lookupService.js
```

## Core Components

### 1. CoreApi (shared/coreApi.js)

The foundation of all API communication. Provides:

- **Request envelope generation** with standardized structure
- **Response normalization** for consistent data handling
- **Error handling** with proper error codes
- **HTTP methods** (GET, POST, PUT, DELETE)

#### Request Format

```javascript
{
  "RequestID": "GetClient_1737043200000",
  "FormID": "GetClient",
  "RequestDatax": {
    "OurBranchID": "0101",
    "ClientID": "0000123"
  },
  "RequestTime": "2024-01-16T10:00:00",
  "AppName": "CORE_BANKING",
  "Checksum": ""
}
```

#### Response Formats

**Success with ResponseCode:**
```javascript
{
  "ResponseCode": "00",
  "ResponseMessage": "Success",
  "Details": { "ClientID": "0000123", ... }
}
```

**Failure:**
```javascript
{
  "ResponseCode": "DBEX____",
  "ResponseMessage": "<FAILED>",
  "Details": { ... }
}
```

**Details Only (implicit success):**
```javascript
{
  "Details": [
    { "BankID": "55", "ProductID": "TAD01", ... }
  ]
}
```

#### Normalized Response

All responses are normalized to:
```javascript
{
  success: boolean,        // true if ResponseCode === "00" or Details exists
  code: string,           // ResponseCode or "00"
  message: string,        // ResponseMessage or "Success"
  data: object|array,     // The Details data
  Details: object|array   // Original Details (for backward compatibility)
}
```

### 2. ClientService (client/clientService.js)

Handles all client-related operations:

```javascript
// Get client details
const response = await ClientService.getClient({
  OurBranchID: "0101",
  ClientID: "0000123"
});

if (response.success) {
  console.log(response.data); // Client details
} else {
  console.error(response.message);
}

// Create new client
const response = await ClientService.createClient({
  ClientName: "John Doe",
  ClientTypeID: "IND",
  // ... other fields
});

// Update existing client
const response = await ClientService.updateClient({
  ClientID: "0000123",
  ClientName: "Jane Doe",
  // ... updated fields
});
```

### 3. LookupService (shared/lookupService.js)

Handles system codes, lookups, and search functionality:

```javascript
// Get system code options (cached)
const clientTypes = await LookupService.getClientTypes();
// Returns: [{ value: "IND", label: "Individual", order: 1 }, ...]

const titles = await LookupService.getTitles();
const genders = await LookupService.getGenders();
const countries = await LookupService.getCountries();

// Direct API calls (not cached)
const response = await LookupService.getSystemCode({
  CodeID: "ClientTypeID"
});

// Search functionality
const results = await LookupService.searchClients("John");
const accounts = await LookupService.searchAccounts("12345");

// Clear cache
LookupService.clearCache("ClientTypeID"); // Clear specific
LookupService.clearCache(); // Clear all
```

## Creating a New Module Service

Follow this pattern for new module services:

```javascript
// filepath: services/[module-name]/[module-name]Service.js
(function (global) {
  const CoreApi = global.CoreApi;
  const Environment = global.Environment || {};

  if (!CoreApi) {
    console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included.");
    return;
  }

  // Get base URL from environment
  const MODULE_BASE_URL = (Environment.baseUrlModuleName || "http://localhost:PORT").replace(/\/+$/, "");

  const endpoints = {
    create: `${MODULE_BASE_URL}/api/v1/Module/Create`,
    update: `${MODULE_BASE_URL}/api/v1/Module/Update`,
    get: `${MODULE_BASE_URL}/api/v1/Module/Get`,
  };

  const ModuleService = {
    /**
     * Create new record
     * @param {object} requestData - Record data
     * @returns {Promise} Normalized response
     */
    create(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("ModuleCreate", requestData);
      return CoreApi.post(endpoints.create, envelope);
    },

    /**
     * Update existing record
     * @param {object} requestData - Record data
     * @returns {Promise} Normalized response
     */
    update(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("ModuleUpdate", requestData);
      return CoreApi.post(endpoints.update, envelope);
    },

    /**
     * Get record details
     * @param {object} requestData - Query parameters
     * @returns {Promise} Normalized response
     */
    get(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("ModuleGet", requestData);
      return CoreApi.post(endpoints.get, envelope);
    }
  };

  global.ModuleService = ModuleService;
})(window);
```

## Architecture Pattern

### Separation of Concerns

**HTML files are for display only.** They should NOT directly reference service files. Instead:

1. **HTML** loads only:
   - ServiceLoader utility
   - Page-specific JavaScript file

2. **Page JavaScript** handles:
   - Loading service dependencies
   - Business logic
   - Event handlers
   - API calls

### HTML File Setup

Keep HTML minimal - only load ServiceLoader and your page JS:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Your Module</title>
  <link rel="stylesheet" href="../../assets/css/main.css">
</head>
<body>
  <!-- Your display markup here -->
  
  <!-- Scripts: Only ServiceLoader and page JS -->
  <script src="../../assets/js/services/shared/serviceLoader.js"></script>
  <script src="../../assets/js/pages/your-module/your-page.js"></script>
</body>
</html>
```

### Page JavaScript Setup

Your page JS file loads its own dependencies:

```javascript
(function (global) {
  // Prevent duplicate loading
  if (global.__YourPageLoaded) return;
  global.__YourPageLoaded = true;

  /**
   * Load required services
   */
  async function loadDependencies() {
    const { ServiceLoader } = global;
    
    // Load core (Environment, Config, CoreApi)
    await ServiceLoader.loadCore();
    
    // Load services you need
    await ServiceLoader.loadCommonServices(); // Client, Lookup, Search
    // OR load specific services:
    // await ServiceLoader.loadClientService();
    // await ServiceLoader.loadLookupService();
  }

  /**
   * Initialize page
   */
  async function init() {
    // Wait for services
    const ClientService = await ServiceLoader.waitForService('ClientService');
    const LookupService = await ServiceLoader.waitForService('LookupService');
    
    // Your initialization logic
    const clientTypes = await LookupService.getClientTypes();
    // ... setup UI, bind events, etc.
  }

  /**
   * Start application
   */
  async function start() {
    await loadDependencies();
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      await init();
    }
  }

  start();
})(window);
```

See `pages/_template-page.js` for a complete template.

## Environment Configuration

Base URLs are configured in `environment.js`:

```javascript
const environment = {
  production: false,
  name: 'LOCAL',
  
  baseUrlAuth: "http://localhost:5177",
  baseUrlClient: "http://localhost:6902",
  baseUrlSystemCodes: "http://localhost:5059",
  baseUrlYourModule: "http://localhost:XXXX",
  
  appName: "CORE_BANKING"
};
```

## Best Practices

1. **Always use CoreApi.makeRequestEnvelope()** to create request payloads
2. **Check response.success** before accessing response.data
3. **Use descriptive FormIDs** that match your operation (e.g., "GetClient", "CreateAccount")
4. **Handle errors gracefully** with proper user feedback
5. **Cache lookup data** when appropriate (LookupService does this automatically)
6. **Keep services thin** - business logic belongs in page/component files
7. **Document your service methods** with JSDoc comments
8. **Test both success and failure scenarios**

## Migration from Old Pattern

If you have code using the old pattern:

### Old Pattern
```javascript
const payload = {
  RequestData: { ClientID: "0000123" }
};
const response = await ClientService.getClient(payload);
const data = response.Details || response.data;
```

### New Pattern
```javascript
const response = await ClientService.getClient({
  ClientID: "0000123"
});

if (response.success) {
  const data = response.data;
  // Use data
} else {
  console.error(response.message);
}
```

## Deprecated Files

The following files are deprecated and will be removed in a future version:

- `services/clientService.js` → Use `services/client/clientService.js`
- `services/lookupService.js` → Use `services/shared/lookupService.js`

They currently show console warnings when loaded.

## Support

For questions or issues with the service layer, contact the development team.
