using kairo_ui.Services.Caching;
using Microsoft.Extensions.Hosting;

namespace kairo_ui.Services
{
    /// <summary>
    /// Background service that warms the cache on application startup
    /// Preloads commonly accessed data to improve initial response times
    /// </summary>
  public class CacheWarmingService : IHostedService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CacheWarmingService> _logger;
        private readonly CacheOptions _options;

    public CacheWarmingService(
    IServiceProvider serviceProvider,
            ILogger<CacheWarmingService> logger,
    CacheOptions options)
        {
  _serviceProvider = serviceProvider;
 _logger = logger;
    _options = options;
  }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
        if (!_options.EnableCacheWarming)
      {
            _logger.LogInformation("[CacheWarming] Cache warming is disabled");
       return;
            }

            _logger.LogInformation("[CacheWarming] Starting cache warming...");

            // Run warming in background to not block application startup
            _ = Task.Run(async () =>
     {
     try
      {
     // Wait a bit for application to fully start
     await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);

           await WarmCacheAsync(cancellationToken);
           }
      catch (Exception ex)
        {
           _logger.LogError(ex, "[CacheWarming] Error during cache warming");
        }
    }, cancellationToken);

       await Task.CompletedTask;
     }

    public Task StopAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("[CacheWarming] Cache warming service stopped");
     return Task.CompletedTask;
      }

        private async Task WarmCacheAsync(CancellationToken cancellationToken)
    {
            using var scope = _serviceProvider.CreateScope();
            
         try
{
        // Get caching service
    var cache = scope.ServiceProvider.GetService<IProductionCachingRepository>();
    if (cache == null)
       {
         _logger.LogWarning("[CacheWarming] Cache service not available");
     return;
 }

      _logger.LogInformation("[CacheWarming] Warming commonly accessed data...");

        // Warm system codes (these are accessed frequently)
       await WarmSystemCodesAsync(cache, cancellationToken);

        // Warm other commonly accessed data
       // Add more warming strategies as needed

                _logger.LogInformation("[CacheWarming] Cache warming completed successfully");
            }
    catch (Exception ex)
    {
    _logger.LogError(ex, "[CacheWarming] Error warming cache");
 }
     }

    private async Task WarmSystemCodesAsync(IProductionCachingRepository cache, CancellationToken cancellationToken)
{
      // List of commonly accessed system codes
  var systemCodesToWarm = new[]
  {
                "ClientTypeID",
         "TitleID",
    "GenderID",
      "MaritalStatusID",
     "CountryID",
         "CityID",
          "ProductTypeID",
      "AccountTypeID",
          "TransactionTypeID"
       };

            _logger.LogInformation("[CacheWarming] Warming {Count} system code types", systemCodesToWarm.Length);

            // In a real implementation, you would call the SystemCore API here
            // For now, this is a placeholder showing the pattern
     // Example:
            // var apiService = scope.ServiceProvider.GetService<IApiService>();
     // foreach (var codeId in systemCodesToWarm)
  // {
 //     var cacheKey = CachingConstants.GetSystemCodeOptionsKey(codeId);
          //     await cache.GetOrCreateAsync(cacheKey, async () =>
            //     {
   //         return await apiService.GetAsync<SystemCode>("SystemCoreApi", $"systemcodes/{codeId}");
    //     }, CachePolicy.Long, cancellationToken);
            // }

 await Task.CompletedTask;
   }
    }
}
