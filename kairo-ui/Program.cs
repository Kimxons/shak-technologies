using kairo_ui.Handlers;
using kairo_ui.Middleware;
using kairo_ui.Services;
using kairo_ui.Services.Caching;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc.Razor;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog
builder.Host.UseSerilog((context, configuration) =>
    configuration
        .ReadFrom.Configuration(context.Configuration)
      .Enrich.FromLogContext()
        .Enrich.WithProperty("Application", "KAIRO-UI")
        .WriteTo.Console()
        .WriteTo.File(
       path: "logs/kairo-ui-.txt",
            rollingInterval: RollingInterval.Day,
      retainedFileCountLimit: 30,
outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Properties} {Message:lj}{NewLine}{Exception}",
    shared: true));

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.Configure<RazorViewEngineOptions>(options =>
{
    options.ViewLocationFormats.Add("/Views/Identities/{1}/{0}.cshtml");
    options.ViewLocationFormats.Add("/Views/Shared/{1}/{0}.cshtml");
});

// ============================================================================
// CACHE CONFIGURATION (Production-Ready)
// ============================================================================

// Load cache configuration from appsettings
var cacheConfig = builder.Configuration.GetSection("Cache");
var cacheOptions = new CacheOptions();
cacheConfig.Bind(cacheOptions);
builder.Services.AddSingleton(cacheOptions);

// Register cache metrics singleton
builder.Services.AddSingleton<CacheMetrics>();

// Configure memory cache with size limit
builder.Services.AddMemoryCache(options =>
{
    options.SizeLimit = cacheOptions.MemoryCacheSizeLimitMB * 1024 * 1024; // Convert MB to bytes
    options.ExpirationScanFrequency = TimeSpan.FromMinutes(5); // Scan for expired entries every 5 minutes
});

// Configure distributed cache
if (cacheOptions.EnableDistributedCache && !string.IsNullOrWhiteSpace(cacheOptions.RedisConnectionString))
{
    // Note: To enable Redis, install the package first:
    // dotnet add package Microsoft.Extensions.Caching.StackExchangeRedis
    // Then uncomment and use this configuration:

    // builder.Services.AddStackExchangeRedisCache(options =>
    // {
    //     options.Configuration = cacheOptions.RedisConnectionString;
    //     options.InstanceName = cacheOptions.RedisInstanceName;
    // });

    // For now, use in-memory distributed cache as fallback
    builder.Services.AddDistributedMemoryCache();

    var cacheLogger = LoggerFactory.Create(config => config.AddConsole()).CreateLogger("Program");
    cacheLogger.LogWarning("Redis requested but using in-memory fallback. Install Microsoft.Extensions.Caching.StackExchangeRedis package for Redis support.");
}
else
{
    // Use in-memory distributed cache for development
    builder.Services.AddDistributedMemoryCache();
}

// Register distributed cache service
builder.Services.AddSingleton<DistributedCacheService>();

// Register hybrid cache service
builder.Services.AddSingleton<IHybridCacheService, HybridCacheService>();

// Register production caching repository (new implementation)
builder.Services.AddSingleton<IProductionCachingRepository, ProductionCachingRepository>();

// Keep backward compatibility - register legacy interface with same implementation
builder.Services.AddSingleton<ICachingRepository>(sp =>
    sp.GetRequiredService<IProductionCachingRepository>());

// Register cached API service (wraps API calls with caching)
builder.Services.AddScoped<IApiCachedService, ApiCachedService>();

// Register cache warming service if enabled
if (cacheOptions.EnableCacheWarming)
{
    builder.Services.AddHostedService<CacheWarmingService>();
}

var setupLogger = LoggerFactory.Create(config => config.AddConsole()).CreateLogger("Program");
setupLogger.LogInformation("Cache configured | Mode: {CacheMode} | MemorySize: {MemorySizeMB}MB | Distributed: {Distributed} | Warming: {Warming}",
    cacheOptions.EnableDistributedCache ? "Hybrid (L1+L2)" : "Memory-Only",
    cacheOptions.MemoryCacheSizeLimitMB,
    cacheOptions.EnableDistributedCache,
    cacheOptions.EnableCacheWarming);

