# Production-Ready Caching Architecture - KAIRO UI

## Overview

The KAIRO UI application now implements a **production-ready, multi-tier caching architecture** designed for high performance, scalability, and resilience. This architecture provides:

- **Multi-Layer Caching**: L1 (in-memory) + L2 (distributed/Redis)
- **Circuit Breaker Pattern**: Automatic fallback when distributed cache fails
- **Compression**: Reduces memory and network overhead for large objects
- **Metrics & Monitoring**: Comprehensive cache performance tracking
- **Cache Warming**: Pre-loads frequently accessed data on startup
- **Flexible Policies**: Configurable expiration and priority strategies
- **Backward Compatibility**: Existing code continues to work without changes

---

## Architecture

```
???????????????????????????????????????????????????????????????
?   Application Layer            ?
?  (Controllers, Services using ICachingRepository)    ?
???????????????????????????????????????????????????????????????
            ?
     ?
???????????????????????????????????????????????????????????????
?   ProductionCachingRepository       ?
?  ?? Backward compatible with ICachingRepository       ?
?  ?? Adds new policy-based methods  ?
?  ?? Delegates to HybridCacheService              ?
???????????????????????????????????????????????????????????????
      ?
      ?
???????????????????????????????????????????????????????????????
?     HybridCacheService (L1 + L2)       ?
?  ?? L1: IMemoryCache (fast, local)       ?
?  ?? L2: DistributedCacheService (shared, persistent)      ?
?  ?? Automatic promotion (L2 ? L1)      ?
?  ?? Key tracking & metrics                 ?
???????????????????????????????????????????????????????????????
         ?
        ?????????????????????
        ?         ?
????????????????    ????????????????????????
? MemoryCache  ?    ? DistributedCache     ?
? (L1 - Fast)  ?    ? (L2 - Shared)  ?
?  ?    ?  ?? Redis (prod)     ?
? • 512MB    ?    ?  ?? In-Memory (dev)  ?
? • Sub-ms     ?    ?  ?? Circuit Breaker  ?
????????????????    ????????????????????????
```

---

## Key Components

### 1. **CacheOptions** (`Services/Caching/CacheOptions.cs`)
Configuration class for all caching behaviors:

```csharp
{
  "Cache": {
    "EnableDistributedCache": false,     // Enable Redis (L2 cache)
    "RedisConnectionString": "localhost:6379",
    "RedisInstanceName": "KAIRO:",
    "EnableMemoryCache": true,      // Enable L1 cache
    "MemoryCacheSizeLimitMB": 512,          // L1 size limit
    "EnableCompression": true,   // Compress large objects
    "CompressionThresholdBytes": 1024,      // Compress if > 1KB
    "EnableCircuitBreaker": true,  // Auto-fallback on failures
    "CircuitBreakerThreshold": 3,           // Failures before opening
    "CircuitBreakerDurationSeconds": 30,    // Retry after 30s
    "EnableCacheWarming": false, // Pre-load on startup
    "EnableMetrics": true,    // Track performance
    "EnableKeyTracking": true,   // Enable pattern removal
    "DefaultExpirationMinutes": 60
  }
}
```

### 2. **CachePolicy** (`Services/Caching/CachePolicy.cs`)
Defines caching behavior for different data types:

```csharp
// Predefined policies
CachePolicy.Short       // 5 min - frequently changing data
CachePolicy.Medium      // 30 min - moderately stable data
CachePolicy.Long   // 2 hours - stable reference data
CachePolicy.VeryLong    // 24 hours - rarely changing data
CachePolicy.Sliding     // 30 min sliding - session data
CachePolicy.Never     // Permanent - use with caution

// Custom policy
var policy = new CachePolicy
{
    AbsoluteExpiration = TimeSpan.FromMinutes(60),
    Priority = CachePriority.High,
    UseDistributedCache = true,
    UseMemoryCache = true,
    EnableCompression = true
};
```

### 3. **HybridCacheService** (`Services/Caching/HybridCacheService.cs`)
Core service managing L1 (memory) and L2 (distributed) cache layers:

- **Read Flow**: L1 ? L2 ? Miss
- **Write Flow**: L1 + L2 (based on policy)
- **Promotion**: L2 hits are promoted to L1 automatically
- **Circuit Breaker**: Bypasses L2 when unhealthy

