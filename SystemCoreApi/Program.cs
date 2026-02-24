using Asp.Versioning;
using Asp.Versioning.ApiExplorer;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using SystemCoreApi.Helpers;
using SystemCoreApi.Modules.SystemCore;
using SystemCoreApi.Modules.SystemBankSettings;

var configS = new ConfigurationBuilder()
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddEnvironmentVariables()
    .Build();

//Initialize Logger
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(configS)
    .Enrich.WithProperty("COMPUTERNAME", Environment.MachineName)
    .Enrich.WithProperty("MachineName", Environment.MachineName)
    .Enrich.WithProperty("UserName", Environment.UserName)
    .Destructure.ByTransforming<JsonElement>(jdoc => Regex.Unescape(JsonSerializer.Serialize(jdoc)))
    .CreateLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    // Add services to the container
    builder.Logging.AddConsole();
    builder.Logging.AddSerilog();
    builder.Configuration.SetBasePath(Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!);

    builder.Services.AddControllers()
        .AddJsonOptions(joptions =>
            joptions.JsonSerializerOptions.PropertyNamingPolicy = null
        );

    ConfigurationManager config = builder.Configuration;

    // Add DbContext Factory
    builder.Services.AddDbContextFactory<CommonDBCtxt>(options =>
    {
        options.UseSqlServer(DBClient.GetConnectionString(
            config["AppSettings:dbtype"]!,
            config["AppSettings:dbservername"]!,
            config["AppSettings:databasename"]!,
            config["AppSettings:brusername"]!,
            config["AppSettings:bruserpassword"]!,
            config["AppSettings:appname"]!), sqlOptions =>
        {
            //sqlOptions.EnableRetryOnFailure(2);
            sqlOptions.CommandTimeout(int.Parse(config["AppSettings:commandtimeout"]!));
        })
        .LogTo(Log.Logger.Error, LogLevel.Error);
    }, ServiceLifetime.Scoped);

    builder.Services.AddAuthentication("oauth2")
               .AddJwtBearer(options =>
               {
                   options.TokenValidationParameters = new TokenValidationParameters
                   {
                       ValidateIssuer = true,
                       ValidateAudience = true,
                       ValidateLifetime = true,
                       ValidateIssuerSigningKey = true,
                       ValidIssuer = config["AppSettings:validissuer"]!,
                       ValidAudience = config["AppSettings:validaudience"]!,
                       IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["AppSettings:userkey"]!)),
                       ClockSkew = TimeSpan.Zero,
                       RequireSignedTokens = true,
                       SaveSigninToken = true
                   };
                   options.IncludeErrorDetails = true;
               });
    builder.Services.AddAuthorizationBuilder();
    // Registers required services for health checks
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<CommonDBCtxt>(name: "SQL Database Check", tags: ["db"]); ;

    // Add API Versioning
    builder.Services.AddApiVersioning(o =>
    {
        o.DefaultApiVersion = new ApiVersion(1, 0);
        o.AssumeDefaultVersionWhenUnspecified = true;
        o.ReportApiVersions = true;
        o.ApiVersionReader = ApiVersionReader.Combine(
            new UrlSegmentApiVersionReader(),
            new HeaderApiVersionReader("api-version"));
    })
    .AddApiExplorer(options =>
    {
        options.GroupNameFormat = "'v'VVV";
        options.SubstituteApiVersionInUrl = true;
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
    });

    // Add Swagger
    builder.Services.AddEndpointsApiExplorer();

    OpenApiInfo openApiInfo = new();
    config.GetSection("SwaggerSettings:Info").Bind(openApiInfo);
    OpenApiSecurityScheme openApiSecurityScheme = new();
    config.GetSection("SwaggerSettings:SecuritySchemes:oAuth2").Bind(openApiSecurityScheme);
    builder.Services.AddSwaggerGen(swaggerOptions =>
    {
        swaggerOptions.SwaggerDoc(config["SwaggerSettings:Info:Version"], openApiInfo);
        swaggerOptions.AddSecurityDefinition(config["SwaggerSettings:securitySchemes:oAuth2:type"], openApiSecurityScheme);
        swaggerOptions.AddSecurityRequirement(new OpenApiSecurityRequirement {
            { new OpenApiSecurityScheme{ Reference = new OpenApiReference{ Id="oauth2",Type=ReferenceType.SecurityScheme} }
            ,Array.Empty<string>()
            }
        });
    });
    //builder.Services.AddSwaggerGen(options =>
    //{
    //    var provider = builder.Services.BuildServiceProvider().GetRequiredService<IApiVersionDescriptionProvider>();
    //    foreach (var description in provider.ApiVersionDescriptions)
    //    {
    //        options.SwaggerDoc(
    //            description.GroupName,
    //            new OpenApiInfo
    //            {
    //                Title = "System Core API",
    //                Version = description.ApiVersion.ToString(),
    //                Description = "API for system core operations including main modules management"
    //            });
    //    }

    //    var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    //    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    //    if (File.Exists(xmlPath))
    //        options.IncludeXmlComments(xmlPath);
    //});

    // Register services
    builder.Services.AddScoped<ISystemCoreRepo, SystemCoreRepo>();
    builder.Services.AddScoped<ISystemBankSettingRepo, SystemBankSettingRepo>();

    // Configure CORS
    var corsOrigins = builder.Configuration["AppSettings:cors"]?.Split(',', StringSplitOptions.RemoveEmptyEntries) ?? Array.Empty<string>();

    // Add CORS
    builder.Services.AddCors(options =>
    {
        options.AddPolicy("AllowAll", policy =>
        {
            policy.WithOrigins(corsOrigins)
            //policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader()
            .SetIsOriginAllowed((host) => true);
        });
    });

    var app = builder.Build();

    // Use CORS
    app.UseCors("AllowAll");

    // Configure the HTTP request pipeline
    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(options =>
        {
            var provider = app.Services.GetRequiredService<IApiVersionDescriptionProvider>();
            foreach (var description in provider.ApiVersionDescriptions)
            {
                options.SwaggerEndpoint(
                    $"/swagger/{description.GroupName}/swagger.json",
                    description.GroupName.ToUpperInvariant());
            }
        });
    }

    app.UseHttpsRedirection();
    app.UseAuthorization();
    app.MapControllers()
        .RequireCors("AnyOrigin");


    // Map the health check endpoint
    app.MapHealthChecks("/health", new HealthCheckOptions
    {
        ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
    });

    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    await Log.CloseAndFlushAsync();
}
