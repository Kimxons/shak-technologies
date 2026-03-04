using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace kairo_ui.Services
{
    /// <summary>
    /// Implementation of centralized caching operations using IMemoryCache
    /// </summary>
    public class CachingRepository : ICachingRepository
    {
private readonly IMemoryCache _cache;
        private readonly ILogger<CachingRepository> _logger;
        private readonly ConcurrentDictionary<string, byte> _keys; // Track all keys
        private int _hitCount = 0;
        private int _missCount = 0;

        public CachingRepository(IMemoryCache cache, ILogger<CachingRepository> logger)
  {
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    _keys = new ConcurrentDictionary<string, byte>();
        }

        /// <inheritdoc/>
        public T? Get<T>(string key)
        {
    if (string.IsNullOrWhiteSpace(key))
                throw new ArgumentNullException(nameof(key));

            try
            {
     if (_cache.TryGetValue(key, out T? value))
         {
         Interlocked.Increment(ref _hitCount);
     _logger.LogDebug("[Cache] HIT: {Key} | Type: {Type}", key, typeof(T).Name);
        return value;
           }

    Interlocked.Increment(ref _missCount);
    _logger.LogDebug("[Cache] MISS: {Key} | Type: {Type}", key, typeof(T).Name);
    return default;
            }
     catch (Exception ex)
 {
         _logger.LogError(ex, "[Cache] Error retrieving key: {Key}", key);
             return default;
  }
        }

        /// <inheritdoc/>
        public Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
        {
          // IMemoryCache is synchronous, so wrap in Task
      return Task.FromResult(Get<T>(key));
        }

     /// <inheritdoc/>
        public void Set<T>(string key, T value, int absoluteExpirationMinutes)
        {
       if (string.IsNullOrWhiteSpace(key))
        throw new ArgumentNullException(nameof(key));

       if (value == null)
            {
       _logger.LogWarning("[Cache] Attempted to cache null value for key: {Key}", key);
          return;
            }

         try
        {
          var options = new MemoryCacheEntryOptions
        {
  AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(absoluteExpirationMinutes)
 };

            // Register callback to remove key from tracking when evicted
      options.RegisterPostEvictionCallback((k, v, r, s) =>
             {
      _keys.TryRemove(k.ToString()!, out _);
         _logger.LogDebug("[Cache] EVICTED: {Key} | Reason: {Reason}", k, r);
                });

      _cache.Set(key, value, options);
 _keys.TryAdd(key, 0);

    _logger.LogDebug("[Cache] SET: {Key} | Type: {Type} | Expiration: {Minutes}min", 
        key, typeof(T).Name, absoluteExpirationMinutes);
       }
            catch (Exception ex)
    {
        _logger.LogError(ex, "[Cache] Error setting key: {Key}", key);
            }
        }

        /// <inheritdoc/>
  public void SetWithSlidingExpiration<T>(string key, T value, int slidingExpirationMinutes)
        {
            if (string.IsNullOrWhiteSpace(key))
        throw new ArgumentNullException(nameof(key));

            if (value == null)
    {
    _logger.LogWarning("[Cache] Attempted to cache null value for key: {Key}", key);
          return;
     }

   try
            {
 var options = new MemoryCacheEntryOptions
         {
          SlidingExpiration = TimeSpan.FromMinutes(slidingExpirationMinutes)
       };

     options.RegisterPostEvictionCallback((k, v, r, s) =>
   {
          _keys.TryRemove(k.ToString()!, out _);
  _logger.LogDebug("[Cache] EVICTED: {Key} | Reason: {Reason}", k, r);
             });

         _cache.Set(key, value, options);
      _keys.TryAdd(key, 0);

           _logger.LogDebug("[Cache] SET (Sliding): {Key} | Type: {Type} | SlidingExpiration: {Minutes}min", 
         key, typeof(T).Name, slidingExpirationMinutes);
            }
            catch (Exception ex)
            {
     _logger.LogError(ex, "[Cache] Error setting key with sliding expiration: {Key}", key);
      }
    }

      /// <inheritdoc/>
        public Task SetAsync<T>(string key, T value, int absoluteExpirationMinutes, CancellationToken cancellationToken = default)
        {
Set(key, value, absoluteExpirationMinutes);
 return Task.CompletedTask;
    }

     /// <inheritdoc/>
   public T GetOrCreate<T>(string key, Func<T> factory, int absoluteExpirationMinutes)
        {
            if (string.IsNullOrWhiteSpace(key))
   throw new ArgumentNullException(nameof(key));

            if (factory == null)
    throw new ArgumentNullException(nameof(factory));

            var cachedValue = Get<T>(key);
     if (cachedValue != null)
return cachedValue;

            _logger.LogDebug("[Cache] Creating new entry for key: {Key}", key);
       var newValue = factory();
  Set(key, newValue, absoluteExpirationMinutes);
       return newValue;
        }

        /// <inheritdoc/>
        public async Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, int absoluteExpirationMinutes, CancellationToken cancellationToken = default)
        {
   if (string.IsNullOrWhiteSpace(key))
      throw new ArgumentNullException(nameof(key));

  if (factory == null)
        throw new ArgumentNullException(nameof(factory));

     var cachedValue = Get<T>(key);
            if (cachedValue != null)
           return cachedValue;

     _logger.LogDebug("[Cache] Creating new entry for key: {Key}", key);
          var newValue = await factory();
          Set(key, newValue, absoluteExpirationMinutes);
     return newValue;
        }

   /// <inheritdoc/>
   public void Remove(string key)
        {
            if (string.IsNullOrWhiteSpace(key))
     throw new ArgumentNullException(nameof(key));

          try
        {
         _cache.Remove(key);
       _keys.TryRemove(key, out _);
     _logger.LogDebug("[Cache] REMOVED: {Key}", key);
            }
   catch (Exception ex)
 {
           _logger.LogError(ex, "[Cache] Error removing key: {Key}", key);
            }
        }

        /// <inheritdoc/>
        public void RemoveByPattern(string keyPattern)
        {
            if (string.IsNullOrWhiteSpace(keyPattern))
             throw new ArgumentNullException(nameof(keyPattern));

try
       {
        // Convert wildcard pattern to regex
      var regexPattern = "^" + Regex.Escape(keyPattern).Replace("\\*", ".*") + "$";
       var regex = new Regex(regexPattern, RegexOptions.IgnoreCase);

     var keysToRemove = _keys.Keys.Where(k => regex.IsMatch(k)).ToList();
      
       foreach (var key in keysToRemove)
       {
       Remove(key);
   }

      _logger.LogInformation("[Cache] Removed {Count} entries matching pattern: {Pattern}", 
    keysToRemove.Count, keyPattern);
   }
         catch (Exception ex)
     {
             _logger.LogError(ex, "[Cache] Error removing by pattern: {Pattern}", keyPattern);
  }
        }

        /// <inheritdoc/>
        public void Clear()
    {
            try
  {
        var keysToRemove = _keys.Keys.ToList();
  foreach (var key in keysToRemove)
     {
    _cache.Remove(key);
                }
      _keys.Clear();

          _logger.LogInformation("[Cache] Cleared all cache entries ({Count} total)", keysToRemove.Count);
        }
            catch (Exception ex)
            {
    _logger.LogError(ex, "[Cache] Error clearing cache");
   }
        }

        /// <inheritdoc/>
        public bool Exists(string key)
        {
            if (string.IsNullOrWhiteSpace(key))
         return false;

    return _cache.TryGetValue(key, out _);
        }

   /// <inheritdoc/>
 public CacheStatistics GetStatistics()
        {
            return new CacheStatistics
            {
   TotalEntries = _keys.Count,
          HitCount = _hitCount,
      MissCount = _missCount,
          EstimatedSize = EstimateCacheSize()
            };
        }

  private long EstimateCacheSize()
        {
        // Simple estimation - could be enhanced
 return _keys.Count * 1024; // Assume ~1KB per entry on average
        }
    }
}
