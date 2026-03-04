# Migration Guide: Using Production-Ready Caching

This guide shows how to migrate existing code to use the new production-ready caching architecture.

## Quick Start

### No Changes Required!

Your existing code using `ICachingRepository` continues to work:

```csharp
public class MyService
{
    private readonly ICachingRepository _cache;
  
    // This still works exactly as before!
    public async Task<List<SystemCode>> GetSystemCodes(string codeId)
 {
   return await _cache.GetOrCreateAsync(
      $"SYSCODES:{codeId}",
      async () => await FetchFromApi(codeId),
          240); // 240 minutes
    }
}
```

---

## Upgrade Path (Recommended)

### Step 1: Change Interface

```csharp
// Before
private readonly ICachingRepository _cache;

// After
private readonly IProductionCachingRepository _cache;
```

### Step 2: Use Policies

```csharp
// Before
await _cache.GetOrCreateAsync(key, factory, 240); // Magic number

// After
await _cache.GetOrCreateAsync(key, factory, CachingConstants.SystemCodesPolicy);
```

---

## Real-World Examples

### Example 1: Dashboard Controller

**Before:**
```csharp
public class DashboardController : Controller
{
    private readonly ICachingRepository _cache;
    private readonly IApiService _api;
    
    public async Task<IActionResult> Index()
    {
        var branchId = HttpContext.Session.GetString("OurBranchID");
        var cacheKey = $"DASHBOARD:METRICS:{branchId}";
        
// Old way: manual expiration time
        var metrics = await _cache.GetOrCreateAsync(cacheKey, async () =>
        {
  return await _api.GetAsync<DashboardMetrics>(...);
        }, 5); // 5 minutes
        
        return View(metrics);
    }
}
```

**After:**
```csharp
public class DashboardController : Controller
{
    private readonly IProductionCachingRepository _cache;
    private readonly IApiService _api;
  
    public async Task<IActionResult> Index()
    {
 var branchId = HttpContext.Session.GetString("OurBranchID");
        var cacheKey = CachingConstants.GetDashboardMetricsKey(branchId);
        
    // New way: use policy for consistency
        var metrics = await _cache.GetOrCreateAsync(cacheKey, async () =>
        {
   return await _api.GetAsync<DashboardMetrics>(...);
        }, CachingConstants.DashboardMetricsPolicy);

        return View(metrics);
    }
}
```

**Benefits:**
- ? Consistent caching behavior across application
- ? Easy to change policy in one place
- ? Clear intent (dashboard metrics policy)

---

### Example 2: System Codes Service

**Before:**
```csharp
public class SystemCodesService
{
    private readonly ICachingRepository _cache;
    private readonly IApiService _api;
    
    public async Task<List<SystemCodeOption>> GetOptions(string codeId)
    {
        var key = $"SYSCODES:{codeId}";
        
        // Check cache
      var cached = _cache.Get<List<SystemCodeOption>>(key);
  if (cached != null) return cached;
        
        // Fetch from API
        var result = await _api.GetAsync<List<SystemCodeOption>>(...);
        
 // Cache for 4 hours
  _cache.Set(key, result, 240);
        
        return result;
    }
}
```

**After:**
```csharp
public class SystemCodesService
{
    private readonly IProductionCachingRepository _cache;
    private readonly IApiService _api;
    
    public async Task<List<SystemCodeOption>> GetOptions(string codeId)
{
        var key = CachingConstants.GetSystemCodeOptionsKey(codeId);
        
        // One-liner with production-ready policy
        return await _cache.GetOrCreateAsync(key, async () =>
        {
  return await _api.GetAsync<List<SystemCodeOption>>(...);
     }, CachingConstants.SystemCodesPolicy);
    }
    
    // Bonus: Bulk loading for performance
    public async Task<Dictionary<string, List<SystemCodeOption>>> GetMultipleOptions(params string[] codeIds)
    {
        var keys = codeIds.Select(id => CachingConstants.GetSystemCodeOptionsKey(id));
        var cached = await _cache.GetBulkAsync<List<SystemCodeOption>>(keys);
        
        // Fetch missing codes
        var missing = codeIds.Where(id => 
        cached[CachingConstants.GetSystemCodeOptionsKey(id)] == null);
        
        foreach (var codeId in missing)
      {
      var key = CachingConstants.GetSystemCodeOptionsKey(codeId);
            var data = await _api.GetAsync<List<SystemCodeOption>>(...);
            await _cache.SetAsync(key, data, CachingConstants.SystemCodesPolicy);
  cached[key] = data;
   }
        
        return cached.ToDictionary(kvp => kvp.Key, kvp => kvp.Value!);
  }
}
```

