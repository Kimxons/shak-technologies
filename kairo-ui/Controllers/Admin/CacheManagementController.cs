using kairo_ui.Services;
using kairo_ui.Services.Caching;
using Microsoft.AspNetCore.Mvc;

namespace kairo_ui.Controllers.Admin
{
 /// <summary>
    /// Administrative controller for cache management and monitoring
    /// Provides endpoints for viewing metrics, clearing cache, and managing circuit breaker
    /// </summary>
    [Route("api/admin/cache")]
    [ApiController]
    public class CacheManagementController : Controller
    {
private readonly IProductionCachingRepository _cache;
        private readonly ILogger<CacheManagementController> _logger;

   public CacheManagementController(
     IProductionCachingRepository cache,
        ILogger<CacheManagementController> logger)
        {
   _cache = cache;
            _logger = logger;
  }

   /// <summary>
     /// Gets current cache metrics and statistics
        /// GET /api/admin/cache/metrics
   /// </summary>
        [HttpGet("metrics")]
 public IActionResult GetMetrics()
        {
 try
            {
       var metrics = _cache.GetDetailedMetrics();
  var circuitState = _cache.GetCircuitBreakerState();

     return Ok(new
    {
          success = true,
          metrics = new
       {
     hits = metrics.Hits,
       misses = metrics.Misses,
totalRequests = metrics.TotalRequests,
       hitRate = $"{metrics.HitRate:P2}",
    sets = metrics.Sets,
      removes = metrics.Removes,
     evictions = metrics.Evictions,
  errors = metrics.Errors,
        averageResponseTimeMs = metrics.AverageResponseTimeMs,
              uptime = metrics.Uptime.ToString(@"dd\.hh\:mm\:ss"),
       timestamp = metrics.Timestamp
         },
     circuitBreaker = new
{
     state = circuitState.ToString(),
             isHealthy = circuitState == CircuitBreakerState.Closed
   }
 });
     }
       catch (Exception ex)
         {
   _logger.LogError(ex, "[CacheManagement] Error getting metrics");
    return StatusCode(500, new { success = false, message = "Error retrieving cache metrics" });
   }
  }

        /// <summary>
     /// Gets all tracked cache keys
  /// GET /api/admin/cache/keys
        /// </summary>
      [HttpGet("keys")]
      public IActionResult GetKeys([FromQuery] string? pattern = null)
        {
          try
            {
       var allKeys = _cache.GetAllKeys().ToList();

        if (!string.IsNullOrWhiteSpace(pattern))
       {
  var regex = new System.Text.RegularExpressions.Regex(
      "^" + System.Text.RegularExpressions.Regex.Escape(pattern).Replace("\\*", ".*") + "$",
       System.Text.RegularExpressions.RegexOptions.IgnoreCase);
          allKeys = allKeys.Where(k => regex.IsMatch(k)).ToList();
   }

     return Ok(new
      {
      success = true,
          count = allKeys.Count,
           keys = allKeys.Take(100) // Limit to first 100 for performance
     });
  }
       catch (Exception ex)
    {
         _logger.LogError(ex, "[CacheManagement] Error getting keys");
   return StatusCode(500, new { success = false, message = "Error retrieving cache keys" });
      }
        }

        /// <summary>
   /// Clears all cache entries
   /// POST /api/admin/cache/clear
 /// </summary>
     [HttpPost("clear")]
        public async Task<IActionResult> ClearCache()
   {
   try
  {
         _logger.LogWarning("[CacheManagement] Clearing all cache entries");
  await _cache.ClearAsync();
    
      return Ok(new { success = true, message = "Cache cleared successfully" });
       }
            catch (Exception ex)
{
     _logger.LogError(ex, "[CacheManagement] Error clearing cache");
      return StatusCode(500, new { success = false, message = "Error clearing cache" });
     }
 }

