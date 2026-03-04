using Microsoft.Extensions.Caching.Memory;

namespace kairo_ui.Services
{
    /// <summary>
    /// Interface for centralized caching operations
    /// </summary>
    public interface ICachingRepository
  {
        /// <summary>
        /// Gets a cached value by key
     /// </summary>
  /// <typeparam name="T">Type of cached object</typeparam>
  /// <param name="key">Cache key</param>
        /// <returns>Cached value or default if not found</returns>
  T? Get<T>(string key);

     /// <summary>
        /// Gets a cached value by key asynchronously
/// </summary>
        /// <typeparam name="T">Type of cached object</typeparam>
    /// <param name="key">Cache key</param>
    /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Cached value or default if not found</returns>
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

 /// <summary>
      /// Sets a value in cache with absolute expiration
 /// </summary>
   /// <typeparam name="T">Type of object to cache</typeparam>
 /// <param name="key">Cache key</param>
  /// <param name="value">Value to cache</param>
  /// <param name="absoluteExpirationMinutes">Absolute expiration in minutes</param>
        void Set<T>(string key, T value, int absoluteExpirationMinutes);

   /// <summary>
     /// Sets a value in cache with sliding expiration
        /// </summary>
   /// <typeparam name="T">Type of object to cache</typeparam>
     /// <param name="key">Cache key</param>
        /// <param name="value">Value to cache</param>
      /// <param name="slidingExpirationMinutes">Sliding expiration in minutes</param>
   void SetWithSlidingExpiration<T>(string key, T value, int slidingExpirationMinutes);

 /// <summary>
        /// Sets a value in cache asynchronously with absolute expiration
   /// </summary>
        /// <typeparam name="T">Type of object to cache</typeparam>
        /// <param name="key">Cache key</param>
        /// <param name="value">Value to cache</param>
      /// <param name="absoluteExpirationMinutes">Absolute expiration in minutes</param>
 /// <param name="cancellationToken">Cancellation token</param>
      Task SetAsync<T>(string key, T value, int absoluteExpirationMinutes, CancellationToken cancellationToken = default);

        /// <summary>
  /// Gets or creates a cached value
   /// </summary>
        /// <typeparam name="T">Type of object to cache</typeparam>
        /// <param name="key">Cache key</param>
        /// <param name="factory">Factory function to create value if not cached</param>
   /// <param name="absoluteExpirationMinutes">Absolute expiration in minutes</param>
 /// <returns>Cached or newly created value</returns>
     T GetOrCreate<T>(string key, Func<T> factory, int absoluteExpirationMinutes);

        /// <summary>
        /// Gets or creates a cached value asynchronously
   /// </summary>
   /// <typeparam name="T">Type of object to cache</typeparam>
        /// <param name="key">Cache key</param>
        /// <param name="factory">Async factory function to create value if not cached</param>
      /// <param name="absoluteExpirationMinutes">Absolute expiration in minutes</param>
        /// <param name="cancellationToken">Cancellation token</param>
   /// <returns>Cached or newly created value</returns>
   Task<T> GetOrCreateAsync<T>(string key, Func<Task<T>> factory, int absoluteExpirationMinutes, CancellationToken cancellationToken = default);

 /// <summary>
        /// Removes a cached value by key
   /// </summary>
        /// <param name="key">Cache key</param>
   void Remove(string key);

 /// <summary>
    /// Removes multiple cached values by key pattern
        /// </summary>
        /// <param name="keyPattern">Key pattern to match (supports wildcards)</param>
        void RemoveByPattern(string keyPattern);

 /// <summary>
     /// Clears all cached values
/// </summary>
  void Clear();

     /// <summary>
  /// Checks if a key exists in cache
 /// </summary>
      /// <param name="key">Cache key</param>
   /// <returns>True if key exists, false otherwise</returns>
   bool Exists(string key);

    /// <summary>
 /// Gets cache statistics
      /// </summary>
 /// <returns>Cache statistics object</returns>
   CacheStatistics GetStatistics();
    }

    /// <summary>
    /// Cache statistics model
    /// </summary>
    public class CacheStatistics
    {
        public int TotalEntries { get; set; }
        public long EstimatedSize { get; set; }
        public int HitCount { get; set; }
public int MissCount { get; set; }
        public double HitRate => TotalRequests > 0 ? (double)HitCount / TotalRequests : 0;
        public int TotalRequests => HitCount + MissCount;
    }
}
