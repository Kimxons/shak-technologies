using CBS.Entities.Common;
using AccountManagement.Helpers;
using Microsoft.EntityFrameworkCore;

namespace AccountManagement.Modules.AccountMaintenance
{
    public class CommonDBCtxt : DbContext
    {
        public CommonDBCtxt(DbContextOptions<CommonDBCtxt> dbContextOptions) : base(dbContextOptions)
        {
            Database.SetCommandTimeout(360);
        }

        public DbSet<ResponseDetail<string>> Data { get; set; }
        //public IEnumerable<ResponseDetail<string>> GetInAppAlertList()
        //{
        //    return Data.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_ACCOUNT}").ToList();
        //}
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<ResponseDetail<string>>().HasNoKey();
        }
    }
}