**Benefits:**
- ? Cleaner code (one line vs. five)
- ? Bulk operations for better performance
- ? Production-ready policies (compression, distributed, high priority)

---

### Example 3: Search Modal Controller

**Before:**
```csharp
public class SearchModalController : Controller
{
    private readonly ICachingRepository _cache;
    private readonly IApiService _api;
    
  [HttpPost]
    public async Task<IActionResult> Search([FromBody] SearchRequest request)
    {
        // Simple hash for cache key
    var searchHash = request.SearchTerm.GetHashCode().ToString();
        var key = $"SEARCH:{request.TableId}:{searchHash}";
        
        var results = _cache.Get<List<SearchResult>>(key);
        if (results != null)
        {
 return Ok(new { success = true, data = results });
    }
    
   results = await _api.CreateAsync<List<SearchResult>>(...);
        _cache.Set(key, results, 15); // 15 minutes
        
        return Ok(new { success = true, data = results });
    }
}
```

**After:**
```csharp
public class SearchModalController : Controller
{
    private readonly IProductionCachingRepository _cache;
    private readonly IApiService _api;
    
  [HttpPost]
  public async Task<IActionResult> Search([FromBody] SearchRequest request)
    {
    // Use helper method for consistent key generation
        var searchHash = GetSearchHash(request.SearchTerm);
        var key = CachingConstants.GetSearchResultsKey(request.TableId, searchHash);
        
        // Use policy with sliding expiration (resets on each search)
        var results = await _cache.GetOrCreateAsync(key, async () =>
        {
            return await _api.CreateAsync<List<SearchResult>>(...);
        }, CachingConstants.SearchResultsPolicy);
        
        return Ok(new { success = true, data = results, cached = true });
    }
    
    private string GetSearchHash(string searchTerm)
    {
    // Use better hash for cache keys
        using var md5 = System.Security.Cryptography.MD5.Create();
     var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(searchTerm));
        return Convert.ToHexString(hash)[..8]; // First 8 chars
    }
}
```

**Benefits:**
- ? Sliding expiration (frequently searched terms stay cached)
- ? Better hash function (no collisions)
- ? Consistent key generation

---

### Example 4: Theme Configuration Controller

**Before:**
```csharp
public class ThemeConfigurationController : Controller
{
    private readonly ICachingRepository _cache;
    private readonly IApiService _api;
    
    public async Task<IActionResult> GetUserTheme(string userId)
    {
        var key = $"THEME:USER:{userId}";
   
        var theme = await _cache.GetAsync<ThemeSettings>(key);
   if (theme == null)
        {
            theme = await _api.GetSingleAsync<ThemeSettings>(...);
         await _cache.SetAsync(key, theme, 60); // 1 hour
        }
        
   return Ok(theme);
    }
    
    public async Task<IActionResult> UpdateUserTheme(string userId, ThemeSettings theme)
    {
        await _api.UpdateAsync(...);
        
        // Invalidate cache
    var key = $"THEME:USER:{userId}";
        _cache.Remove(key);
        
        return Ok(new { success = true });
    }
}
```

**After:**
```csharp
public class ThemeConfigurationController : Controller
{
    private readonly IProductionCachingRepository _cache;
    private readonly IApiService _api;
    
    public async Task<IActionResult> GetUserTheme(string userId)
    {
        var key = CachingConstants.GetUserThemeKey(userId);
        
        // Simplified with policy
     var theme = await _cache.GetOrCreateAsync(key, async () =>
   {
            return await _api.GetSingleAsync<ThemeSettings>(...);
    }, CachingConstants.ThemePolicy);
        
    return Ok(theme);
    }
  
    public async Task<IActionResult> UpdateUserTheme(string userId, ThemeSettings theme)
    {
    await _api.UpdateAsync(...);
        
        // Async invalidation
   await _cache.RemoveAsync(CachingConstants.GetUserThemeKey(userId));
        
      return Ok(new { success = true });
    }
    
    // Bonus: Bulk invalidation
    public async Task<IActionResult> ClearAllUserThemes()
    {
        // Remove all user theme entries at once
        await _cache.RemoveByPatternAsync($"{CachingConstants.THEME_PREFIX}USER:*");
  
    return Ok(new { success = true, message = "All user themes cleared" });
    }
}
```

