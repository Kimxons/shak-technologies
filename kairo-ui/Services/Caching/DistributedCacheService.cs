using Microsoft.Extensions.Caching.Distributed;
using System.Collections.Concurrent;
using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace kairo_ui.Services.Caching
{
    /// <summary>
/// Production-ready distributed cache implementation with compression, circuit breaker, and metrics
    /// </summary>
    public class DistributedCacheService
    {
        private readonly IDistributedCache _distributedCache;
        private readonly ILogger<DistributedCacheService> _logger;
        private readonly CacheOptions _options;
        private readonly CacheMetrics _metrics;
        private readonly CacheCircuitBreaker? _circuitBreaker;
private readonly ConcurrentDictionary<string, byte> _keys;

   public DistributedCacheService(
            IDistributedCache distributedCache,
            ILogger<DistributedCacheService> logger,
        CacheOptions options,
      CacheMetrics metrics)
    {
            _distributedCache = distributedCache ?? throw new ArgumentNullException(nameof(distributedCache));
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
        }

        /// <summary>
      /// Gets a value from distributed cache
        /// </summary>
        public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
      {
            if (string.IsNullOrWhiteSpace(key))
  throw new ArgumentNullException(nameof(key));

            if (!_options.EnableDistributedCache)
          return default;

    if (_circuitBreaker?.IsOpen() == true)
      {
         _logger.LogDebug("[DistCache] Circuit breaker is open, skipping get for key: {Key}", key);
 return default;
          }

   using var timer = new CacheStopwatch(_metrics);
     
         try
            {
              var prefixedKey = GetPrefixedKey(key);
            var data = await _distributedCache.GetAsync(prefixedKey, cancellationToken);

         if (data == null || data.Length == 0)
     {
  _metrics.RecordMiss();
            _logger.LogDebug("[DistCache] MISS: {Key}", key);
   return default;
      }

 var value = await DeserializeAsync<T>(data);
                _metrics.RecordHit();
     _circuitBreaker?.RecordSuccess();
                _logger.LogDebug("[DistCache] HIT: {Key} | Type: {Type}", key, typeof(T).Name);
    
         return value;
            }
catch (Exception ex)
            {
   _metrics.RecordError();
     _circuitBreaker?.RecordFailure();
     _logger.LogError(ex, "[DistCache] Error retrieving key: {Key}", key);
      return default;
            }
}

        /// <summary>
        /// Sets a value in distributed cache
        /// </summary>
        public async Task SetAsync<T>(string key, T value, CachePolicy policy, CancellationToken cancellationToken = default)
     {
            if (string.IsNullOrWhiteSpace(key))
     throw new ArgumentNullException(nameof(key));

        if (value == null)
  {
         _logger.LogWarning("[DistCache] Attempted to cache null value for key: {Key}", key);
              return;
     }

            if (!_options.EnableDistributedCache || !policy.UseDistributedCache)
     return;

  if (_circuitBreaker?.IsOpen() == true)
            {
         _logger.LogDebug("[DistCache] Circuit breaker is open, skipping set for key: {Key}", key);
   return;
        }

         using var timer = new CacheStopwatch(_metrics);

 try
      {
                var prefixedKey = GetPrefixedKey(key);
             var data = await SerializeAsync(value, policy.EnableCompression);

     var options = new DistributedCacheEntryOptions();
             
       if (policy.AbsoluteExpiration.HasValue)
    {
     options.AbsoluteExpirationRelativeToNow = policy.AbsoluteExpiration;
            }
    else if (policy.SlidingExpiration.HasValue)
                {
       options.SlidingExpiration = policy.SlidingExpiration;
           }

await _distributedCache.SetAsync(prefixedKey, data, options, cancellationToken);
       
                if (_options.EnableKeyTracking)
         {
         _keys.TryAdd(key, 0);
     }

      _metrics.RecordSet();
      _circuitBreaker?.RecordSuccess();
     
  _logger.LogDebug("[DistCache] SET: {Key} | Type: {Type} | Size: {Size}KB | Compressed: {Compressed}", 
         key, typeof(T).Name, data.Length / 1024, policy.EnableCompression);
            }
 catch (Exception ex)
            {
           _metrics.RecordError();
    _circuitBreaker?.RecordFailure();
      _logger.LogError(ex, "[DistCache] Error setting key: {Key}", key);
       }
        }

        /// <summary>
   /// Removes a value from distributed cache
      /// </summary>
        public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(key))
    throw new ArgumentNullException(nameof(key));

   if (!_options.EnableDistributedCache)
                return;

     try
        {
                var prefixedKey = GetPrefixedKey(key);
                await _distributedCache.RemoveAsync(prefixedKey, cancellationToken);
  
    if (_options.EnableKeyTracking)
         {
          _keys.TryRemove(key, out _);
  }

   _metrics.RecordRemove();
      _logger.LogDebug("[DistCache] REMOVED: {Key}", key);
      }
            catch (Exception ex)
        {
    _metrics.RecordError();
                _logger.LogError(ex, "[DistCache] Error removing key: {Key}", key);
     }
        }

        /// <summary>
        /// Refreshes the expiration of a cache entry
        /// </summary>
   public async Task RefreshAsync(string key, CancellationToken cancellationToken = default)
 {
            if (string.IsNullOrWhiteSpace(key))
         throw new ArgumentNullException(nameof(key));

         if (!_options.EnableDistributedCache)
       return;

         try
        {
      var prefixedKey = GetPrefixedKey(key);
            await _distributedCache.RefreshAsync(prefixedKey, cancellationToken);
   _logger.LogDebug("[DistCache] REFRESHED: {Key}", key);
     }
   catch (Exception ex)
            {
  _metrics.RecordError();
        _logger.LogError(ex, "[DistCache] Error refreshing key: {Key}", key);
            }
        }

/// <summary>
    /// Gets all tracked keys (requires key tracking to be enabled)
        /// </summary>
        public IEnumerable<string> GetTrackedKeys()
        {
return _keys.Keys;
     }

        private string GetPrefixedKey(string key)
        {
        return $"{_options.RedisInstanceName}{key}";
        }

        private async Task<byte[]> SerializeAsync<T>(T value, bool compress)
        {
     var json = JsonSerializer.Serialize(value);
   var bytes = Encoding.UTF8.GetBytes(json);

   if (!compress || !_options.EnableCompression || bytes.Length < _options.CompressionThresholdBytes)
            {
    return bytes;
       }

            using var output = new MemoryStream();
        await using (var gzip = new GZipStream(output, CompressionLevel.Fastest))
  {
         await gzip.WriteAsync(bytes);
       }

         return output.ToArray();
        }

        private async Task<T?> DeserializeAsync<T>(byte[] data)
      {
            try
          {
         // Try to decompress first
     using var input = new MemoryStream(data);
                using var output = new MemoryStream();
       
           try
          {
await using var gzip = new GZipStream(input, CompressionMode.Decompress);
        await gzip.CopyToAsync(output);
   output.Position = 0;
                    
          return await JsonSerializer.DeserializeAsync<T>(output);
}
                catch (InvalidDataException)
                {
                  // Not compressed, deserialize directly
          var json = Encoding.UTF8.GetString(data);
     return JsonSerializer.Deserialize<T>(json);
             }
      }
            catch (Exception ex)
      {
       _logger.LogError(ex, "[DistCache] Error deserializing data");
             return default;
       }
  }
    }
}