### 4. **CacheMetrics** (`Services/Caching/CacheMetrics.cs`)
Tracks cache performance:

- Hit/Miss counts and rates
- Average response times
- Evictions and errors
- Uptime statistics

### 5. **CacheCircuitBreaker** (`Services/Caching/CacheCircuitBreaker.cs`)
Implements circuit breaker pattern:

- **Closed**: Normal operation
- **Open**: Distributed cache bypassed (failures detected)
- **Half-Open**: Testing recovery

### 6. **CacheWarmingService** (`Services/CacheWarmingService.cs`)
Background service that pre-loads frequently accessed data:

- Runs 5 seconds after application startup
- Warms system codes and reference data
- Improves initial response times

---

## Usage Guide

### Basic Usage (Backward Compatible)

Existing code continues to work without changes:

```csharp
public class MyController
{
    private readonly ICachingRepository _cache;
    
    // Existing code works as before
    public async Task<IActionResult> GetData()
    {
        var cacheKey = "my-data";
        
        // Method 1: Simple get/set
        var data = _cache.Get<MyData>(cacheKey);
      if (data == null)
        {
   data = await FetchFromDatabase();
 _cache.Set(cacheKey, data, 30); // 30 minutes
        }
      
    // Method 2: Get or create
      var data2 = await _cache.GetOrCreateAsync(cacheKey, async () =>
        {
       return await FetchFromDatabase();
        }, 30);
        
     return Ok(data2);
 }
}
```

### Advanced Usage (New Features)

Use the new `IProductionCachingRepository` for advanced features:

```csharp
public class MyController
{
    private readonly IProductionCachingRepository _cache;
 
    public async Task<IActionResult> GetDataWithPolicy()
    {
        // Use predefined policies from CachingConstants
        var systemCodes = await _cache.GetOrCreateAsync(
       CachingConstants.GetSystemCodeOptionsKey("ClientTypeID"),
   async () => await FetchSystemCodes(),
            CachingConstants.SystemCodesPolicy); // Long-lived, high priority, compressed
        
     // Use custom policy
      var customPolicy = new CachePolicy
        {
 AbsoluteExpiration = TimeSpan.FromHours(1),
    Priority = CachePriority.High,
   UseDistributedCache = true,
            EnableCompression = true
        };
        
        var data = await _cache.GetOrCreateAsync(
            "custom-data",
   async () => await FetchData(),
 customPolicy);
        
        return Ok(data);
    }
    
    // Bulk operations
    public async Task<IActionResult> GetMultipleItems()
    {
   var keys = new[] { "key1", "key2", "key3" };
     var items = await _cache.GetBulkAsync<MyData>(keys);
 return Ok(items);
    }
}
```

### Using Policies from CachingConstants

The `CachingConstants` class now includes predefined policies:

```csharp
// System codes - long-lived, distributed, compressed
await _cache.SetAsync(key, value, CachingConstants.SystemCodesPolicy);

// User sessions - sliding expiration
await _cache.SetAsync(key, value, CachingConstants.UserSessionPolicy);

// Recent activities - short-lived, memory only
await _cache.SetAsync(key, value, CachingConstants.RecentActivitiesPolicy);

// Search results - medium-lived with sliding
await _cache.SetAsync(key, value, CachingConstants.SearchResultsPolicy);

// Dashboard metrics - very short-lived
await _cache.SetAsync(key, value, CachingConstants.DashboardMetricsPolicy);

// Module structure - long-lived
await _cache.SetAsync(key, value, CachingConstants.ModuleStructurePolicy);

// Theme settings - medium-lived
await _cache.SetAsync(key, value, CachingConstants.ThemePolicy);

// Lookup/reference data - long-lived, compressed
await _cache.SetAsync(key, value, CachingConstants.LookupDataPolicy);
```

---

## Cache Management API

Administrative endpoints for monitoring and management:

