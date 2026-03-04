namespace kairo_ui.Services.Caching
{
    /// <summary>
    /// Defines caching policy for different data types
    /// </summary>
    public class CachePolicy
    {
        /// <summary>
        /// Absolute expiration time (overrides sliding if both set)
        /// </summary>
        public TimeSpan? AbsoluteExpiration { get; set; }

        /// <summary>
     /// Sliding expiration time (resets on access)
        /// </summary>
    public TimeSpan? SlidingExpiration { get; set; }

        /// <summary>
        /// Priority for cache entry (affects eviction)
        /// </summary>
        public CachePriority Priority { get; set; } = CachePriority.Normal;

        /// <summary>
     /// Whether to cache in distributed layer (Redis)
        /// </summary>
        public bool UseDistributedCache { get; set; } = true;

        /// <summary>
        /// Whether to cache in memory layer (L1)
     /// </summary>
  public bool UseMemoryCache { get; set; } = true;

        /// <summary>
   /// Whether to compress the cached data
        /// </summary>
     public bool EnableCompression { get; set; } = false;

     /// <summary>
        /// Callback to execute when entry is evicted
    /// </summary>
        public Action<string, object?, EvictionReason>? EvictionCallback { get; set; }

        // Predefined policies for common scenarios
        
        /// <summary>
 /// Short-lived cache (5 minutes) - for frequently changing data
        /// </summary>
        public static CachePolicy Short => new()
        {
     AbsoluteExpiration = TimeSpan.FromMinutes(5),
            Priority = CachePriority.Low,
            UseDistributedCache = false,
 UseMemoryCache = true
        };

        /// <summary>
        /// Medium-lived cache (30 minutes) - for moderately stable data
        /// </summary>
        public static CachePolicy Medium => new()
        {
          AbsoluteExpiration = TimeSpan.FromMinutes(30),
          Priority = CachePriority.Normal,
         UseDistributedCache = true,
     UseMemoryCache = true
        };

 /// <summary>
        /// Long-lived cache (2 hours) - for stable reference data
        /// </summary>
        public static CachePolicy Long => new()
        {
AbsoluteExpiration = TimeSpan.FromHours(2),
       Priority = CachePriority.High,
            UseDistributedCache = true,
        UseMemoryCache = true,
            EnableCompression = true
        };

        /// <summary>
     /// Very long-lived cache (24 hours) - for rarely changing data
   /// </summary>
        public static CachePolicy VeryLong => new()
        {
          AbsoluteExpiration = TimeSpan.FromHours(24),
            Priority = CachePriority.High,
         UseDistributedCache = true,
            UseMemoryCache = true,
            EnableCompression = true
    };

        /// <summary>
        /// Sliding cache (resets on access) - for user session data
 /// </summary>
        public static CachePolicy Sliding => new()
        {
       SlidingExpiration = TimeSpan.FromMinutes(30),
        Priority = CachePriority.High,
      UseDistributedCache = true,
          UseMemoryCache = true
      };

 /// <summary>
        /// Never expires (use with caution)
      /// </summary>
        public static CachePolicy Never => new()
      {
     Priority = CachePriority.NeverRemove,
            UseDistributedCache = true,
      UseMemoryCache = true
        };
    }

 /// <summary>
    /// Cache priority levels
    /// </summary>
    public enum CachePriority
    {
        Low = 0,
    Normal = 1,
        High = 2,
        NeverRemove = 3
    }

    /// <summary>
  /// Reasons for cache eviction
    /// </summary>
    public enum EvictionReason
    {
    None = 0,
        Removed = 1,
        Replaced = 2,
        Expired = 3,
   TokenExpired = 4,
     Capacity = 5
    }
}
