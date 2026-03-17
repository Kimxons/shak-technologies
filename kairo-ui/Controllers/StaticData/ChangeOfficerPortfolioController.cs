using kairo_ui.Features.StaticData.ChangeOfficerPortfolio;
using kairo_ui.Models.StaticData.ChangeOfficerPortfolio;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.StaticData
{
    /// <summary>
    /// Change Officer Portfolio Controller
    /// </summary>
    [Route("StaticData/ChangeOfficerPortfolio")]
    public class ChangeOfficerPortfolioController : Controller
    {
        private readonly IAuthService _authService;
        private readonly ILogger<ChangeOfficerPortfolioController> _logger;
        private readonly ChangeOfficerPortfolioService _service;

        public ChangeOfficerPortfolioController(
            IAuthService authService,
            IOldApiService oldApiService,
            ILogger<ChangeOfficerPortfolioController> logger)
        {
            _authService = authService;
            _logger = logger;
            var repository = new ChangeOfficerPortfolioRepository(oldApiService);
            _service = new ChangeOfficerPortfolioService(repository);
        }

        [HttpGet()]
        [HttpGet("Index")]
        [HttpGet("~/StaticData/ChangingOfficerPortfolio")]
        [HttpGet("~/MicroFinance/ChangingOfficerPortfolio")]
        public IActionResult ChangeOfficerPortfolio()
        {
            if (!_authService.IsAuthenticated())
            {
                _logger.LogWarning("Unauthenticated access attempt to Change Officer Portfolio");
                return RedirectToAction("Index", "Login");
            }

            ViewBag.BranchCode = ResolveSessionValue("branch_code", "branch_id", "OurBranchID");
            ViewBag.UserName = ResolveSessionValue("user_name", "user_id", "OperatorID");
            return View("~/Views/StaticData/ChangeOfficerPortfolio.cshtml");
        }

        [HttpPost("officer-details")]
        public async Task<IActionResult> OfficerDetails([FromBody] ChangeOfficerPortfolioOfficerRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Officer ID is required" });
                }

                var context = BuildContext();
                var officer = await _service.GetOfficerSummaryAsync(request, context);
                if (officer is null || string.IsNullOrWhiteSpace(officer.OfficerID))
                {
                    return NotFound(new { Success = false, ErrorMessage = "Officer details were not found" });
                }

                return Ok(new { Success = true, Data = officer });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading officer details for Change Officer Portfolio");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("portfolio")]
        public async Task<IActionResult> Portfolio([FromBody] ChangeOfficerPortfolioPortfolioRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (!ModelState.IsValid)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Branch and officer are required" });
                }

                var context = BuildContext();
                var result = await _service.GetPortfolioAsync(request, context);
                return Ok(new { Success = true, Data = result });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading Change Officer Portfolio centers");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        [HttpPost("transfer")]
        public async Task<IActionResult> Transfer([FromBody] ChangeOfficerPortfolioTransferRequest request)
        {
            try
            {
                if (!_authService.IsAuthenticated())
                {
                    return Unauthorized(new { Success = false, ErrorMessage = "User is not authenticated" });
                }

                if (!ModelState.IsValid || request.Centers.Count == 0)
                {
                    return BadRequest(new { Success = false, ErrorMessage = "Branch, officer, sign-in officer, and at least one center are required" });
                }

                var context = BuildContext();
                var result = await _service.TransferAsync(request, context);

                return Ok(new
                {
                    Success = result.ErrorCount == 0,
                    Data = result,
                    ErrorMessage = result.ErrorCount == 0
                        ? string.Empty
                        : string.Join(" ", result.Errors)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transferring Change Officer Portfolio");
                return StatusCode(500, new { Success = false, ErrorMessage = ex.Message });
            }
        }

        private ChangeOfficerPortfolioContext BuildContext()
        {
            return new ChangeOfficerPortfolioContext
            {
                BranchID = ResolveSessionValue("branch_code", "branch_id", "OurBranchID"),
                OperatorID = ResolveSessionValue("user_name", "user_id", "OperatorID"),
                AppName = ResolveSessionValue("appname"),
                BankID = ResolveSessionValue("BankID", "bank_id") is { Length: > 0 } bankId ? bankId : "00"
            };
        }

        private string ResolveSessionValue(params string[] keys)
        {
            foreach (var key in keys)
            {
                var value = HttpContext.Session.GetString(key);
                if (!string.IsNullOrWhiteSpace(value))
                {
                    return value;
                }
            }

            return string.Empty;
        }
    }
}