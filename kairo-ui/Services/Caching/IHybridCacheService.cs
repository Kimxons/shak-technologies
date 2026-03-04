using System.Collections.Concurrent;

namespace kairo_ui.Services.Caching
{
    /// <summary>
  /// Interface for the production-ready caching service with L1/L2 layers
    /// </summary>
    public interface IHybridCacheService
    {
        /// <summary>
  /// Gets a cached value by key, checking L1 (memory) then L2 (distributed)
/// </summary>
        Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

        /// <summary>
        /// Sets a value in cache with specified policy
   /// </summary>
        Task SetAsync<T>(string key, T value, CachePolicy policy, CancellationToken cancellationToken = default);

      /// <summary>
     /// Gets or creates a cached value using the provided factory
  /// </summary>
        Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, CachePolicy policy, CancellationToken cancellationToken = default);

        /// <summary>
 /// Removes a value from all cache layers
   /// </summary>
   Task RemoveAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
  /// Removes multiple values by key pattern
   /// </summary>
     Task RemoveByPatternAsync(string keyPattern, CancellationToken cancellationToken = default);

        /// <summary>
   /// Clears all cached values from all layers
   /// </summary>
     Task ClearAsync(CancellationToken cancellationToken = default);

/// <summary>
        /// Checks if a key exists in cache
    /// </summary>
 Task<bool> ExistsAsync(string key, CancellationToken cancellationToken = default);

        /// <summary>
        /// Refreshes the expiration time of a cache entry
 /// </summary>
        Task RefreshAsync(string key, CancellationToken cancellationToken = default);

  /// <summary>
   /// Gets cache metrics
  /// </summary>
   CacheMetricsSnapshot GetMetrics();

        /// <summary>
      /// Gets circuit breaker state
        /// </summary>
   CircuitBreakerState GetCircuitBreakerState();

  /// <summary>
     /// Resets circuit breaker
        /// </summary>
  void ResetCircuitBreaker();

        /// <summary>
   /// Warms the cache with commonly accessed data
      /// </summary>
        Task WarmCacheAsync(CancellationToken cancellationToken = default);
 }
}