### Get Cache Metrics
```http
GET /api/admin/cache/metrics

Response:
{
  "success": true,
  "metrics": {
    "hits": 1523,
    "misses": 247,
    "totalRequests": 1770,
    "hitRate": "86.05%",
    "sets": 312,
    "removes": 45,
    "evictions": 23,
    "errors": 2,
    "averageResponseTimeMs": 2.3,
    "uptime": "02.14:32:15",
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "circuitBreaker": {
    "state": "Closed",
    "isHealthy": true
  }
}
```

### Get All Cache Keys
```http
GET /api/admin/cache/keys?pattern=SYSCODES:*

Response:
{
  "success": true,
  "count": 25,
  "keys": ["SYSCODES:ClientTypeID", "SYSCODES:GenderID", ...]
}
```

### Clear All Cache
```http
POST /api/admin/cache/clear

Response:
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

### Remove by Pattern
```http
POST /api/admin/cache/remove-pattern
Content-Type: application/json

{
  "pattern": "USER:*"
}

Response:
{
  "success": true,
  "message": "Cache entries matching 'USER:*' removed"
}
```

### Reset Circuit Breaker
```http
POST /api/admin/cache/circuit-breaker/reset

Response:
{
  "success": true,
  "message": "Circuit breaker reset successfully"
}
```

### Warm Cache
```http
POST /api/admin/cache/warm

Response:
{
  "success": true,
  "message": "Cache warming completed"
}
```

### Health Check
```http
GET /api/admin/cache/health

Response:
{
  "success": true,
  "healthy": true,
  "status": "Healthy",
  "circuitBreaker": "Closed",
  "errors": 0,
  "hitRate": 0.86
}
```

---

## Configuration Guide

### Development Environment

```json
{
  "Cache": {
    "EnableDistributedCache": false,      // Memory-only for dev
    "EnableMemoryCache": true,
    "MemoryCacheSizeLimitMB": 256,       // Smaller for dev
    "EnableCompression": false,           // Disable for debugging
    "EnableCacheWarming": false,          // Faster startup
    "EnableMetrics": true
  }
}
```

### Production Environment

```json
{
  "Cache": {
"EnableDistributedCache": true,       // Enable Redis
    "RedisConnectionString": "redis-server:6379,password=xxx,ssl=true,abortConnect=false",
    "RedisInstanceName": "KAIRO:PROD:",
    "EnableMemoryCache": true,
    "MemoryCacheSizeLimitMB": 512,       // Larger for production
  "EnableCompression": true, // Save memory/network
    "CompressionThresholdBytes": 1024,
    "EnableCircuitBreaker": true,
    "CircuitBreakerThreshold": 3,
    "CircuitBreakerDurationSeconds": 30,
    "EnableCacheWarming": true,           // Pre-load data
    "EnableMetrics": true,
 "EnableKeyTracking": true
  }
}
```

---

## Migration from Legacy Cache

The new system is **100% backward compatible**. No code changes required!

### Before (Legacy)
```csharp
var cache = serviceProvider.GetService<ICachingRepository>();
cache.Set("key", value, 60);
var data = cache.Get<MyData>("key");
```

### After (Same Code Works!)
```csharp
var cache = serviceProvider.GetService<ICachingRepository>();
cache.Set("key", value, 60);  // Still works!
var data = cache.Get<MyData>("key");  // Still works!
```

### Upgrade to New Features (Optional)
```csharp
var cache = serviceProvider.GetService<IProductionCachingRepository>();

// Use policies for better control
await cache.SetAsync("key", value, CachePolicy.Long);

// Get metrics
var metrics = cache.GetDetailedMetrics();
Console.WriteLine($"Hit rate: {metrics.HitRate:P2}");

