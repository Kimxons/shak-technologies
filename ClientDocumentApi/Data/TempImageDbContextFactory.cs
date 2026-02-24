using ClientDocumentApi.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace ClientDocumentApi.Data
{
    public class TempImageDbContextFactory : IDesignTimeDbContextFactory<TempImageDbContext>
    {
        public TempImageDbContext CreateDbContext(string[] args)
        {
            var optionsBuilder = new DbContextOptionsBuilder<TempImageDbContext>();
            
            // Use the connection string for Kairo_Files database (AppSettings_1)
            var connectionString = "Server=172.16.2.42\\SQL2022, 3020;Database=Kairo_Files;User ID=sa;Password=TSEDEY@2024;Encrypt=false;TrustServerCertificate=true;";
            
            optionsBuilder.UseSqlServer(connectionString, sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(2);
                sqlOptions.CommandTimeout(380);
            });

            return new TempImageDbContext(optionsBuilder.Options);
        }
    }
}
