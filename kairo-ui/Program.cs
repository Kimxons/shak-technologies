using kairo_ui.Handlers;
using kairo_ui.Middleware;
using kairo_ui.Services;
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
            outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {Properties} {Message:lj}{NewLine}{Exception}"
        )
);

// Add services to the container.
builder.Services.AddControllersWithViews();
builder.Services.Configure<RazorViewEngineOptions>(options =>
{
    options.ViewLocationFormats.Add("/Views/Identities/{1}/{0}.cshtml");
    options.ViewLocationFormats.Add("/Views/Shared/{1}/{0}.cshtml");
});
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
    options.Cookie.SecurePolicy = CookieSecurePolicy.None;
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
