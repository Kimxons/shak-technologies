using CBS.Entities.Common;
using Microsoft.EntityFrameworkCore;

namespace ClientManagement.Modules.ClientMaintenance
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
        //    return ClientMaintenance.FromSqlInterpolated($"EXECUTE {DBObjectConstants.GET_CLIENT}").ToList();
        //}
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<ResponseDetail<string>>().HasNoKey();
        }
    }
}
