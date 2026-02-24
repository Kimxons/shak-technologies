# System Core API

**System Core API** is a web API service that provides core system operations for the Kairo banking system. It follows the architectural patterns established by the ClientMaintenance API and includes endpoints for managing main modules and other system-level operations.

## Features

- **Main Modules Management**: Retrieve main module details from the system using stored procedures
- **API Versioning**: Built-in API versioning support
- **Swagger Documentation**: Interactive API documentation through Swagger UI
- **Serilog Integration**: Structured logging with console and file outputs
- **Entity Framework Core**: Database access using EF Core with SQL Server
- **Dependency Injection**: Clean DI configuration using .NET's native services

## Project Structure

```
SystemCoreApi/
├── Modules/
│   └── SystemCore/
│       ├── SystemCoreController.cs      # API endpoints
│       └── SystemCoreRepo.cs            # Data access layer with stored procedure calls
├── Models/
│   └── MainModuleDetail.cs              # Main module data model
├── Helpers/
│   ├── DBClient.cs                      # Database connection string builder
│   └── Utils.cs                         # Utility functions
├── Properties/
│   └── launchSettings.json              # Launch configurations
├── appsettings.json                     # Production settings
├── appsettings.Development.json         # Development settings
└── Program.cs                           # Application entry point
```

## Endpoints

### Get Main Modules

**Endpoint:** `POST /api/v1/SystemCore/main-modules`

**Description:** Fetches main module details from the system using the stored procedure `p_v1_GetMainModuleDetails`.

**Request Body:**
```json
{
  "requestData": {
    "requestID": "REQ123",
    "modules": "module1,module2",
    "userName": "admin"
  }
}
```

**Response:**
```json
{
  "responseCode": "00",
  "responseMessage": "Main modules retrieved successfully",
  "responseData": [
    {
      "mainModuleID": 1,
      "mainModuleIcon": "icon-class",
      "description": "Identity Management",
      "mainModuleOrder": 1
    },
    {
      "mainModuleID": 2,
      "mainModuleIcon": "icon-class",
      "description": "Account Management",
      "mainModuleOrder": 2
    }
  ]
}
```

**Parameters:**
- `RequestID` (VARCHAR(50)): Unique request identifier
- `Modules` (VARCHAR(MAX)): Comma-separated module identifiers
- `UserName` (VARCHAR(30)): Username of the requesting user

## Stored Procedure

### p_v1_GetMainModuleDetails

This stored procedure is called to retrieve main module details from the database.

**Parameters:**
- `@RequestID` (VARCHAR(50)): Request identifier
- `@Modules` (VARCHAR(MAX)): Module list
- `@UserName` (VARCHAR(30)): Username

**Returns:**
- `MainModuleID` (INT): Unique module identifier
- `MainModuleIcon` (VARCHAR): Icon class or path
- `Description` (VARCHAR): Module description
- `MainModuleOrder` (INT): Display order

## Configuration

### appsettings.json

```json
{
  "AppSettings": {
    "DBType": "MSSQL",
    "DBServerName": "server-name",
    "DatabaseName": "KairoCore",
    "BRUserName": "sa",
    "BRUserPassword": "password",
    "AppName": "SystemCoreApi"
  }
}
```

Update the database configuration values before running the application.

## Running the Application

### Development

```bash
dotnet run --environment Development
```

The API will be available at:
- HTTP: `http://localhost:7175`
- HTTPS: `https://localhost:7175`
- Swagger UI: `https://localhost:7175/swagger/index.html`

### Production

```bash
dotnet run --environment Production
```

## Dependencies

- **Asp.Versioning.Mvc.ApiExplorer**: API versioning support
- **Asp.Versioning.Mvc**: API versioning controllers
- **Microsoft.EntityFrameworkCore**: ORM framework
- **Microsoft.EntityFrameworkCore.SqlServer**: SQL Server database provider
- **Serilog**: Structured logging
- **Serilog.AspNetCore**: ASP.NET Core integration for Serilog
- **Swashbuckle.AspNetCore**: Swagger/OpenAPI documentation

## Logging

Logs are written to:
- **Console**: Real-time console output
- **File**: Daily rolling file logs in the `logs/` directory

Log levels can be configured in `appsettings.json` and `appsettings.Development.json`.

## Solution Integration

This API is integrated into the `kairo.sln` solution. To build the entire solution:

```bash
dotnet build
```

To build only this API:

```bash
dotnet build SystemCoreApi/SystemCoreApi.csproj
```

## Architecture Pattern

This project follows the **Repository Pattern** with the following layers:

1. **Controller Layer** (`SystemCoreController`): Handles HTTP requests and responses
2. **Repository Layer** (`SystemCoreRepo`): Executes stored procedures and database operations
3. **Models Layer**: Defines data transfer objects and entities
4. **Helper Layer**: Provides utility functions and configuration

This architecture is consistent with the `ClientMaintenance` API and other Kairo microservices.

## Error Handling

The API follows standard HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid input)
- `500`: Internal server error

Error responses include:
- `ResponseCode`: Error code identifier
- `ResponseMessage`: Human-readable error message
- `ResponseData`: Empty or error details

## Contributing

When adding new endpoints or repositories:
1. Follow the existing naming conventions
2. Add appropriate logging statements
3. Include XML documentation comments
4. Update this README with new endpoints
5. Ensure the stored procedure is documented

## License

Part of the Kairo Banking System Project
