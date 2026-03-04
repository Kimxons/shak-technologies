using CBS.Entities.SystemCore;
using kairo_ui.Models.Identities.ClientMaintenance;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace kairo_ui.Controllers.Identities.ClientMaintenance
{
    [Route("Identities/ClientMaintenance/Employment")]
    public class ClientEmploymentController : ClientMaintenanceControllerBase
    {
        private readonly IApiCachedService _apiCachedService;

        public ClientEmploymentController(IAuthService authService, IApiService apiService, IApiCachedService apiCachedService, ILogger<ClientEmploymentController> logger)
        : base(authService, apiService, logger)
        {
      _apiCachedService = apiCachedService;
   }

        [HttpGet]
        [Route("Index")]
   public async Task<IActionResult> Index(string? moduleId = null, string? clientId = null, string? requestId = null)
        {
        if (!AuthService.IsAuthenticated()) return RedirectToAction("Index", "Login");

  ViewData["ModuleId"] = moduleId ?? string.Empty;
     ViewData["ClientId"] = clientId ?? string.Empty;
       ViewData["RequestId"] = requestId ?? string.Empty;
  ViewData["AutoLoad"] = (!string.IsNullOrWhiteSpace(clientId) || !string.IsNullOrWhiteSpace(requestId)).ToString().ToLower();

try
   {
    // Use GetMultipleDropdownCodeOptionsAsync - now returns SelectListItem format
 var dropdownOptions = await _apiCachedService.GetMultipleDropdownCodeOptionsAsync(new[]
{
         "OccupationID",
 "DesignationID",
   "CompanyTypeID",
    "BusinessOwnershipID",
           "BusinessLineID"
      });

     dropdownOptions.TryGetValue("OccupationID", out var occupationOptions);
   dropdownOptions.TryGetValue("DesignationID", out var designationOptions);
    dropdownOptions.TryGetValue("CompanyTypeID", out var companyTypeOptions);
 dropdownOptions.TryGetValue("BusinessOwnershipID", out var businessOwnershipOptions);
     dropdownOptions.TryGetValue("BusinessLineID", out var businessLineOptions);

        ViewData["EmploymentOccupationOptions"] = occupationOptions ?? Enumerable.Empty<SelectListItem>();
       ViewData["EmploymentDesignationOptions"] = designationOptions ?? Enumerable.Empty<SelectListItem>();
          ViewData["EmploymentCompanyTypeOptions"] = companyTypeOptions ?? Enumerable.Empty<SelectListItem>();
      ViewData["EmploymentBusinessOwnershipOptions"] = businessOwnershipOptions ?? Enumerable.Empty<SelectListItem>();
     ViewData["EmploymentBusinessLineOptions"] = businessLineOptions ?? Enumerable.Empty<SelectListItem>();
        }
 catch (Exception ex)
       {
     Logger.LogError(ex, "Error loading Employment tab dropdown options");
            }

            return PartialView("~/Views/Identities/ClientMaintenance/_ClientEmployment.cshtml");
        }

   [HttpPost, Route("get")]
        public async Task<IActionResult> Get([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.GET_CLIENT_EMPLOYMENT, requestData, "client-maintenance.employment.get", requestData?.ModuleID);

        [HttpPost, Route("create")]
   public async Task<IActionResult> Create([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.CREATE_CLIENT_EMPLOYMENT, requestData, "client-maintenance.employment.create", requestData?.ModuleID);

        [HttpPost, Route("update")]
  public async Task<IActionResult> Update([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.EDIT_CLIENT_EMPLOYMENT, requestData, "client-maintenance.employment.update", requestData?.ModuleID);

        [HttpPost, Route("delete")]
     public async Task<IActionResult> Delete([FromBody] ClientMaintenanceCrudRequest requestData) => await ProxyRequestAsync("ClientManagementApi", ApiEndpoints.DELETE_CLIENT_EMPLOYMENT, requestData, "client-maintenance.employment.delete", requestData?.ModuleID);
    }
}
