using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace kairo_ui.Controllers.StaticData
{
    [Route("StaticData")]
    public class StaticDataController : Controller
    {
        private readonly IAuthService _authService;
        private readonly IApiService _apiService;
        private readonly ILogger<StaticDataController> _logger;

        public StaticDataController(
            IAuthService authService,
            IApiService apiService,
            ILogger<StaticDataController> logger)
        {
            _authService = authService;
            _apiService = apiService;
            _logger = logger;
        }

        [Route("")]
        [Route("Index")]
        public IActionResult Index()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            return View("StaticData");
        }

        [Route("Location/Index")]
        public IActionResult Location()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            return PartialView("Location");
        }

        [Route("ContactPerson/Index")]
        public IActionResult ContactPerson()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            return PartialView("ContactPerson");
        }

        [Route("ContactPersonPage")]
        public IActionResult ContactPersonPage()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            return View("ContactPersonPage");
        }

        [Route("Custodian/Index")]
        public IActionResult Custodian()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            return PartialView("Custodian");
        }

        [Route("CustodianPage")]
        public IActionResult CustodianPage()
        {
            if (!_authService.IsAuthenticated())
                return RedirectToAction("Index", "Login");

            return View("CustodianPage");
        }

        [HttpPost]
        [Route("api/get-location")]
        public async Task<IActionResult> GetLocation([FromBody] LocationGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_LOCATION,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting location");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-edit-location")]
        public async Task<IActionResult> AddEditLocation([FromBody] LocationSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_EDIT_LOCATION,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving location");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-location")]
        public async Task<IActionResult> DeleteLocation([FromBody] LocationDeleteRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_LOCATION,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting location");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-contact-person")]
        public async Task<IActionResult> GetContactPerson([FromBody] ContactPersonGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_CONTACT_PERSON,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting contact person");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-edit-contact-person")]
        public async Task<IActionResult> AddEditContactPerson([FromBody] ContactPersonSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_EDIT_CONTACT_PERSON,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving contact person");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-contact-person")]
        public async Task<IActionResult> DeleteContactPerson([FromBody] ContactPersonDeleteRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_CONTACT_PERSON,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting contact person");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/get-custodian")]
        public async Task<IActionResult> GetCustodian([FromBody] CustodianGetRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.GET_CUSTODIAN,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting custodian");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/add-edit-custodian")]
        public async Task<IActionResult> AddEditCustodian([FromBody] CustodianSaveRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.ADD_EDIT_CUSTODIAN,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error saving custodian");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }

        [HttpPost]
        [Route("api/delete-custodian")]
        public async Task<IActionResult> DeleteCustodian([FromBody] CustodianDeleteRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                    return Unauthorized(new { success = false, message = "Not authenticated" });

                var response = await _apiService.CreateAsync<JsonElement>(
                    "AccountManagementApi",
                    ApiEndpoints.DELETE_CUSTODIAN,
                    request
                );

                return Ok(response);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting custodian");
                return Ok(new { Success = false, ResponseCode = "99", ResponseMessage = ex.Message });
            }
        }
    }

    public class LocationGetRequest
    {
        public string? LocationID { get; set; }
        public int Direction { get; set; } = 0;
        public string? OperatorID { get; set; }
    }

    public class LocationSaveRequest
    {
        public string? LocationID { get; set; }
        public string? LocationName { get; set; }
        public string? Building { get; set; }
        public string? RoomOffice { get; set; }
        public bool Store { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public int NewRecord { get; set; }
        public string? OperatorID { get; set; }
    }

    public class LocationDeleteRequest
    {
        public string? LocationID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class ContactPersonGetRequest
    {
        public string? ContactPersonID { get; set; }
        public int Direction { get; set; } = 0;
        public string? OperatorID { get; set; }
    }

    public class ContactPersonSaveRequest
    {
        public string? ContactPersonID { get; set; }
        public string? ContactPersonDesc { get; set; }
        public string? Title { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public bool IsActive { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public int NewRecord { get; set; }
        public string? OperatorID { get; set; }
    }

    public class ContactPersonDeleteRequest
    {
        public string? ContactPersonID { get; set; }
        public string? OperatorID { get; set; }
    }

    public class CustodianGetRequest
    {
        public string? CustodianID { get; set; }
        public int Direction { get; set; } = 0;
        public string? OperatorID { get; set; }
    }

    public class CustodianSaveRequest
    {
        public string? CustodianID { get; set; }
        public string? Name { get; set; }
        public string? Department { get; set; }
        public string? Section { get; set; }
        public string? CreatedBy { get; set; }
        public string? CreatedOn { get; set; }
        public string? ModifiedBy { get; set; }
        public string? ModifiedOn { get; set; }
        public int NewRecord { get; set; }
        public string? OperatorID { get; set; }
    }

    public class CustodianDeleteRequest
    {
        public string? CustodianID { get; set; }
        public string? OperatorID { get; set; }
    }
}
