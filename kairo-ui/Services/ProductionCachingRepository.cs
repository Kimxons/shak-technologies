using kairo_ui.Services.Caching;
using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace kairo_ui.Services
{
    /// <summary>
    /// Production-ready caching repository with multi-tier caching, metrics, and resilience patterns
    /// Maintains backward compatibility with ICachingRepository while adding advanced features
    /// </summary>
    public class ProductionCachingRepository : IProductionCachingRepository
    {
        private readonly IHybridCacheService _hybridCache;
   private readonly ILogger<ProductionCachingRepository> _logger;
        private readonly CacheOptions _options;

     public ProductionCachingRepository(
            IHybridCacheService hybridCache,
       ILogger<ProductionCachingRepository> logger,
      CacheOptions options)
        {
       _hybridCache = hybridCache ?? throw new ArgumentNullException(nameof(hybridCache));
     _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _options = options ?? throw new ArgumentNullException(nameof(options));

  _logger.LogInformation("[ProductionCache] Initialized with distributed cache: {Enabled}", _options.EnableDistributedCache);
        }

        #region ICachingRepository Implementation (Backward Compatibility)

        /// <inheritdoc/>
        public T? Get<T>(string key)
  {
            return GetAsync<T>(key).GetAwaiter().GetResult();
        }

        /// <inheritdoc/>
        public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
  {
            return _hybridCache.GetAsync<T>(key, cancellationToken);
      }

        /// <inheritdoc/>
        public void Set<T>(string key, T value, int absoluteExpirationMinutes)
        {
            var policy = new CachePolicy
            {
           AbsoluteExpiration = TimeSpan.FromMinutes(absoluteExpirationMinutes),
              Priority = CachePriority.Normal
    };
  SetAsync(key, value, policy).GetAwaiter().GetResult();
  }

        /// <inheritdoc/>
        public void SetWithSlidingExpiration<T>(string key, T value, int slidingExpirationMinutes)
        {
     var policy = new CachePolicy
            {
    SlidingExpiration = TimeSpan.FromMinutes(slidingExpirationMinutes),
     Priority = CachePriority.Normal
          };
          SetAsync(key, value, policy).GetAwaiter().GetResult();
        }

      /// <inheritdoc/>
        public Task SetAsync<T>(string key, T value, int absoluteExpirationMinutes, CancellationToken cancellationToken = default)
    {
   var policy = new CachePolicy
            {
         AbsoluteExpiration = TimeSpan.FromMinutes(absoluteExpirationMinutes),
   Priority = CachePriority.Normal
            };
            return SetAsync(key, value, policy, cancellationToken);
        }

        /// <inheritdoc/>
     public T GetOrCreate<T>(string key, Func<T> factory, int absoluteExpirationMinutes)
     {
   var policy = new CachePolicy
            {
       AbsoluteExpiration = TimeSpan.FromMinutes(absoluteExpirationMinutes),
      Priority = CachePriority.Normal
            };
    
         return GetOrCreateAsync(key, () => Task.FromResult(factory()), policy)
    .GetAwaiter()
   .GetResult();
        }

      /// <inheritdoc/>
     public Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, int absoluteExpirationMinutes, CancellationToken cancellationToken = default)
        {
         var policy = new CachePolicy
            {
          AbsoluteExpiration = TimeSpan.FromMinutes(absoluteExpirationMinutes),
    Priority = CachePriority.Normal
       };

       return GetOrCreateAsync(key, factory, policy, cancellationToken);
        }

        /// <inheritdoc/>
        public void Remove(string key)
        {
     RemoveAsync(key).GetAwaiter().GetResult();
        }

        /// <inheritdoc/>
        public void RemoveByPattern(string keyPattern)
        {
 RemoveByPatternAsync(keyPattern).GetAwaiter().GetResult();
     }

        /// <inheritdoc/>
    public void Clear()
   {
        ClearAsync().GetAwaiter().GetResult();
        }

        /// <inheritdoc/>
        public bool Exists(string key)
        {
     return ExistsAsync(key).GetAwaiter().GetResult();
        }

 /// <inheritdoc/>
        public CacheStatistics GetStatistics()
        {
            var metrics = GetDetailedMetrics();
  return new CacheStatistics
            {
      TotalEntries = (int)metrics.Sets,
         HitCount = (int)metrics.Hits,
        MissCount = (int)metrics.Misses,
     EstimatedSize = 0 // Not easily calculable with distributed cache
       };
     }

        #endregion

        #region IProductionCachingRepository Implementation (New Features)

        /// <inheritdoc/>
        public Task<T?> GetAsync<T>(string key, CachePolicy policy, CancellationToken cancellationToken = default)
        {
 return _hybridCache.GetAsync<T>(key, cancellationToken);
    }

   /// <inheritdoc/>
        public Task SetAsync<T>(string key, T value, CachePolicy policy, CancellationToken cancellationToken = default)
        {
          return _hybridCache.SetAsync(key, value, policy, cancellationToken);
        }

   /// <inheritdoc/>
        public Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, CachePolicy policy, CancellationToken cancellationToken = default)
        {
            return _hybridCache.GetOrCreateAsync(key, factory, policy, cancellationToken);
        }

        /// <inheritdoc/>
        public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
   {
          return _hybridCache.RemoveAsync(key, cancellationToken);
        }

        /// <inheritdoc/>
    public Task RemoveByPatternAsync(string keyPattern, CancellationToken cancellationToken = default)
        {
        return _hybridCache.RemoveByPatternAsync(keyPattern, cancellationToken);
     }

        /// <inheritdoc/>
      public Task ClearAsync(CancellationToken cancellationToken = default)
   {
   return _hybridCache.ClearAsync(cancellationToken);
        }

  /// <inheritdoc/>
        public Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default)
        {
            return _hybridCache.ExistsAsync(key, cancellationToken);
        }

      /// <inheritdoc/>
    public Task RefreshAsync(string key, CancellationToken cancellationToken = default)
        {
   return _hybridCache.RefreshAsync(key, cancellationToken);
        }

    /// <inheritdoc/>
        public CacheMetricsSnapshot GetDetailedMetrics()
        {
       return _hybridCache.GetMetrics();
        }

        /// <inheritdoc/>
        public CircuitBreakerState GetCircuitBreakerState()
        {
   return _hybridCache.GetCircuitBreakerState();
        }

   /// <inheritdoc/>
        public void ResetCircuitBreaker()
        {
            _hybridCache.ResetCircuitBreaker();
        }

  /// <inheritdoc/>
        public Task WarmCacheAsync(CancellationToken cancellationToken = default)
        {
            return _hybridCache.WarmCacheAsync(cancellationToken);
      }

     /// <inheritdoc/>
     public IEnumerable<string> GetAllKeys()
        {
     // This would require tracking keys, which is implemented in HybridCacheService
     return Enumerable.Empty<string>();
  }

   /// <inheritdoc/>
        public async Task SetBulkAsync<T>(IDictionary<string, T> items, CachePolicy policy, CancellationToken cancellationToken = default)
        {
     if (items == null || items.Count == 0)
                return;

  _logger.LogDebug("[ProductionCache] Bulk setting {Count} items", items.Count);

      var tasks = items.Select(kvp => _hybridCache.SetAsync(kvp.Key, kvp.Value, policy, cancellationToken));
    await Task.WhenAll(tasks);
   }

      /// <inheritdoc/>
        public async Task<IDictionary<string, T?>> GetBulkAsync<T>(IEnumerable<string> keys, CancellationToken cancellationToken = default)
     {
            if (keys == null)
      return new Dictionary<string, T?>();

            var keyList = keys.ToList();
      _logger.LogDebug("[ProductionCache] Bulk getting {Count} items", keyList.Count);

            var tasks = keyList.Select(async key => new
            {
     Key = key,
    Value = await _hybridCache.GetAsync<T>(key, cancellationToken)
        });

   var results = await Task.WhenAll(tasks);
            return results.ToDictionary(r => r.Key, r => r.Value);
        }

      /// <inheritdoc/>
        public async Task CompactAsync(CancellationToken cancellationToken = default)
        {
            _logger.LogInformation("[ProductionCache] Starting cache compaction");
    
        try
            {
                // Memory cache compaction is handled automatically by MemoryCache
     // For distributed cache, we don't have direct control
              // This is a placeholder for future enhancement
       
       await Task.CompletedTask;
     _logger.LogInformation("[ProductionCache] Cache compaction completed");
            }
  catch (Exception ex)
        {
      _logger.LogError(ex, "[ProductionCache] Error during cache compaction");
       }
   }

        #endregion
    }
}
