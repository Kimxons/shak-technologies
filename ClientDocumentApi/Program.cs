using ClientDocumentApi.Data;
using ClientDocumentApi.Middleware;
using ClientDocumentApi.Options;
using ClientDocumentApi.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using Serilog;
using System.Helpers;

var builder = WebApplication.CreateBuilder(args);

// Configure Serilog from appsettings
builder.Host.UseSerilog((context, configuration) =>
    configuration.ReadFrom.Configuration(context.Configuration));

builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));

// Configure CORS
var corsOrigins = builder.Configuration["appsettings:0:CORS"]?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins", policy =>
    {
        policy.WithOrigins(corsOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});

builder.Services.AddControllers()
                .AddJsonOptions(joptions =>
                    joptions.JsonSerializerOptions.PropertyNamingPolicy = null
                );
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "Client Document API",
        Version = "v1",
        Description = "API for uploading and managing client documents (images and PDFs)"
    });
});

builder.Services.AddDbContext<DocumentDbContext>(options =>
{
    //options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
    options.UseSqlServer(DBClient.GetConnectionString(
       //builder.Configuration["appsettings_0_dbtype"]!,
       //builder.Configuration["appsettings_0_dbservername"]!,
       //builder.Configuration["appsettings_0_databasename"]!,
       //builder.Configuration["appsettings_0_brusername"]!,
       //builder.Configuration["appsettings_0_bruserpassword"]!,
       //builder.Configuration["appsettings_0_appname"]!),
       builder.Configuration["appsettings:0:dbtype"]!,
       builder.Configuration["appsettings:0:dbservername"]!,
       builder.Configuration["appsettings:0:databasename"]!,
       builder.Configuration["appsettings:0:brusername"]!,
       builder.Configuration["appsettings:0:bruserpassword"]!,
       builder.Configuration["appsettings:0:appname"]!),
       sqlOptions =>
       {
           sqlOptions.EnableRetryOnFailure(2);
           sqlOptions.CommandTimeout(380);
       })
      .LogTo(Console.WriteLine, LogLevel.Error);
}, ServiceLifetime.Scoped);

builder.Services.AddDbContext<ImageDbContext>(options =>
{
    options.UseSqlServer(DBClient.GetConnectionString(
       //builder.Configuration["appsettings_1_dbtype"]!,
       //builder.Configuration["appsettings_1_dbservername"]!,
       //builder.Configuration["appsettings_1_databasename"]!,
       //builder.Configuration["appsettings_1_brusername"]!,
       //builder.Configuration["appsettings_1_bruserpassword"]!,
       //builder.Configuration["appsettings_1_appname"]!),

       builder.Configuration["appsettings:1:dbtype"]!,
       builder.Configuration["appsettings:1:dbservername"]!,
       builder.Configuration["appsettings:1:databasename"]!,
       builder.Configuration["appsettings:1:brusername"]!,
       builder.Configuration["appsettings:1:bruserpassword"]!,
       builder.Configuration["appsettings:1:appname"]!),
       sqlOptions =>
       {
           sqlOptions.EnableRetryOnFailure(2);
           sqlOptions.CommandTimeout(380);
       })
      .LogTo(Console.WriteLine, LogLevel.Error);
}, ServiceLifetime.Scoped);

builder.Services.AddDbContext<TempImageDbContext>(options =>
{
    options.UseSqlServer(DBClient.GetConnectionString(
       //builder.Configuration["appsettings_1_dbtype"]!,
       //builder.Configuration["appsettings_1_dbservername"]!,
       //builder.Configuration["appsettings_1_databasename"]!,
       //builder.Configuration["appsettings_1_brusername"]!,
       //builder.Configuration["appsettings_1_bruserpassword"]!,
       //builder.Configuration["appsettings_1_appname"]!),

       builder.Configuration["appsettings:1:dbtype"]!,
       builder.Configuration["appsettings:1:dbservername"]!,
       builder.Configuration["appsettings:1:databasename"]!,
       builder.Configuration["appsettings:1:brusername"]!,
       builder.Configuration["appsettings:1:bruserpassword"]!,
       builder.Configuration["appsettings:1:appname"]!),
       sqlOptions =>
       {
           sqlOptions.EnableRetryOnFailure(2);
           sqlOptions.CommandTimeout(380);
       })
      .LogTo(Console.WriteLine, LogLevel.Error);
}, ServiceLifetime.Scoped);

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 50 * 1024 * 1024; // 50 MB
});

builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddScoped<IImageRepository, ImageRepository>();
builder.Services.AddScoped<ITempImageRepository, TempImageRepository>();
builder.Services.AddScoped<IImageAccountRepository, ImageAccountRepository>();
builder.Services.AddScoped<IImageAccountPreApprovalRepository, ImageAccountPreApprovalRepository>();
builder.Services.AddScoped<ICommonRepository, CommonRepository>();
builder.Services.AddScoped<IAccountDocumentRepository, AccountDocumentRepository>();

// Authentication and authorization can be configured here if needed
// builder.Services.AddAuthentication("Bearer").AddJwtBearer(options => { ... });
// builder.Services.AddAuthorization(options =>
// {
//     options.AddPolicy("AuthenticatedUsers", policy => policy.RequireAuthenticatedUser());
//     options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
// });

var app = builder.Build();


if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Client Document API v1");
        c.RoutePrefix = string.Empty; // Serve Swagger UI at root
    });
}
else
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Client Document API v1");
    });
}

app.UseRequestResponseLogging();

var storageOptions = app.Services.GetRequiredService<IOptions<StorageOptions>>().Value;
var uploadRoot = Path.Combine(app.Environment.ContentRootPath, storageOptions.UploadPath ?? "uploads");
Directory.CreateDirectory(uploadRoot);

var requestPath = string.IsNullOrWhiteSpace(storageOptions.RequestPath)
    ? "/uploads"
    : (storageOptions.RequestPath.StartsWith("/") ? storageOptions.RequestPath : "/" + storageOptions.RequestPath.TrimStart('/'));

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadRoot),
    RequestPath = requestPath
});

// Enable CORS
app.UseCors("AllowSpecificOrigins");

app.UseAuthorization();

app.MapControllers();

// Health check endpoint for Docker
app.MapGet("/health", () => Results.Ok(new { status = "Healthy", timestamp = DateTime.UtcNow }));

app.Run();