// Bulk operations
var items = await cache.GetBulkAsync<MyData>(keys);
```

---

## Performance Characteristics

### Memory Cache (L1)
- **Latency**: < 1ms (microseconds)
- **Throughput**: Millions of ops/sec
- **Scope**: Single application instance
- **Persistence**: None (lost on restart)

### Distributed Cache (L2 - Redis)
- **Latency**: 1-5ms (local network)
- **Throughput**: 100K+ ops/sec
- **Scope**: Shared across all instances
- **Persistence**: Optional (RDB/AOF)

### Circuit Breaker
- **Failure Detection**: 3 failures trigger open
- **Recovery Test**: After 30 seconds
- **Fallback**: L1-only mode (graceful degradation)

### Compression
- **Algorithm**: GZip (fast compression)
- **Threshold**: 1KB+ objects
- **Ratio**: 60-80% size reduction (typical)

---

## Cache Policies Reference

### Predefined Policies in CachingConstants

| Policy | Expiration | Priority | L1 | L2 | Compress | Use Case |
|--------|-----------|----------|----|----|----------|----------|
| `SystemCodesPolicy` | 4 hours | High | ? | ? | ? | System codes, rarely change |
| `UserSessionPolicy` | 30 min sliding | High | ? | ? | ? | User session data |
| `RecentActivitiesPolicy` | 10 min sliding | Normal | ? | ? | ? | Recent activities |
| `SearchResultsPolicy` | 15 min sliding | Low | ? | ? | ? | Search results |
| `DashboardMetricsPolicy` | 5 min | Normal | ? | ? | ? | Real-time metrics |
| `ModuleStructurePolicy` | 1 hour | High | ? | ? | ? | Module/menu structure |
| `ThemePolicy` | 1 hour | Normal | ? | ? | ? | Theme settings |
| `LookupDataPolicy` | 2 hours | High | ? | ? | ? | Lookup/reference data |

### Standard Policies

| Policy | Expiration | Priority | L1 | L2 | Use Case |
|--------|-----------|----------|----|----|----------|
| `CachePolicy.Short` | 5 min | Low | ? | ? | Frequently changing |
| `CachePolicy.Medium` | 30 min | Normal | ? | ? | Moderately stable |
| `CachePolicy.Long` | 2 hours | High | ? | ? | Stable reference |
| `CachePolicy.VeryLong` | 24 hours | High | ? | ? | Rarely changing |
| `CachePolicy.Sliding` | 30 min sliding | High | ? | ? | Session-like data |
| `CachePolicy.Never` | None | NeverRemove | ? | ? | Permanent (caution!) |

---

## Monitoring & Diagnostics

### View Cache Metrics
Access the cache management API to view real-time metrics:

```bash
curl http://localhost:5005/api/admin/cache/metrics
```

### Key Metrics to Monitor

1. **Hit Rate**: Should be > 80% in production
2. **Average Response Time**: Should be < 5ms
3. **Error Count**: Should be near zero
4. **Circuit Breaker State**: Should be "Closed"

### Logging

All cache operations are logged with structured logging:

```
[Cache] HIT: SYSCODES:ClientTypeID | Type: List`1
[Cache] MISS: USER:12345 | Type: UserSession
[Cache] SET: MODULE:MAIN_MODULES | Type: List`1 | Size: 15KB | Compressed: True
[Cache] EVICTED: SEARCH:temp123 | Reason: Expired
```

Log levels:
- **Debug**: Cache hits/misses, operations
- **Information**: Cache warming, bulk operations
- **Warning**: Circuit breaker events, null values
- **Error**: Exceptions, failures

---

## Best Practices

### 1. **Choose the Right Policy**

```csharp
// ? Good: Use specific policy for data type
var modules = await _cache.GetOrCreateAsync(
    CachingConstants.MAIN_MODULES,
    async () => await _apiService.GetAsync(...),
    CachingConstants.ModuleStructurePolicy);

// ? Bad: Generic expiration without consideration
var modules = await _cache.GetOrCreateAsync(
    "modules",
    async () => await _apiService.GetAsync(...),
    60); // No policy context
```

### 2. **Use Appropriate Keys**

```csharp
// ? Good: Structured, namespaced keys
var key = CachingConstants.GetRecentActivitiesKey(operatorId, moduleId);
// Result: "RECENT_ACT:OP123:MODULE:5"

// ? Bad: Unstructured keys
var key = $"activities-{operatorId}-{moduleId}";
```

### 3. **Handle Cache Misses Gracefully**

```csharp
// ? Good: GetOrCreate pattern
var data = await _cache.GetOrCreateAsync(key, async () =>
{
    return await _apiService.GetAsync(...);
}, CachePolicy.Medium);

// ?? Acceptable: Manual get/set
var data = await _cache.GetAsync<MyData>(key);
if (data == null)
{
    data = await _apiService.GetAsync(...);
    await _cache.SetAsync(key, data, CachePolicy.Medium);
}
```

### 4. **Invalidate on Updates**

```csharp
// After updating data, invalidate related cache entries
await _repository.UpdateClient(clientId, clientData);

