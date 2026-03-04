using kairo_ui.Services.Caching;

namespace kairo_ui.Services
{
    /// <summary>
    /// Enhanced caching repository interface with production-ready features
  /// Maintains backward compatibility while adding new capabilities
    /// </summary>
    public interface IProductionCachingRepository : ICachingRepository
    {
        /// <summary>
        /// Gets a cached value with custom policy
        /// </summary>
        Task<T?> GetAsync<T>(string key, CachePolicy policy, CancellationToken cancellationToken = default);

        /// <summary>
     /// Sets a value with custom caching policy
/// </summary>
     Task SetAsync<T>(string key, T value, CachePolicy policy, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets or creates with custom policy
        /// </summary>
  Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, CachePolicy policy, CancellationToken cancellationToken = default);

      /// <summary>
    /// Removes a value asynchronously
        /// </summary>
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);

   /// <summary>
        /// Removes multiple values by pattern asynchronously
      /// </summary>
     Task RemoveByPatternAsync(string keyPattern, CancellationToken cancellationToken = default);

        /// <summary>
   /// Clears all cache asynchronously
        /// </summary>
        Task ClearAsync(CancellationToken cancellationToken = default);

        /// <summary>
     /// Checks if key exists asynchronously
        /// </summary>
        Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default);

        /// <summary>
        /// Refreshes cache entry expiration
        /// </summary>
        Task RefreshAsync(string key, CancellationToken cancellationToken = default);

        /// <summary>
        /// Gets detailed cache metrics
     /// </summary>
 CacheMetricsSnapshot GetDetailedMetrics();

        /// <summary>
        /// Gets circuit breaker state for distributed cache
        /// </summary>
      CircuitBreakerState GetCircuitBreakerState();

        /// <summary>
        /// Resets circuit breaker manually
        /// </summary>
        void ResetCircuitBreaker();

        /// <summary>
     /// Warms cache with commonly accessed data
        /// </summary>
  Task WarmCacheAsync(CancellationToken cancellationToken = default);

        /// <summary>
     /// Gets all tracked cache keys
  /// </summary>
  IEnumerable<string> GetAllKeys();

 /// <summary>
    /// Bulk set operation
        /// </summary>
      Task SetBulkAsync<T>(IDictionary<string, T> items, CachePolicy policy, CancellationToken cancellationToken = default);

    /// <summary>
   /// Bulk get operation
/// </summary>
        Task<IDictionary<string, T?>> GetBulkAsync<T>(IEnumerable<string> keys, CancellationToken cancellationToken = default);

      /// <summary>
   /// Removes expired entries manually (cache cleanup)
        /// </summary>
        Task CompactAsync(CancellationToken cancellationToken = default);
    }
}
