namespace kairo_ui.Services.Caching
{
    /// <summary>
    /// Configuration options for the caching system
    /// </summary>
    public class CacheOptions
    {
        /// <summary>
        /// Connection string for Redis distributed cache
        /// </summary>
   public string? RedisConnectionString { get; set; }

        /// <summary>
        /// Instance name prefix for Redis keys
        /// </summary>
        public string RedisInstanceName { get; set; } = "KAIRO:";

        /// <summary>
        /// Enable distributed caching (Redis)
   /// </summary>
        public bool EnableDistributedCache { get; set; } = false;

        /// <summary>
        /// Enable L1 (in-memory) caching layer
        /// </summary>
        public bool EnableMemoryCache { get; set; } = true;

        /// <summary>
        /// Maximum size of in-memory cache in MB
        /// </summary>
        public int MemoryCacheSizeLimitMB { get; set; } = 512;

  /// <summary>
    /// Enable cache compression for large objects
        /// </summary>
        public bool EnableCompression { get; set; } = true;

        /// <summary>
        /// Minimum size in bytes for compression to be applied
      /// </summary>
        public int CompressionThresholdBytes { get; set; } = 1024;

      /// <summary>
        /// Timeout for distributed cache operations in milliseconds
        /// </summary>
        public int DistributedCacheTimeoutMs { get; set; } = 1000;

        /// <summary>
        /// Enable circuit breaker for distributed cache failures
        /// </summary>
        public bool EnableCircuitBreaker { get; set; } = true;

    /// <summary>
        /// Number of failures before circuit opens
/// </summary>
        public int CircuitBreakerThreshold { get; set; } = 3;

 /// <summary>
        /// Time in seconds before circuit breaker attempts retry
        /// </summary>
        public int CircuitBreakerDurationSeconds { get; set; } = 30;

        /// <summary>
/// Enable cache warming on application startup
        /// </summary>
        public bool EnableCacheWarming { get; set; } = false;

    /// <summary>
 /// Enable detailed cache metrics and monitoring
        /// </summary>
  public bool EnableMetrics { get; set; } = true;

        /// <summary>
        /// Enable cache key tracking (needed for pattern-based removal)
        /// </summary>
        public bool EnableKeyTracking { get; set; } = true;

        /// <summary>
        /// Default absolute expiration in minutes (if not specified)
        /// </summary>
   public int DefaultExpirationMinutes { get; set; } = 60;
    }
}
