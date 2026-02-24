using Asp.Versioning;
using AccountManagement.Helpers;
using AccountManagement.Modules.AccountMaintenance;
using AccountManagement.Modules.Shared;
using HealthChecks.UI.Client;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

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

    // Add services to the container.

    builder.Logging.AddConsole();
    builder.Logging.AddSerilog();
    builder.Configuration.SetBasePath(Path.GetDirectoryName(Assembly.GetEntryAssembly()!.Location)!);

    builder.Services.AddControllers()
                .AddJsonOptions(joptions =>
                    joptions.JsonSerializerOptions.PropertyNamingPolicy = null
                );
    ConfigurationManager config = builder.Configuration;

    builder.Services.AddDbContext<CommonDBCtxt>(options =>
    {
        options.UseSqlServer(DBClient.GetConnectionString(
       config["AppSettings:DBType"]!,
         config["AppSettings:DBServerName"]!,
         config["AppSettings:DatabaseName"]!,
         config["AppSettings:BRUserName"]!,
         config["AppSettings:BRUserPassword"]!,
         config["AppSettings:AppName"]!), sqlOptions =>
         {
             sqlOptions.EnableRetryOnFailure(2);
             sqlOptions.CommandTimeout(380);
         })
        .LogTo(Log.Logger.Error, LogLevel.Error);
    }, ServiceLifetime.Transient);

    builder.Services.AddDbContext<SharedDAL>(options =>
    {
        options.UseSqlServer(DBClient.GetConnectionString(
       config["AppSettings:DBType"]!,
         config["AppSettings:DBServerName"]!,
         config["AppSettings:DatabaseName"]!,
         config["AppSettings:BRUserName"]!,
         config["AppSettings:BRUserPassword"]!,
         config["AppSettings:AppName"]!), sqlOptions =>
         {
             sqlOptions.EnableRetryOnFailure(2);
             sqlOptions.CommandTimeout(380);
         })
        .LogTo(Log.Logger.Error, LogLevel.Error);
    }, ServiceLifetime.Transient);

    builder.Services.AddScoped<IAccountRepo, AccountRepo>();
    builder.Services.AddScoped<ISharedRepo, SharedRepo>();

    builder.Services.AddAuthentication("oauth2")
               .AddJwtBearer(options =>
               {
                   options.TokenValidationParameters = new TokenValidationParameters
                   {
                       ValidateIssuer = true,
                       ValidateAudience = true,
                       ValidateLifetime = true,
                       ValidateIssuerSigningKey = true,
                       ValidIssuer = config["AppSettings:ValidIssuer"]!,
                       ValidAudience = config["AppSettings:ValidAudience"]!,
                       IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["AppSettings:UserKey"]!)),
                       ClockSkew = TimeSpan.Zero,
                       RequireSignedTokens = true,
                       SaveSigninToken = true
                   };
                   options.IncludeErrorDetails = true;
               });
    builder.Services.AddAuthorizationBuilder();
    // Registers required services for health checks
    builder.Services.AddHealthChecks()
        .AddDbContextCheck<CommonDBCtxt>(name: "SQL Database Check", tags: new[] { "db" }); ;

    builder.Services.AddEndpointsApiExplorer();
    //builder.Services.AddSwaggerGen();

    builder.Services.AddApiVersioning(v =>
    {
        v.DefaultApiVersion = new ApiVersion(1, 0);
        v.AssumeDefaultVersionWhenUnspecified = true;
        v.ReportApiVersions = true;
        v.ApiVersionReader = ApiVersionReader.Combine(
            new UrlSegmentApiVersionReader(),
            new HeaderApiVersionReader("X-Api-Version")
        );

    }).AddApiExplorer(ex =>
    {
        ex.GroupNameFormat = "'v'VVV";
        ex.SubstituteApiVersionInUrl = true;
        ex.DefaultApiVersion = new ApiVersion(1, 0);
        ex.AssumeDefaultVersionWhenUnspecified = true;
    });
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

    builder.Services.AddCors(options =>
        options.AddPolicy("AnyOrigin", builder =>
        builder
            //.AllowAnyOrigin()
            .WithOrigins(config["AppSettings:CORS"]!)
            .AllowAnyMethod()
            .AllowAnyHeader()
            //.AllowCredentials()
            .SetIsOriginAllowed((host) => true)
            )
        );

    var app = builder.Build();

    // Configure the HTTP request pipeline.
    //if (app.Environment.IsDevelopment())
    //{
    app.UseSwagger();
    app.UseSwaggerUI();
    //}

    //app.UseHttpsRedirection();
    app.UseRouting();

    app.UseCors("AnyOrigin");
    app.UseAuthorization();

    app.MapControllers()
        .RequireCors("AnyOrigin"); ;


    // Map the health check endpoint
    app.MapHealthChecks("/healthx", new HealthCheckOptions
    {
        ResponseWriter = UIResponseWriter.WriteHealthCheckUIResponse
    });

    app.Run();

}
catch (Exception ex)
{
    Log.Error(ex, "Main()");
}
Log.CloseAndFlush();Log.CloseAndFlush();