**Benefits:**
- ? Async operations (better performance)
- ? Pattern-based invalidation
- ? Consistent key usage

---

### Example 5: Client360 Controller (Complex Caching)

**Before:**
```csharp
public class Client360Controller : Controller
{
    private readonly ICachingRepository _cache;
    private readonly IApiService _api;
    
    public async Task<IActionResult> GetClientData(string clientId)
    {
        // Cache multiple related data pieces separately
        var clientKey = $"CLIENT:{clientId}";
   var accountsKey = $"CLIENT:{clientId}:ACCOUNTS";
        var loansKey = $"CLIENT:{clientId}:LOANS";
 
        var client = await _cache.GetOrCreateAsync(clientKey, 
            async () => await FetchClient(clientId), 30);
        
        var accounts = await _cache.GetOrCreateAsync(accountsKey,
   async () => await FetchAccounts(clientId), 30);
       
     var loans = await _cache.GetOrCreateAsync(loansKey,
      async () => await FetchLoans(clientId), 30);
  
        return Ok(new { client, accounts, loans });
    }
}
```

**After:**
```csharp
public class Client360Controller : Controller
{
    private readonly IProductionCachingRepository _cache;
    private readonly IApiService _api;
  
    public async Task<IActionResult> GetClientData(string clientId)
    {
  // Use bulk operations for better performance
        var keys = new[]
     {
 $"CLIENT:{clientId}",
   $"CLIENT:{clientId}:ACCOUNTS",
            $"CLIENT:{clientId}:LOANS"
        };
   
        var cached = await _cache.GetBulkAsync<object>(keys);
        
      // Fetch missing data
        var client = (Client?)cached[keys[0]] ?? 
         await FetchAndCache(keys[0], () => FetchClient(clientId));
            
        var accounts = (List<Account>?)cached[keys[1]] ?? 
        await FetchAndCache(keys[1], () => FetchAccounts(clientId));

var loans = (List<Loan>?)cached[keys[2]] ?? 
   await FetchAndCache(keys[2], () => FetchLoans(clientId));
        
        return Ok(new { client, accounts, loans });
    }
    
    private async Task<T> FetchAndCache<T>(string key, Func<Task<T>> factory)
    {
        return await _cache.GetOrCreateAsync(key, factory, 
        CachingConstants.LookupDataPolicy);
    }
 
    // When client data updates, invalidate all related cache
    public async Task<IActionResult> UpdateClient(string clientId, Client client)
    {
        await _api.UpdateAsync(...);
        
        // Pattern-based invalidation removes all related entries
        await _cache.RemoveByPatternAsync($"CLIENT:{clientId}*");
        
        return Ok(new { success = true });
  }
}
```

**Benefits:**
- ? Bulk operations (3 API calls ? 1 cache call)
- ? Pattern-based invalidation (removes client + accounts + loans)
- ? Consistent policies

---

## Common Patterns

### Pattern 1: Cache-Aside (Lazy Loading)

```csharp
// Get data, cache if not present
var data = await _cache.GetOrCreateAsync(key, async () =>
{
    return await _api.GetAsync<MyData>(...);
}, CachingConstants.LookupDataPolicy);
```

### Pattern 2: Write-Through

```csharp
// Update database and cache together
public async Task<IActionResult> Update(MyData data)
{
    await _repository.UpdateAsync(data);
    
    // Update cache immediately
    await _cache.SetAsync($"DATA:{data.Id}", data, CachingConstants.Medium);
    
    return Ok(new { success = true });
}
```

### Pattern 3: Cache Invalidation

```csharp
// Remove specific entry
await _cache.RemoveAsync($"CLIENT:{clientId}");

// Remove by pattern
await _cache.RemoveByPatternAsync($"CLIENT:{clientId}:*");

// Remove entire prefix
await _cache.RemoveByPatternAsync("SYSCODES:*");
```

### Pattern 4: Refresh on Access

```csharp
// Extend expiration time without re-fetching
await _cache.RefreshAsync(key);
```

### Pattern 5: Conditional Caching

```csharp
// Only cache if data meets criteria
var data = await FetchData();

if (data.IsComplete && data.Items.Count > 0)
{
    await _cache.SetAsync(key, data, CachingConstants.Long);
}
```

---

## Controller Examples

### Example: LoginController with Caching

