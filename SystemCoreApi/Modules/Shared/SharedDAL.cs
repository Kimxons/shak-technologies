using CBS.Entities.Common;
using Microsoft.EntityFrameworkCore;

namespace SystemCoreApi.Modules.Shared
{
    public class SharedDAL : DbContext
    {
        public SharedDAL(DbContextOptions<SharedDAL> dbContextOptions) : base(dbContextOptions)
        {
            Database.SetCommandTimeout(360);
        }

        public DbSet<ResponseDetail<string>> SharedData { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<ResponseDetail<string>>().HasNoKey();
        }
    }
}