// Invalidate specific entry
await _cache.RemoveAsync($"CLIENT:{clientId}");

// Invalidate pattern
await _cache.RemoveByPatternAsync($"CLIENT:{clientId}:*");
```

### 5. **Use Bulk Operations When Possible**

```csharp
// ? Good: Bulk get
var keys = clients.Select(c => $"CLIENT:{c.Id}");
var cachedClients = await _cache.GetBulkAsync<Client>(keys);

// ? Bad: Sequential gets
foreach (var client in clients)
{
    var cached = await _cache.GetAsync<Client>($"CLIENT:{client.Id}");
}
```

---

## Enabling Redis (Production)

### Step 1: Install Package

```bash
cd kairo-ui
dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
```

### Step 2: Update Program.cs

Uncomment the Redis configuration in `Program.cs`:

```csharp
if (cacheOptions.EnableDistributedCache && !string.IsNullOrWhiteSpace(cacheOptions.RedisConnectionString))
{
    builder.Services.AddStackExchangeRedisCache(options =>
{
        options.Configuration = cacheOptions.RedisConnectionString;
        options.InstanceName = cacheOptions.RedisInstanceName;
    });
}
```

### Step 3: Configure Redis Connection

Update `appsettings.json` or `appsettings.Production.json`:

```json
{
"Cache": {
    "EnableDistributedCache": true,
    "RedisConnectionString": "your-redis-server:6379,password=your-password,ssl=true,abortConnect=false",
    "RedisInstanceName": "KAIRO:PROD:"
  }
}
```

### Step 4: Test Connection

The cache will automatically test Redis connection on startup. Check logs for:

```
[Program] Redis distributed cache configured: KAIRO:PROD:
[HybridCache] Initialized | Memory: True | Distributed: True | CircuitBreaker: True
```

---

## Troubleshooting

### Issue: High Miss Rate

**Symptoms**: Hit rate < 50%
**Causes**:
- Expiration times too short
- Keys not normalized (typos, case differences)
- Cache clearing too frequent

**Solutions**:
- Review expiration policies
- Use constants for keys
- Check for unnecessary `RemoveByPattern` calls

### Issue: Circuit Breaker Opening Frequently

**Symptoms**: Logs show "Circuit breaker is open"
**Causes**:
- Redis connection issues
- Network latency
- Redis server overloaded

**Solutions**:
- Check Redis server health
- Review circuit breaker threshold (increase if needed)
- Check network connectivity
- Review Redis logs

### Issue: High Memory Usage

**Symptoms**: Application memory growing
**Causes**:
- MemoryCacheSizeLimitMB too large
- Large objects not compressed
- Key tracking overhead

**Solutions**:
- Reduce `MemoryCacheSizeLimitMB`
- Enable compression for large objects
- Disable key tracking if not needed
- Use distributed cache for large datasets

### Issue: Slow Cache Operations

**Symptoms**: `averageResponseTimeMs` > 10ms
**Causes**:
- Distributed cache latency
- Large objects being serialized
- Network issues

**Solutions**:
- Enable compression
- Use memory-only for hot data
- Check Redis/network performance
- Review object sizes

---

## Performance Tips

### 1. **Layering Strategy**

```csharp
// Hot data (accessed every request): L1 only
await _cache.SetAsync(key, value, new CachePolicy
{
    AbsoluteExpiration = TimeSpan.FromMinutes(5),
    UseMemoryCache = true,
    UseDistributedCache = false  // Skip L2 overhead
});

// Warm data (shared across instances): L1 + L2
await _cache.SetAsync(key, value, new CachePolicy
{
    AbsoluteExpiration = TimeSpan.FromHours(1),
    UseMemoryCache = true,
    UseDistributedCache = true
});

// Cold data (rarely accessed): L2 only
await _cache.SetAsync(key, value, new CachePolicy
{
    AbsoluteExpiration = TimeSpan.FromHours(24),
    UseMemoryCache = false,  // Don't pollute L1
    UseDistributedCache = true
});
```

### 2. **Compression Strategy**

```csharp
// Small objects (< 1KB): No compression
var policy = new CachePolicy
{
    EnableCompression = false
};

