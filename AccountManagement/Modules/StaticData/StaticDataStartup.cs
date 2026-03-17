using Microsoft.AspNetCore.Hosting;

[assembly: HostingStartup(typeof(AccountManagement.Modules.StaticData.StaticDataStartup))]

namespace AccountManagement.Modules.StaticData;

/// <summary>
/// Registers Static Data module services at startup using IHostingStartup.
/// This avoids modifying the protected Program.cs file.
/// </summary>
public class StaticDataStartup : IHostingStartup
{
    public void Configure(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            services.AddScoped<IStaticDataRepo, StaticDataRepo>();
        });
    }
}
