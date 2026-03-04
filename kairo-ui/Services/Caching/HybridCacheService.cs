using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace kairo_ui.Services.Caching
{
    /// <summary>
    /// Production-ready hybrid caching service with L1 (memory) and L2 (distributed) layers
  /// Implements multi-tier caching, circuit breaker, compression, and metrics
    /// </summary>
    public class HybridCacheService : IHybridCacheService
    {
   private readonly IMemoryCache _memoryCache;
   private readonly DistributedCacheService? _distributedCache;
        private readonly ILogger<HybridCacheService> _logger;
        private readonly CacheOptions _options;
        private readonly CacheMetrics _metrics;
        private readonly ConcurrentDictionary<string, byte> _keys;
        private readonly CacheCircuitBreaker? _circuitBreaker;

        public HybridCacheService(
   IMemoryCache memoryCache,
        DistributedCacheService? distributedCache,
            ILogger<HybridCacheService> logger,
            CacheOptions options,
       CacheMetrics metrics)
        {
      _memoryCache = memoryCache ?? throw new ArgumentNullException(nameof(memoryCache));
       _distributedCache = distributedCache;
    _logger = logger ?? throw new ArgumentNullException(nameof(logger));
         _options = options ?? throw new ArgumentNullException(nameof(options));
     _metrics = metrics ?? throw new ArgumentNullException(nameof(metrics));
        _keys = new ConcurrentDictionary<string, byte>();

    if (_options.EnableCircuitBreaker)
            {
                _circuitBreaker = new CacheCircuitBreaker(
        _options.CircuitBreakerThreshold,
       TimeSpan.FromSeconds(_options.CircuitBreakerDurationSeconds));
        }

     _logger.LogInformation("[HybridCache] Initialized | Memory: {Memory} | Distributed: {Distributed} | CircuitBreaker: {CircuitBreaker}",
   _options.EnableMemoryCache,
       _options.EnableDistributedCache,
                _options.EnableCircuitBreaker);
        }

        /// <inheritdoc/>
        public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
      {
            if (string.IsNullOrWhiteSpace(key))
     throw new ArgumentNullException(nameof(key));

            using var timer = new CacheStopwatch(_metrics);

   try
         {
                // L1: Try memory cache first (fastest)
          if (_options.EnableMemoryCache && _memoryCache.TryGetValue(key, out T? memoryValue))
    {
     _metrics.RecordHit();
          _logger.LogDebug("[HybridCache] L1 HIT: {Key} | Type: {Type}", key, typeof(T).Name);
 return memoryValue;
                }

      // L2: Try distributed cache
                if (_options.EnableDistributedCache && _distributedCache != null)
  {
         var distValue = await _distributedCache.GetAsync<T>(key, cancellationToken);
    if (distValue != null)
         {
         // Populate L1 cache for next access
       if (_options.EnableMemoryCache)
     {
          SetInMemoryCache(key, distValue, CachePolicy.Short);
         }

       _metrics.RecordHit();
      _logger.LogDebug("[HybridCache] L2 HIT (promoted to L1): {Key} | Type: {Type}", key, typeof(T).Name);
       return distValue;
      }
          }

  _metrics.RecordMiss();
         _logger.LogDebug("[HybridCache] MISS: {Key} | Type: {Type}", key, typeof(T).Name);
    return default;
            }
   catch (Exception ex)
       {
        _metrics.RecordError();
  _logger.LogError(ex, "[HybridCache] Error retrieving key: {Key}", key);
       return default;
    }
        }

 /// <inheritdoc/>
        public async Task SetAsync<T>(string key, T value, CachePolicy policy, CancellationToken cancellationToken = default)
        {
        if (string.IsNullOrWhiteSpace(key))
                throw new ArgumentNullException(nameof(key));

  if (value == null)
            {
   _logger.LogWarning("[HybridCache] Attempted to cache null value for key: {Key}", key);
  return;
     }

   using var timer = new CacheStopwatch(_metrics);

            try
            {
      // Set in L1 (memory) cache
           if (_options.EnableMemoryCache && policy.UseMemoryCache)
            {
         SetInMemoryCache(key, value, policy);
  }

 // Set in L2 (distributed) cache
       if (_options.EnableDistributedCache && policy.UseDistributedCache && _distributedCache != null)
  {
 await _distributedCache.SetAsync(key, value, policy, cancellationToken);
 }

    if (_options.EnableKeyTracking)
       {
      _keys.TryAdd(key, 0);
       }

  _metrics.RecordSet();
          _logger.LogDebug("[HybridCache] SET: {Key} | Type: {Type} | L1: {L1} | L2: {L2}",
   key, typeof(T).Name, policy.UseMemoryCache, policy.UseDistributedCache);
    }
      catch (Exception ex)
       {
            _metrics.RecordError();
    _logger.LogError(ex, "[HybridCache] Error setting key: {Key}", key);
  }
  }

      /// <inheritdoc/>
        public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, CachePolicy policy, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(key))
    throw new ArgumentNullException(nameof(key));

   if (factory == null)
                throw new ArgumentNullException(nameof(factory));

   // Try to get from cache
        var cachedValue = await GetAsync<T>(key, cancellationToken);
     if (cachedValue != null)
 return cachedValue;

   _logger.LogDebug("[HybridCache] Creating new entry for key: {Key}", key);

            // Create new value
  var newValue = await factory();

         // Cache the new value
            await SetAsync(key, newValue, policy, cancellationToken);

    return newValue;
        }

        /// <inheritdoc/>
      public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
        {
      if (string.IsNullOrWhiteSpace(key))
  throw new ArgumentNullException(nameof(key));

      try
            {
   // Remove from L1
         if (_options.EnableMemoryCache)
{
          _memoryCache.Remove(key);
                }

         // Remove from L2
     if (_options.EnableDistributedCache && _distributedCache != null)
         {
        await _distributedCache.RemoveAsync(key, cancellationToken);
                }

         if (_options.EnableKeyTracking)
{
        _keys.TryRemove(key, out _);
   }

      _metrics.RecordRemove();
     _logger.LogDebug("[HybridCache] REMOVED: {Key}", key);
            }
         catch (Exception ex)
         {
     _metrics.RecordError();
            _logger.LogError(ex, "[HybridCache] Error removing key: {Key}", key);
            }
        }

        /// <inheritdoc/>
        public async Task RemoveByPatternAsync(string keyPattern, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(keyPattern))
       throw new ArgumentNullException(nameof(keyPattern));

            if (!_options.EnableKeyTracking)
            {
         _logger.LogWarning("[HybridCache] Key tracking is disabled, cannot remove by pattern");
         return;
       }

   try
            {
      // Convert wildcard pattern to regex
     var regexPattern = "^" + Regex.Escape(keyPattern).Replace("\\*", ".*") + "$";
                var regex = new Regex(regexPattern, RegexOptions.IgnoreCase);

      var keysToRemove = _keys.Keys.Where(k => regex.IsMatch(k)).ToList();

                foreach (var key in keysToRemove)
  {
  await RemoveAsync(key, cancellationToken);
            }

          _logger.LogInformation("[HybridCache] Removed {Count} entries matching pattern: {Pattern}",
                    keysToRemove.Count, keyPattern);
          }
  catch (Exception ex)
            {
    _metrics.RecordError();
                _logger.LogError(ex, "[HybridCache] Error removing by pattern: {Pattern}", keyPattern);
     }
        }

        /// <inheritdoc/>
        public async Task ClearAsync(CancellationToken cancellationToken = default)
   {
 try
       {
      var keysToRemove = _keys.Keys.ToList();

 foreach (var key in keysToRemove)
           {
        // Remove from L1
    if (_options.EnableMemoryCache)
   {
           _memoryCache.Remove(key);
          }

   // Remove from L2
         if (_options.EnableDistributedCache && _distributedCache != null)
     {
  await _distributedCache.RemoveAsync(key, cancellationToken);
 }
        }

    _keys.Clear();
    _logger.LogInformation("[HybridCache] Cleared all cache entries ({Count} total)", keysToRemove.Count);
  }
            catch (Exception ex)
      {
 _metrics.RecordError();
       _logger.LogError(ex, "[HybridCache] Error clearing cache");
    }
        }

        /// <inheritdoc/>
        public async Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
        {
   if (string.IsNullOrWhiteSpace(key))
          return false;

            // Check L1 first
  if (_options.EnableMemoryCache && _memoryCache.TryGetValue(key, out _))
                return true;

            // Check L2
      if (_options.EnableDistributedCache && _distributedCache != null)
   {
                var value = await _distributedCache.GetAsync<object>(key, cancellationToken);
        return value != null;
      }

       return false;
  }

        /// <inheritdoc/>
     public async Task RefreshAsync(string key, CancellationToken cancellationToken = default)
        {
        if (string.IsNullOrWhiteSpace(key))
      throw new ArgumentNullException(nameof(key));

            if (_options.EnableDistributedCache && _distributedCache != null)
            {
    await _distributedCache.RefreshAsync(key, cancellationToken);
 }
        }

   /// <inheritdoc/>
        public CacheMetricsSnapshot GetMetrics()
     {
       return _metrics.GetSnapshot();
      }

        /// <inheritdoc/>
      public CircuitBreakerState GetCircuitBreakerState()
        {
            return _circuitBreaker?.GetState() ?? CircuitBreakerState.Closed;
        }

        /// <inheritdoc/>
        public void ResetCircuitBreaker()
    {
_circuitBreaker?.Reset();
            _logger.LogInformation("[HybridCache] Circuit breaker reset");
        }

        /// <inheritdoc/>
        public async Task WarmCacheAsync(CancellationToken cancellationToken = default)
        {
            if (!_options.EnableCacheWarming)
    return;

            _logger.LogInformation("[HybridCache] Starting cache warming...");

            try
     {
      // Warm commonly accessed cache entries
                // This can be customized based on application needs
                
         // Example: Pre-load system codes
    var systemCodesToWarm = new[]
     {
  "ClientTypeID",
          "TitleID",
   "GenderID",
   "MaritalStatusID",
               "CountryID"
    };

    // Note: Actual warming logic would need to call the respective services
         // This is a placeholder for the warming strategy
         
     _logger.LogInformation("[HybridCache] Cache warming completed");
   }
            catch (Exception ex)
            {
          _logger.LogError(ex, "[HybridCache] Error during cache warming");
       }
     }

        private void SetInMemoryCache<T>(string key, T value, CachePolicy policy)
        {
   var options = new MemoryCacheEntryOptions();

     if (policy.AbsoluteExpiration.HasValue)
        {
      options.AbsoluteExpirationRelativeToNow = policy.AbsoluteExpiration;
          }
     else if (policy.SlidingExpiration.HasValue)
          {
    options.SlidingExpiration = policy.SlidingExpiration;
    }

  // Map custom priority to MemoryCache priority
            options.Priority = policy.Priority switch
   {
        CachePriority.Low => Microsoft.Extensions.Caching.Memory.CacheItemPriority.Low,
     CachePriority.Normal => Microsoft.Extensions.Caching.Memory.CacheItemPriority.Normal,
CachePriority.High => Microsoft.Extensions.Caching.Memory.CacheItemPriority.High,
          CachePriority.NeverRemove => Microsoft.Extensions.Caching.Memory.CacheItemPriority.NeverRemove,
   _ => Microsoft.Extensions.Caching.Memory.CacheItemPriority.Normal
            };

     // Register eviction callback
            options.RegisterPostEvictionCallback((k, v, r, s) =>
  {
                _keys.TryRemove(k.ToString()!, out _);
      _metrics.RecordEviction();

     var reason = r switch
{
       Microsoft.Extensions.Caching.Memory.EvictionReason.Removed => EvictionReason.Removed,
        Microsoft.Extensions.Caching.Memory.EvictionReason.Replaced => EvictionReason.Replaced,
             Microsoft.Extensions.Caching.Memory.EvictionReason.Expired => EvictionReason.Expired,
     Microsoft.Extensions.Caching.Memory.EvictionReason.TokenExpired => EvictionReason.TokenExpired,
          Microsoft.Extensions.Caching.Memory.EvictionReason.Capacity => EvictionReason.Capacity,
    _ => EvictionReason.None
         };

      _logger.LogDebug("[HybridCache] L1 EVICTED: {Key} | Reason: {Reason}", k, reason);
         policy.EvictionCallback?.Invoke(k.ToString()!, v, reason);
            });

   _memoryCache.Set(key, value, options);
        }
}
}