// Large objects (> 1KB): Compress
var policy = new CachePolicy
{
    EnableCompression = true
};

// Adjust threshold in config if needed
```

### 3. **Key Design**

```csharp
// ? Good: Hierarchical, predictable
"SYSCODES:ClientTypeID"
"USER:12345:SESSION"
"MODULE:5:SUBMODULES"
"SEARCH:TABLE123:abc123"

// ? Bad: Flat, unpredictable
"clientTypes"
"userSession12345"
"moduleData5"
```

---

## Testing Cache Behavior

### Unit Tests

```csharp
[Fact]
public async Task Cache_Should_Return_Cached_Value()
{
    // Arrange
 var cache = GetCacheService();
    var key = "test-key";
    var value = "test-value";
    
    // Act
    await cache.SetAsync(key, value, CachePolicy.Short);
    var result = await cache.GetAsync<string>(key);
  
    // Assert
    Assert.Equal(value, result);
}

[Fact]
public async Task Cache_Should_Handle_Miss()
{
    // Arrange
    var cache = GetCacheService();
    var key = "non-existent-key";
    
    // Act
 var result = await cache.GetAsync<string>(key);
  
    // Assert
    Assert.Null(result);
}
```

### Integration Tests

```csharp
[Fact]
public async Task HybridCache_Should_Promote_L2_To_L1()
{
    // Set in L2 only
    await _distributedCache.SetAsync(key, value, policy);
    
    // Get should promote to L1
    var result = await _hybridCache.GetAsync<string>(key);
    
    // Verify L1 now has it
    var memoryHit = _memoryCache.TryGetValue(key, out var _);
    Assert.True(memoryHit);
}
```

---

## Roadmap

### Future Enhancements

1. **Redis Cluster Support**: Horizontal scaling
2. **Cache Tagging**: Group related entries for bulk invalidation
3. **Lazy Refresh**: Background refresh before expiration
4. **Adaptive TTL**: Auto-adjust expiration based on access patterns
5. **Multi-Region Replication**: Geo-distributed caching
6. **Cache Events**: Pub/sub for invalidation across instances
7. **Advanced Metrics**: Percentile latencies, size distribution
8. **Cache Dashboard**: Web UI for monitoring

---

## FAQ

### Q: Do I need Redis?
**A**: No. The system works great with memory-only caching. Redis is recommended for:
- Multi-instance deployments (load balancing)
- Large datasets (> 1GB)
- Data persistence requirements
- Cross-server cache sharing

### Q: Will my existing code break?
**A**: No. The new system is 100% backward compatible with `ICachingRepository`.

### Q: How do I monitor cache performance?
**A**: Use the `/api/admin/cache/metrics` endpoint or check application logs.

### Q: What happens if Redis goes down?
**A**: The circuit breaker automatically opens, and the system falls back to L1 (memory) cache. No errors are thrown to the application.

### Q: How much memory will caching use?
**A**: Configured via `MemoryCacheSizeLimitMB` (default 512MB). The cache automatically evicts entries when this limit is reached.

### Q: Can I disable caching entirely?
**A**: Yes, but not recommended. Set very low expiration times or disable via config:
```json
{
  "Cache": {
    "EnableMemoryCache": false,
    "EnableDistributedCache": false
  }
}
```

### Q: How do I clear cache in production?
**A**: Use the admin API:
```bash
curl -X POST http://your-server/api/admin/cache/clear
```

---

## Support

For issues or questions:
1. Check application logs (`logs/kairo-ui-*.txt`)
2. Check cache metrics (`/api/admin/cache/metrics`)
3. Review circuit breaker state (`/api/admin/cache/health`)
4. Contact development team with logs and metrics

---

## Summary

The new production-ready caching architecture provides:

? **Performance**: Sub-millisecond response times  
? **Scalability**: Multi-tier architecture supports growth  
? **Resilience**: Circuit breaker prevents cascading failures  
? **Observability**: Comprehensive metrics and logging  
? **Flexibility**: Policy-based configuration  
? **Compatibility**: Zero-impact migration from legacy code  

The system is production-ready and can scale from single-server deployments to multi-region clusters.
