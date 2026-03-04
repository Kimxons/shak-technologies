using System.Diagnostics;

namespace kairo_ui.Services.Caching
{
 /// <summary>
    /// Tracks cache metrics for monitoring and diagnostics
    /// </summary>
    public class CacheMetrics
    {
        private long _hits = 0;
        private long _misses = 0;
        private long _sets = 0;
        private long _removes = 0;
 private long _evictions = 0;
 private long _errors = 0;
        private long _totalResponseTimeMs = 0;
  private long _operationCount = 0;

 public DateTime StartTime { get; } = DateTime.UtcNow;

        /// <summary>
        /// Total number of cache hits
 /// </summary>
        public long Hits => Interlocked.Read(ref _hits);

        /// <summary>
     /// Total number of cache misses
   /// </summary>
  public long Misses => Interlocked.Read(ref _misses);

 /// <summary>
        /// Total number of items set in cache
   /// </summary>
        public long Sets => Interlocked.Read(ref _sets);

      /// <summary>
     /// Total number of items removed from cache
     /// </summary>
   public long Removes => Interlocked.Read(ref _removes);

     /// <summary>
     /// Total number of cache evictions
/// </summary>
        public long Evictions => Interlocked.Read(ref _evictions);

        /// <summary>
        /// Total number of cache errors
        /// </summary>
        public long Errors => Interlocked.Read(ref _errors);

     /// <summary>
     /// Total cache requests (hits + misses)
        /// </summary>
        public long TotalRequests => Hits + Misses;

    /// <summary>
        /// Cache hit rate (0.0 to 1.0)
        /// </summary>
        public double HitRate => TotalRequests > 0 ? (double)Hits / TotalRequests : 0;

        /// <summary>
      /// Average response time in milliseconds
        /// </summary>
 public double AverageResponseTimeMs => _operationCount > 0 
         ? (double)Interlocked.Read(ref _totalResponseTimeMs) / Interlocked.Read(ref _operationCount)
            : 0;

 /// <summary>
/// Uptime since metrics started
   /// </summary>
 public TimeSpan Uptime => DateTime.UtcNow - StartTime;

   public void RecordHit()
        {
 Interlocked.Increment(ref _hits);
    }

        public void RecordMiss()
    {
            Interlocked.Increment(ref _misses);
     }

        public void RecordSet()
    {
         Interlocked.Increment(ref _sets);
        }

      public void RecordRemove()
        {
          Interlocked.Increment(ref _removes);
        }

    public void RecordEviction()
   {
  Interlocked.Increment(ref _evictions);
      }

        public void RecordError()
        {
            Interlocked.Increment(ref _errors);
        }

        public void RecordResponseTime(long milliseconds)
        {
       Interlocked.Add(ref _totalResponseTimeMs, milliseconds);
      Interlocked.Increment(ref _operationCount);
      }

   /// <summary>
        /// Resets all metrics
 /// </summary>
  public void Reset()
        {
      Interlocked.Exchange(ref _hits, 0);
      Interlocked.Exchange(ref _misses, 0);
Interlocked.Exchange(ref _sets, 0);
      Interlocked.Exchange(ref _removes, 0);
    Interlocked.Exchange(ref _evictions, 0);
 Interlocked.Exchange(ref _errors, 0);
       Interlocked.Exchange(ref _totalResponseTimeMs, 0);
   Interlocked.Exchange(ref _operationCount, 0);
        }

        /// <summary>
        /// Gets a snapshot of current metrics
        /// </summary>
        public CacheMetricsSnapshot GetSnapshot()
   {
  return new CacheMetricsSnapshot
      {
     Hits = this.Hits,
         Misses = this.Misses,
    Sets = this.Sets,
     Removes = this.Removes,
         Evictions = this.Evictions,
     Errors = this.Errors,
       TotalRequests = this.TotalRequests,
      HitRate = this.HitRate,
        AverageResponseTimeMs = this.AverageResponseTimeMs,
     Uptime = this.Uptime,
      Timestamp = DateTime.UtcNow
 };
  }
    }

    /// <summary>
    /// Immutable snapshot of cache metrics at a point in time
    /// </summary>
    public class CacheMetricsSnapshot
    {
        public long Hits { get; init; }
     public long Misses { get; init; }
        public long Sets { get; init; }
        public long Removes { get; init; }
        public long Evictions { get; init; }
        public long Errors { get; init; }
      public long TotalRequests { get; init; }
 public double HitRate { get; init; }
        public double AverageResponseTimeMs { get; init; }
      public TimeSpan Uptime { get; init; }
   public DateTime Timestamp { get; init; }
    }

    /// <summary>
    /// Stopwatch wrapper for measuring cache operation timing
  /// </summary>
    public class CacheStopwatch : IDisposable
    {
   private readonly Stopwatch _stopwatch;
        private readonly CacheMetrics _metrics;

   public CacheStopwatch(CacheMetrics metrics)
        {
   _metrics = metrics;
            _stopwatch = Stopwatch.StartNew();
        }

        public void Dispose()
     {
            _stopwatch.Stop();
      _metrics.RecordResponseTime(_stopwatch.ElapsedMilliseconds);
    }
 }
}
