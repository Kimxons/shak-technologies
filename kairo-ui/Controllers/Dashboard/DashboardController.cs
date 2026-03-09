using CBS.Entities.Common;
using CBS.Entities.SystemCore;
using kairo_ui.Models;
using kairo_ui.Models.Dashboard;
using kairo_ui.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace kairo_ui.Controllers.Dashboard
{
    public class DashboardController : Controller
    {
        private readonly IApiService _apiService;
        private readonly IApiCachedService _apiCachedService;
        private readonly IAuthService _authService;
        private readonly ILogger<DashboardController> _logger;

        private static readonly JsonSerializerOptions JsonOptions = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            PropertyNameCaseInsensitive = true
        };

        public DashboardController(
            IApiService apiService,
            IApiCachedService apiCachedService,
            IAuthService authService,
            ILogger<DashboardController> logger)
        {
            _apiService = apiService;
            _apiCachedService = apiCachedService;
            _authService = authService;
            _logger = logger;
        }

        /// <summary>
        /// Main dashboard view - requires authentication
        /// </summary>
        public async Task<IActionResult> Index()
        {
            try
            {
                // Check if user is authenticated
                if (!_authService.IsAuthenticated())
                {
                    _logger.LogWarning("Unauthenticated access attempt to dashboard");
                    return RedirectToAction("Index", "Login");
                }

                var viewModel = new DashboardViewModel
                {
                    UserName = HttpContext.Session.GetString("user_name") ?? "User",
                    BankName = HttpContext.Session.GetString("bank_name") ?? "032 · DEMO BANK",
                    BranchName = HttpContext.Session.GetString("branch_name") ?? "Main Branch",
                    BranchCode = HttpContext.Session.GetString("branch_code") ?? "001",
                    CurrentDate = DateTime.Now
                };

                // Load bank settings from cache - used across the application
                // This is cached for 4 hours with high priority
                try
                {
                    var bankSettings = await _apiCachedService.GetSystemBankSettingsAsync();
                    if (bankSettings != null)
                    {
                        // Update session/viewmodel with bank settings if needed
                        viewModel.BankName = $"{bankSettings.BankID} · {bankSettings.BankName ?? viewModel.BankName}";
                        _logger.LogInformation("Loaded bank settings from cache: {BankName}", bankSettings.BankName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to load bank settings from cache, using session values");
                }

                // Load start menu and resources
                var startMenuData = await LoadStartMenuAndResources();
                if (startMenuData != null)
                {
                    viewModel.StartMenu = startMenuData;
                }

                // Attempt to load dashboard data from API
                try
                {
                    // Try to fetch dashboard metrics from API
                    // Note: Adjust endpoint based on your actual API structure
                    var dashboardData = await _apiService.GetSingleAsync<DashboardViewModel>("SystemCoreApi", ApiEndpoints.GET_DASHBOARDMETRICS);
                    if (dashboardData != null)
                    {
                        viewModel.Stats = dashboardData.Stats;
                        viewModel.Portfolio = dashboardData.Portfolio;
                        viewModel.RecentTransactions = dashboardData.RecentTransactions;
                        viewModel.OperationalEfficiency = dashboardData.OperationalEfficiency;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to load dashboard metrics from API, using defaults");
                    // Use default/sample data if API call fails
                    viewModel = PopulateSampleData(viewModel);
                }

                _logger.LogInformation("Dashboard loaded successfully for user: {UserName}", viewModel.UserName);
                return View(viewModel);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading dashboard");
                return RedirectToAction("Index", "Login");
            }
        }

        /// <summary>
        /// Loads the start menu and available resources based on user roles
        /// </summary>
        private async Task<StartMenuViewModel> LoadStartMenuAndResources()
        {
            try
            {
                _logger.LogInformation("Loading start menu and resources for dashboard");

                var startMenuViewModel = new StartMenuViewModel();

                // Get user roles from session
                var rolesJson = HttpContext.Session.GetString("roles");
                if (string.IsNullOrEmpty(rolesJson))
                {
                    _logger.LogWarning("No roles found in session");
                    return startMenuViewModel;
                }

                //var roles = JsonSerializer.Deserialize<List<RoleInfo>>(rolesJson, JsonOptions) ?? new List<RoleInfo>();
                //var roleNames = string.Join(",", roles.Select(r => r.Name));


                var roles = JsonSerializer.Deserialize<List<string>>(rolesJson, JsonOptions) ?? [];
                var roleNames = string.Join(",", roles);

                _logger.LogInformation("User roles from session: {RoleNames}", roleNames);

                // Fetch resources based on user roles
                var roleResources = await FetchRoleResources(roleNames);
                if (roleResources?.Resources != null)
                {
                    startMenuViewModel.AvailableResources = roleResources.Resources;
                    _logger.LogInformation("Fetched {ResourceCount} resources for user roles", startMenuViewModel.AvailableResources.Count);
                }

                // Fetch main modules
                var mainModules = await FetchMainModules(roleResources!.Resources);

                // Fetch modules filtered by resources
                var allModules = await FetchModules();
                var filteredModules = FilterModulesByResources(allModules, startMenuViewModel.AvailableResources);

                startMenuViewModel.MainModules = mainModules
                    .Where(mm => filteredModules.Select(m => m.MainModuleID).Contains(mm.MainModuleID))
                    .OrderBy(mm => mm.MainModuleOrder)
                    .ToList();
                // Create start menu items from modules
                startMenuViewModel.MenuItems = filteredModules
                    .Where(m => m.IsMenuItem && m.IsActive)
                    .OrderBy(m => m.MenuItemOrder ?? 999)
                    .Select(m => new StartMenuItem
                    {
                        ModuleID = m.ModuleID,
                        MainModuleID = m.MainModuleID,
                        ModuleName = m.ModuleName,
                        Abbreviation = m.Abbreviation,
                        MenuURL = m.CustomMenuURL ?? m.MenuURL,
                        MenuDescription = m.MenuDescription,
                        ModuleIcon = m.ModuleIcon,
                        CanAdd = m.CanAdd,
                        CanEdit = m.CanEdit,
                        CanDelete = m.CanDelete,
                        CanView = m.CanView,
                        MenuItemOrder = m.MenuItemOrder,
                        ShortCutKey = m.ShortCutKey,
                        ParentMenuModuleID = m.ParentMenuModuleID
                    })
                    .ToList();

                // ── MVC-migrated modules: inject items not yet registered in the DB ──
                AppendMvcMigratedMenuItems(startMenuViewModel);

                // Get user branches for switch branch functionality
                var currentUserId = HttpContext.Session.GetString("user_id");
                if (!string.IsNullOrEmpty(currentUserId) && int.TryParse(currentUserId, out var userId))
                {
                    startMenuViewModel.UserBranches = await FetchUserBranches(userId);
                    _logger.LogInformation("Fetched {BranchCount} branches for user {UserId}",
                        startMenuViewModel.UserBranches.Count, userId);
                }

                // Set current branch info
                if (int.TryParse(HttpContext.Session.GetString("branch_id"), out var branchId))
                {
                    startMenuViewModel.CurrentBranchId = branchId;
                }
                startMenuViewModel.CurrentBranchCode = HttpContext.Session.GetString("branch_code") ?? "001";

                _logger.LogInformation("Start menu loaded: {MenuItemCount} items, {BranchCount} branches available",
                    startMenuViewModel.MenuItems.Count, startMenuViewModel.UserBranches.Count);

                return startMenuViewModel;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error loading start menu and resources");
                return new StartMenuViewModel();
            }
        }

        /// <summary>
        /// Appends MVC-migrated modules that are not yet registered in the database.
        /// As modules are added to the DB, remove the corresponding entry here.
        /// </summary>
        private static void AppendMvcMigratedMenuItems(StartMenuViewModel vm)
        {
            // Find the Account MainModuleID by locating the existing "Account Maintenance" item
            var accountMenuItem = vm.MenuItems.FirstOrDefault(mi =>
                mi.MenuDescription != null &&
                mi.MenuDescription.Contains("Account Maintenance", StringComparison.OrdinalIgnoreCase));

            if (accountMenuItem == null) return; // Account module not loaded – nothing to supplement

            var accountMainModuleId = accountMenuItem.MainModuleID;

            // ── Standing Instruction Loan Repayment ──
            var hasSilr = vm.MenuItems.Any(mi =>
                mi.MenuDescription != null &&
                mi.MenuDescription.Contains("Standing Instruction Loan Repayment", StringComparison.OrdinalIgnoreCase));

            if (!hasSilr)
            {
                vm.MenuItems.Add(new StartMenuItem
                {
                    ModuleID = 9901,                        // Temporary client-side ID
                    MainModuleID = accountMainModuleId,
                    ModuleName = "StandingInstructionLoanRepayment",
                    Abbreviation = "SILR",
                    MenuURL = "/AccountUtilities/StandingInstructionLoanRepayment/Index",
                    MenuDescription = "Standing Instruction Loan Repayment",
                    ModuleIcon = "<i class='fas fa-building-columns'></i>",
                    CanAdd = true,
                    CanEdit = true,
                    CanDelete = true,
                    CanView = true,
                    MenuItemOrder = 50
                });
            }

            // ── Standing Instruction Transfer ──
            var hasSit = vm.MenuItems.Any(mi =>
                mi.MenuDescription != null &&
                mi.MenuDescription.Contains("Standing Instruction Transfer", StringComparison.OrdinalIgnoreCase));

            if (!hasSit)
            {
                vm.MenuItems.Add(new StartMenuItem
                {
                    ModuleID = 9902,                        // Temporary client-side ID
                    MainModuleID = accountMainModuleId,
                    ModuleName = "StandingInstructionTransfer",
                    Abbreviation = "SIT",
                    MenuURL = "/AccountUtilities/StandingInstructionTransfer/Index",
                    MenuDescription = "Standing Instruction Transfer",
                    ModuleIcon = "<i class='fas fa-right-left'></i>",
                    CanAdd = true,
                    CanEdit = true,
                    CanDelete = true,
                    CanView = true,
                    MenuItemOrder = 51
                });
            }
        }

        /// <summary>
        /// Fetches role resources from the API
        /// </summary>
        private async Task<RoleResourcesResponse> FetchRoleResources(string roleNames)
        {
            try
            {
                _logger.LogInformation("Fetching role resources for roles: {RoleNames}", roleNames);
                var endpoint = $"api/role/resources?roleNames={Uri.EscapeDataString(roleNames)}";
                var response = await _authService.GetSingleAsync<RoleResourcesResponse>(endpoint);
                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching role resources");
                return new RoleResourcesResponse();
            }
        }

        /// <summary>
        /// Fetches main modules from the API with caching (4-hour cache)
        /// Uses ApiCachedService for automatic caching with SystemCodesPolicy
        /// </summary>
        private async Task<List<MainModule>> FetchMainModules(List<string> lsmodules)
        {
            try
            {
                _logger.LogInformation("Fetching main modules");
                string auth_userJson = HttpContext.Session.GetString("auth_user")!;
                JsonDocument jsonAuthUser = JsonDocument.Parse(auth_userJson);
                var userName = jsonAuthUser.RootElement.GetProperty("username").GetString()!;

                // ✅ CACHED: Uses ApiCachedService with ModuleStructurePolicy (1 hour cache, high priority)
                // Main modules are automatically cached and shared across requests
                var mainModules = await _apiCachedService.GetMainModulesAsync(lsmodules, userName);
                _logger.LogInformation("Fetched {Count} main modules", mainModules.Count);
                return mainModules;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching main modules");
                return [];
            }
        }

        /// <summary>
        /// Fetches all modules from the API with caching (1-hour cache)
        /// Uses ApiCachedService for automatic caching with ModuleStructurePolicy
        /// </summary>
        private async Task<List<CBS.Entities.SystemCore.Module>> FetchModules()
        {
            try
            {
                _logger.LogInformation("Fetching modules");
                string auth_userJson = HttpContext.Session.GetString("auth_user")!;
                JsonDocument jsonAuthUser = JsonDocument.Parse(auth_userJson);
                var userName = jsonAuthUser.RootElement.GetProperty("username").GetString()!;

                // ✅ CACHED: Uses ApiCachedService with ModuleStructurePolicy (1 hour cache, high priority)
                // Modules are automatically cached and shared across requests
                var modules = await _apiCachedService.GetModulesAsync(userName);

                _logger.LogInformation("Fetched {Count} modules", modules.Count);
                return modules;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching modules");
                return [];
            }
        }

        /// <summary>
        /// Filters modules by available resources
        /// Resources are strings that should match ModuleID
        /// </summary>
        private List<CBS.Entities.SystemCore.Module> FilterModulesByResources(List<CBS.Entities.SystemCore.Module> modules, List<string> resources)
        {
            if (!resources.Any())
            {
                _logger.LogWarning("No resources available for filtering modules");
                return [];
            }

            var filtered = modules
                .Where(m => resources.Any(r => r.Equals(m.ModuleID.ToString(), StringComparison.OrdinalIgnoreCase))
                           //|| resources.Any(r => r.Equals(m.ModuleName, StringComparison.OrdinalIgnoreCase))
                           )
                .ToList();

            _logger.LogInformation("Filtered {OriginalCount} modules to {FilteredCount} based on resources",
                modules.Count, filtered.Count);

            return filtered;
        }

        /// <summary>
        /// Fetches branches available to the user
        /// </summary>
        private async Task<List<BranchSetting>> FetchUserBranches(int userId)
        {
            try
            {
                _logger.LogInformation("Fetching branches for user {UserId}", userId);
                //var endpoint = $"BranchSetting?userId={userId}";
                var response = await _apiService.GetAsync<BranchSetting>("IdentityAccessManagentApi", "BranchSetting", new KeyValuePair<string, object>("userId", userId));
                return response?.ToList() ?? [];
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user branches");
                return [];
            }
        }

        /// <summary>
        /// Populates the view model with sample data for demonstration
        /// </summary>
        private DashboardViewModel PopulateSampleData(DashboardViewModel viewModel)
        {
            viewModel.Stats = new DashboardStats
            {
                Members = 254,
                MembersChange = 18,
                TotalAssets = 70.68m,
                AssetsChangePercent = 4.3m,
                Transactions = 482,
                PeakTime = "11AM",
                TodaysVolume = 20.00m,
                VolumeTime = "1h 12m"
            };

            viewModel.Portfolio = new PortfolioMetrics
            {
                LoanPortfolio = new LoanPortfolio
                {
                    Amount = 45.2m,
                    ChangePercent = 2.8m,
                    ChangeDirection = "up"
                },
                Deposits = new DepositMetric
                {
                    Amount = 62.1m,
                    ChangePercent = 5.1m,
                    ChangeDirection = "up"
                },
                NPL = new NplMetric
                {
                    Ratio = 2.4m,
                    Status = "good"
                },
                Liquidity = new LiquidityMetric
                {
                    Ratio = 45.8m,
                    ChangePercent = 1.2m
                }
            };

            viewModel.RecentTransactions =
            [
                new TransactionRecord
                {
                    Id = 1,
                    Reference = "TXN001",
                    Description = "Customer Deposit",
                    Amount = 50000,
                    Type = "Credit",
                    Status = "Completed",
                    Timestamp = DateTime.Now.AddHours(-2),
                    Branch = "Main"
                },
                new TransactionRecord
                {
                    Id = 2,
                    Reference = "TXN002",
                    Description = "Loan Disbursement",
                    Amount = 100000,
                    Type = "Debit",
                    Status = "Pending",
                    Timestamp = DateTime.Now.AddHours(-1),
                    Branch = "Main"
                },
                new TransactionRecord
                {
                    Id = 3,
                    Reference = "TXN003",
                    Description = "Inter-branch Transfer",
                    Amount = 25000,
                    Type = "Transfer",
                    Status = "Completed",
                    Timestamp = DateTime.Now.AddMinutes(-30),
                    Branch = "Sub-branch"
                }
            ];

            return viewModel;
        }

        /// <summary>
        /// API endpoint to switch the user's current branch
        /// </summary>
        [HttpPost("api/switch-branch")]
        public async Task<IActionResult> SwitchBranch([FromBody] SwitchBranchRequest request)
        {
            try
            {
                if (request?.BranchId <= 0)
                {
                    _logger.LogWarning("Invalid branch ID in switch branch request: {BranchId}", request?.BranchId);
                    return BadRequest(new { success = false, message = "Invalid branch ID" });
                }

                // Get user branches
                var currentUserId = HttpContext.Session.GetString("user_id");
                if (string.IsNullOrEmpty(currentUserId) || !int.TryParse(currentUserId, out var userId))
                {
                    _logger.LogWarning("Invalid user ID in session");
                    return BadRequest(new { success = false, message = "User not authenticated" });
                }

                // Verify user has access to the requested branch
                var userBranches = await FetchUserBranches(userId);
                var branch = userBranches.FirstOrDefault(b => b.Id == request!.BranchId);

                if (branch == null)
                {
                    _logger.LogWarning("User {UserId} does not have access to branch {BranchId}", userId, request!.BranchId);
                    return BadRequest(new { success = false, message = "You do not have access to this branch" });
                }

                // Update session with new branch information
                HttpContext.Session.SetString("branch_id", request!.BranchId.ToString());
                HttpContext.Session.SetString("branch_code", branch.BranchCode);
                HttpContext.Session.SetString("branch_name", branch.BranchName);

                _logger.LogInformation("User {UserId} switched to branch {BranchCode} ({BranchName})",
                    userId, branch.BranchCode, branch.BranchName);

                return Ok(new
                {
                    success = true,
                    message = $"Switched to {branch.BranchName}",
                    branch = new
                    {
                        id = branch.Id,
                        code = branch.BranchCode,
                        name = branch.BranchName
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error switching branch");
                return StatusCode(500, new { success = false, message = "An error occurred while switching branch" });
            }
        }

        /// <summary>
        /// API endpoint to get the user's available branches for the switch branch modal
        /// </summary>
        [HttpGet("api/user-branches")]
        public async Task<IActionResult> GetUserBranches()
        {
            try
            {
                var currentUserId = HttpContext.Session.GetString("user_id");
                if (string.IsNullOrEmpty(currentUserId) || !int.TryParse(currentUserId, out var userId))
                {
                    _logger.LogWarning("Invalid user ID in session for getting branches");
                    return BadRequest(new { success = false, message = "User not authenticated" });
                }

                var branches = await FetchUserBranches(userId);
                var currentBranchId = int.TryParse(HttpContext.Session.GetString("branch_id"), out var branchId) ? branchId : 0;

                return Ok(new
                {
                    success = true,
                    branches = branches.Select(b => new
                    {
                        id = b.Id,
                        code = b.BranchCode,
                        name = b.BranchName,
                        description = b.Description,
                        isHeadOffice = b.IsHeadOffice,
                        isCurrent = b.Id == currentBranchId
                    }).ToList()
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching user branches");
                return StatusCode(500, new { success = false, message = "An error occurred while fetching branches" });
            }
        }
    }
}