        /// <summary>
        /// Removes cache entries matching a pattern
 /// POST /api/admin/cache/remove-pattern
        /// </summary>
        [HttpPost("remove-pattern")]
     public async Task<IActionResult> RemoveByPattern([FromBody] RemoveByPatternRequest request)
     {
      if (string.IsNullOrWhiteSpace(request?.Pattern))
     {
return BadRequest(new { success = false, message = "Pattern is required" });
         }

try
      {
     _logger.LogWarning("[CacheManagement] Removing cache entries matching pattern: {Pattern}", request.Pattern);
await _cache.RemoveByPatternAsync(request.Pattern);
 
     return Ok(new { success = true, message = $"Cache entries matching '{request.Pattern}' removed" });
      }
        catch (Exception ex)
      {
    _logger.LogError(ex, "[CacheManagement] Error removing by pattern");
    return StatusCode(500, new { success = false, message = "Error removing cache entries" });
      }
  }

/// <summary>
        /// Removes a specific cache entry
        /// DELETE /api/admin/cache/{key}
/// </summary>
        [HttpDelete("{key}")]
   public async Task<IActionResult> RemoveKey(string key)
      {
  if (string.IsNullOrWhiteSpace(key))
  {
       return BadRequest(new { success = false, message = "Key is required" });
  }

       try
     {
    _logger.LogWarning("[CacheManagement] Removing cache entry: {Key}", key);
        await _cache.RemoveAsync(key);
     
 return Ok(new { success = true, message = $"Cache entry '{key}' removed" });
      }
   catch (Exception ex)
     {
     _logger.LogError(ex, "[CacheManagement] Error removing key");
return StatusCode(500, new { success = false, message = "Error removing cache entry" });
   }
  }

        /// <summary>
        /// Resets the circuit breaker
   /// POST /api/admin/cache/circuit-breaker/reset
 /// </summary>
  [HttpPost("circuit-breaker/reset")]
    public IActionResult ResetCircuitBreaker()
   {
            try
     {
      _logger.LogWarning("[CacheManagement] Resetting circuit breaker");
       _cache.ResetCircuitBreaker();
         
    return Ok(new { success = true, message = "Circuit breaker reset successfully" });
      }
      catch (Exception ex)
     {
        _logger.LogError(ex, "[CacheManagement] Error resetting circuit breaker");
     return StatusCode(500, new { success = false, message = "Error resetting circuit breaker" });
 }
        }

   /// <summary>
        /// Triggers manual cache warming
/// POST /api/admin/cache/warm
/// </summary>
    [HttpPost("warm")]
   public async Task<IActionResult> WarmCache()
  {
   try
     {
       _logger.LogInformation("[CacheManagement] Triggering cache warming");
           await _cache.WarmCacheAsync();
 
   return Ok(new { success = true, message = "Cache warming completed" });
            }
      catch (Exception ex)
  {
    _logger.LogError(ex, "[CacheManagement] Error warming cache");
     return StatusCode(500, new { success = false, message = "Error warming cache" });
    }
  }

      /// <summary>
        /// Compacts the cache by removing expired entries
        /// POST /api/admin/cache/compact
        /// </summary>
 [HttpPost("compact")]
  public async Task<IActionResult> CompactCache()
        {
    try
      {
  _logger.LogInformation("[CacheManagement] Triggering cache compaction");
     await _cache.CompactAsync();
 
   return Ok(new { success = true, message = "Cache compaction completed" });
    }
    catch (Exception ex)
       {
      _logger.LogError(ex, "[CacheManagement] Error compacting cache");
    return StatusCode(500, new { success = false, message = "Error compacting cache" });
      }
        }

/// <summary>
  /// Health check endpoint for cache system
   /// GET /api/admin/cache/health
  /// </summary>
        [HttpGet("health")]
        public IActionResult GetHealth()
    {
   try
            {
    var metrics = _cache.GetDetailedMetrics();
          var circuitState = _cache.GetCircuitBreakerState();
          
        var isHealthy = circuitState == CircuitBreakerState.Closed && metrics.Errors < 10;

    return Ok(new
     {
      success = true,
   healthy = isHealthy,
            status = isHealthy ? "Healthy" : "Degraded",
     circuitBreaker = circuitState.ToString(),
      errors = metrics.Errors,
    hitRate = metrics.HitRate
     });
  }
  catch (Exception ex)
  {
   _logger.LogError(ex, "[CacheManagement] Error checking health");
       return StatusCode(500, new { success = false, message = "Error checking cache health" });
            }
  }
 }

    public class RemoveByPatternRequest
  {
  public string? Pattern { get; set; }
    }
}