// ============================================================================

// Get timeout configurations
var apiTimeoutSeconds = builder.Configuration.GetValue<int>("ApiSettings:HttpClientTimeoutSeconds", 30);
var sessionTimeoutMinutes = builder.Configuration.GetValue<int>("Session:IdleTimeoutMinutes", 30);
var cookieTimeoutMinutes = builder.Configuration.GetValue<int>("Session:CookieTimeoutMinutes", 60);

// Add session support with configurable timeout
builder.Services.AddSession(options =>
{
    options.IdleTimeout = TimeSpan.FromMinutes(sessionTimeoutMinutes);
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Lax;
    options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    //options.Cookie.Expiration = TimeSpan.FromMinutes(cookieTimeoutMinutes);
    // Use a unique session cookie name to avoid conflicts with old encrypted cookies
    options.Cookie.Name = "KAIRO-AUTH-SESSION";
});

var logger = LoggerFactory.Create(config => config.AddConsole()).CreateLogger("Program");
logger.LogInformation("Configuration loaded | ApiTimeout: {ApiTimeoutSeconds}s | SessionTimeout: {SessionTimeoutMinutes}min",
    apiTimeoutSeconds, sessionTimeoutMinutes);

// Add IHttpContextAccessor for accessing session in services
builder.Services.AddHttpContextAccessor();

// Register Authentication Handler for automatic token attachment
builder.Services.AddTransient<AuthenticationHandler>();

builder.Services.AddScoped<IApiService, ApiService>();
builder.Services.AddScoped<IOldApiService, OldApiService>();
builder.Services.AddScoped<IOldApiService, OldApiService>();

// Register Common Utilities Service for shared utility methods
builder.Services.AddScoped<ICommonUtilitiesService, CommonUtilitiesService>();

// Register Authentication Service with configurable timeout
builder.Services.AddHttpClient<IAuthService, AuthService>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = new Uri(builder.Configuration.GetValue<Uri>("OAuth:TokenEndpoint")!.GetLeftPart(UriPartial.Authority));
    });

// Register Generic ApiService with Authentication Handler and configurable timeout
builder.Services.AddHttpClient("IdentityAccessManagentApi")
  .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:IdentityAccessManagentBaseUrl");
    });

builder.Services.AddHttpClient("SystemCoreApi")
    .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:SystemCoreBaseUrl");
    });

builder.Services.AddHttpClient("ClientManagementApi")
    .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:ClientManagementBaseUrl");
    });

builder.Services.AddHttpClient("AccountManagementApi")
    .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:AccountManagementBaseUrl");
    });

builder.Services.AddHttpClient("OldApi")
 .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:OldApiBaseUrl");
    });

builder.Services.AddHttpClient("MicroFinanceApi")
 .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:MicroFinanceBaseUrl")
            ?? builder.Configuration.GetValue<Uri>("ApiSettings:OldApiBaseUrl");
    });


builder.Services.AddHttpClient("ClientDocumentApi")
    .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:ClientDocumentBaseUrl");
    });


builder.Services.AddHttpClient("KairoAIApi")
    .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:KairoAIBaseUrl");
    });



builder.Services.AddHttpClient("ImageRecognitionApi")
    .AddHttpMessageHandler<AuthenticationHandler>()
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(apiTimeoutSeconds);
        client.BaseAddress = builder.Configuration.GetValue<Uri>("ApiSettings:ImageRecognitionBaseUrl");
    });

// Add IConfiguration for injecting into services
builder.Services.AddSingleton(builder.Configuration);

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
    app.UseHttpsRedirection();
}

// Add security headers middleware
app.UseSecurityHeaders();

app.UseRouting();

// Add session middleware (must be before authorization and after routing)
app.UseSession();

// Add authentication redirect middleware (redirects unauthenticated users to login)
app.UseAuthenticationRedirect();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "login",
    pattern: "login",
    defaults: new { controller = "Login", action = "Index" })
    .WithStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Login}/{action=Index}/{id?}")
    .WithStaticAssets();

app.MapControllers();
app.Run();