```csharp
public class LoginController : Controller
{
    private readonly IProductionCachingRepository _cache;
    private readonly IAuthService _authService;
  
    [HttpPost]
    public async Task<IActionResult> Login(LoginRequest request)
    {
  var result = await _authService.AuthenticateAsync(request);
        
      if (result?.Success == true)
 {
          // Cache user session data
   var sessionKey = $"{CachingConstants.USER_SESSION_PREFIX}{result.UserId}";
 await _cache.SetAsync(sessionKey, result, 
 CachingConstants.UserSessionPolicy);
    }
        
        return Ok(result);
    }
    
    [HttpPost("logout")]
    public async Task<IActionResult> Logout()
    {
        var userId = HttpContext.Session.GetString("UserId");
        
        // Clear user's cache on logout
   await _cache.RemoveByPatternAsync($"{CachingConstants.USER_SESSION_PREFIX}{userId}*");
        
        return Ok(new { success = true });
    }
}
```

### Example: SearchModalController with Caching

```csharp
public class SearchModalController : Controller
{
    private readonly IProductionCachingRepository _cache;
    private readonly IApiService _api;
    
    [HttpPost("search")]
    public async Task<IActionResult> Search([FromBody] SearchRequest request)
    {
      // Generate cache key
        var searchHash = ComputeHash(request);
        var key = CachingConstants.GetSearchResultsKey(request.TableId, searchHash);
        
      // Cache with sliding expiration (popular searches stay cached)
        var results = await _cache.GetOrCreateAsync(key, async () =>
        {
            return await _api.CreateAsync<List<SearchResult>>(
        "SystemCoreApi", 
    ApiEndpoints.SEARCH,
              request);
        }, CachingConstants.SearchResultsPolicy);
        
        return Ok(new { success = true, data = results });
    }
    
private string ComputeHash(SearchRequest request)
{
      var input = $"{request.TableId}|{request.SearchTerm}|{request.WhereStmt}";
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash)[..12];
    }
}
```

### Example: ThemeConfigurationController with Invalidation

```csharp
public class ThemeConfigurationController : Controller
{
    private readonly IProductionCachingRepository _cache;
    private readonly IApiService _api;
    
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserTheme(string userId)
    {
        var key = CachingConstants.GetUserThemeKey(userId);
   
        var theme = await _cache.GetOrCreateAsync(key, async () =>
  {
            return await _api.GetSingleAsync<ThemeSettings>(
     "SystemCoreApi",
         $"{ApiEndpoints.USER_THEMES}/{userId}");
        }, CachingConstants.ThemePolicy);
        
      return Ok(theme);
  }
    
    [HttpPut("user/{userId}")]
    public async Task<IActionResult> UpdateUserTheme(string userId, [FromBody] ThemeSettings theme)
 {
        var response = await _api.UpdateAsync<ThemeSettings>(
          "SystemCoreApi",
        ApiEndpoints.USER_THEMES,
         0,
 new { userId, theme });
        
        // Invalidate cache after update
        var key = CachingConstants.GetUserThemeKey(userId);
        await _cache.RemoveAsync(key);
        
return Ok(response);
    }
    
    [HttpPost("clear-all")]
    public async Task<IActionResult> ClearAllThemes()
    {
  // Clear all theme caches
  await _cache.RemoveByPatternAsync($"{CachingConstants.THEME_PREFIX}*");
      
        return Ok(new { success = true, message = "All theme caches cleared" });
    }
}
```

---

## Testing Your Changes

### 1. Verify Cache is Working

```csharp
[Fact]
public async Task Should_Cache_System_Codes()
{
    // First call - should fetch from API
    var result1 = await _service.GetSystemCodes("ClientTypeID");
    Assert.NotNull(result1);
    
    // Second call - should return from cache
    var result2 = await _service.GetSystemCodes("ClientTypeID");
    Assert.Equal(result1, result2);
    
    // Verify metrics
    var metrics = _cache.GetDetailedMetrics();
    Assert.True(metrics.Hits > 0);
}
```

### 2. Test Cache Invalidation

```csharp
[Fact]
public async Task Should_Invalidate_Cache_On_Update()
{
    var key = "test-key";
    await _cache.SetAsync(key, "value1", CachePolicy.Short);
    
    // Update
    await _cache.SetAsync(key, "value2", CachePolicy.Short);
 
    // Should return updated value
    var result = await _cache.GetAsync<string>(key);
    Assert.Equal("value2", result);
}
```

