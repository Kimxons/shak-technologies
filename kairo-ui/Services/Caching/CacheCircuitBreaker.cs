using System.Collections.Concurrent;

namespace kairo_ui.Services.Caching
{
    /// <summary>
 /// Circuit breaker pattern implementation for distributed cache failures
    /// Prevents cascading failures by temporarily disabling distributed cache after repeated errors
  /// </summary>
 public class CacheCircuitBreaker
    {
   private readonly int _threshold;
        private readonly TimeSpan _duration;
 private readonly ConcurrentDictionary<string, CircuitState> _circuits = new();

        public CacheCircuitBreaker(int threshold, TimeSpan duration)
   {
   _threshold = threshold;
            _duration = duration;
    }

        /// <summary>
  /// Checks if the circuit is open (cache unavailable)
     /// </summary>
   public bool IsOpen(string operationName = "default")
   {
            if (!_circuits.TryGetValue(operationName, out var state))
            {
      return false;
      }

   // Check if circuit should be reset
          if (state.State == CircuitBreakerState.Open && 
    DateTime.UtcNow >= state.OpenedAt.Add(_duration))
     {
         // Half-open: allow one request through to test
    state.State = CircuitBreakerState.HalfOpen;
  }

       return state.State == CircuitBreakerState.Open;
        }

 /// <summary>
   /// Records a successful operation
   /// </summary>
        public void RecordSuccess(string operationName = "default")
        {
       var state = _circuits.GetOrAdd(operationName, _ => new CircuitState());
            
   lock (state.Lock)
 {
    state.FailureCount = 0;
   state.State = CircuitBreakerState.Closed;
  }
        }

     /// <summary>
        /// Records a failed operation
 /// </summary>
        public void RecordFailure(string operationName = "default")
        {
       var state = _circuits.GetOrAdd(operationName, _ => new CircuitState());
         
       lock (state.Lock)
            {
          state.FailureCount++;
    
     if (state.FailureCount >= _threshold)
      {
            state.State = CircuitBreakerState.Open;
      state.OpenedAt = DateTime.UtcNow;
                }
      }
        }

   /// <summary>
        /// Gets the current state of the circuit breaker
  /// </summary>
  public CircuitBreakerState GetState(string operationName = "default")
        {
 if (!_circuits.TryGetValue(operationName, out var state))
   {
   return CircuitBreakerState.Closed;
        }

      return state.State;
        }

        /// <summary>
    /// Resets the circuit breaker
     /// </summary>
     public void Reset(string operationName = "default")
     {
      if (_circuits.TryGetValue(operationName, out var state))
            {
       lock (state.Lock)
 {
      state.FailureCount = 0;
      state.State = CircuitBreakerState.Closed;
 }
      }
  }

   /// <summary>
  /// Resets all circuit breakers
      /// </summary>
  public void ResetAll()
   {
  foreach (var state in _circuits.Values)
 {
       lock (state.Lock)
 {
             state.FailureCount = 0;
  state.State = CircuitBreakerState.Closed;
              }
            }
        }

        private class CircuitState
 {
 public int FailureCount { get; set; }
     public CircuitBreakerState State { get; set; } = CircuitBreakerState.Closed;
     public DateTime OpenedAt { get; set; }
 public object Lock { get; } = new();
 }
    }

    /// <summary>
    /// Circuit breaker states
    /// </summary>
    public enum CircuitBreakerState
    {
  /// <summary>Normal operation, cache is working</summary>
        Closed,
        /// <summary>Cache is unavailable, bypass distributed cache</summary>
        Open,
        /// <summary>Testing if cache has recovered</summary>
  HalfOpen
    }
}