### 3. Test Pattern Removal

```csharp
[Fact]
public async Task Should_Remove_By_Pattern()
{
    // Set multiple related entries
 await _cache.SetAsync("CLIENT:123:INFO", data1, CachePolicy.Short);
    await _cache.SetAsync("CLIENT:123:ACCOUNTS", data2, CachePolicy.Short);
    await _cache.SetAsync("CLIENT:456:INFO", data3, CachePolicy.Short);
    
    // Remove all CLIENT:123 entries
    await _cache.RemoveByPatternAsync("CLIENT:123:*");
    
    // Verify removal
 Assert.Null(await _cache.GetAsync<object>("CLIENT:123:INFO"));
    Assert.Null(await _cache.GetAsync<object>("CLIENT:123:ACCOUNTS"));
    Assert.NotNull(await _cache.GetAsync<object>("CLIENT:456:INFO"));
}
```

---

## Monitoring in Production

### 1. Add Health Checks

```csharp
// Startup.cs or Program.cs
builder.Services.AddHealthChecks()
    .AddCheck("cache", () =>
    {
        var cache = app.Services.GetService<IProductionCachingRepository>();
        var state = cache.GetCircuitBreakerState();
   
        return state == CircuitBreakerState.Closed
            ? HealthCheckResult.Healthy("Cache is operational")
  : HealthCheckResult.Degraded("Cache circuit breaker is open");
    });
```

### 2. Log Cache Metrics Periodically

```csharp
public class CacheMetricsLogger : BackgroundService
{
 private readonly IProductionCachingRepository _cache;
    private readonly ILogger<CacheMetricsLogger> _logger;
 
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
      while (!stoppingToken.IsCancellationRequested)
        {
  await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
        
       var metrics = _cache.GetDetailedMetrics();
            _logger.LogInformation(
                "[CacheMetrics] HitRate: {HitRate:P2} | Hits: {Hits} | Misses: {Misses} | AvgTime: {AvgTime}ms",
    metrics.HitRate, metrics.Hits, metrics.Misses, metrics.AverageResponseTimeMs);
        }
    }
}
```

### 3. Alert on Poor Performance

```csharp
// In monitoring service
var metrics = _cache.GetDetailedMetrics();

if (metrics.HitRate < 0.5) // Less than 50%
{
    await _alertService.SendAlert("Cache hit rate below threshold");
}

if (metrics.Errors > 10)
{
    await _alertService.SendAlert("High cache error rate");
}

if (_cache.GetCircuitBreakerState() == CircuitBreakerState.Open)
{
    await _alertService.SendAlert("Cache circuit breaker is open");
}
```

---

## Checklist for Migration

- [ ] Update DI registration to use `IProductionCachingRepository`
- [ ] Replace magic numbers with policies from `CachingConstants`
- [ ] Use helper methods for key generation
- [ ] Add async invalidation after updates
- [ ] Use bulk operations where applicable
- [ ] Add cache warming for frequently accessed data
- [ ] Configure monitoring and alerts
- [ ] Test cache behavior in dev environment
- [ ] Configure Redis for production
- [ ] Set up cache metrics dashboard

---

## Quick Wins

### 1. Update SideBarController ? (Already Done)
Uses `RecentActivitiesPolicy` with proper caching.

### 2. Update DashboardController
```csharp
// Replace this:
_cache.GetOrCreateAsync(key, factory, 5);

// With this:
_cache.GetOrCreateAsync(key, factory, CachingConstants.DashboardMetricsPolicy);
```

### 3. Update SearchModalController
```csharp
// Replace this:
_cache.Set(key, results, 15);

// With this:
await _cache.SetAsync(key, results, CachingConstants.SearchResultsPolicy);
```

### 4. Update ThemeConfigurationController
```csharp
// Replace this:
_cache.Set(key, theme, 60);

// With this:
await _cache.SetAsync(key, theme, CachingConstants.ThemePolicy);
```

---

## Summary

The new production caching architecture provides:

1. **Better Performance**: Multi-tier caching with automatic promotion
2. **Higher Reliability**: Circuit breaker prevents cascade failures
3. **Better Observability**: Comprehensive metrics and logging
4. **Easier Maintenance**: Policy-based configuration
5. **Scalability**: Redis support for multi-instance deployments
6. **Zero Breaking Changes**: 100% backward compatible

Start using it today with minimal code changes and significant benefits!
