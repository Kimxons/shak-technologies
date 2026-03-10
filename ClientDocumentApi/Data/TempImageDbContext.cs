using ClientDocumentApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClientDocumentApi.Data
{
    public class TempImageDbContext : DbContext
    {
        public TempImageDbContext(DbContextOptions<TempImageDbContext> options) : base(options)
        {
        }

        public DbSet<TempImage> TempImages => Set<TempImage>();
        public DbSet<ImageAccountPreApproval> ImageAccountPreApprovals => Set<ImageAccountPreApproval>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ImageAccountPreApproval>(entity =>
            {
                entity.ToTable("t_ImageAccountPreApproval");
                entity.HasKey(i => i.ImageID);
                entity.Property(i => i.ImageTypeID).HasMaxLength(50).IsRequired();
                entity.Property(i => i.ClientID).HasMaxLength(40).IsRequired();
                entity.Property(i => i.Image).IsRequired();
                entity.Property(i => i.Description).HasMaxLength(255);
                entity.Property(i => i.CreatedBy).HasMaxLength(25).IsRequired();
                entity.Property(i => i.CreatedOn).IsRequired();
                entity.Property(i => i.SupervisedBy).HasMaxLength(25);
                entity.Property(i => i.OurBranchID).HasMaxLength(12);

                // Index for common queries
                entity.HasIndex(i => i.ClientID);
                entity.HasIndex(i => i.ImageTypeID);
            });

            modelBuilder.Entity<TempImage>(entity =>
            {
                entity.ToTable("t_ImageTemp");
                entity.HasKey(i => i.TempImageID);
                entity.Property(i => i.ImageTypeID).HasMaxLength(50).IsRequired();
                entity.Property(i => i.OurBranchID).HasMaxLength(12);
                entity.Property(i => i.ClientID).HasMaxLength(40);
                entity.Property(i => i.AccountID).HasMaxLength(40);
                entity.Property(i => i.TempClientID).HasMaxLength(40);
                entity.Property(i => i.Description).HasMaxLength(255);
                entity.Property(i => i.CreatedBy).HasMaxLength(25);
                entity.Property(i => i.ModifiedBy).HasMaxLength(25);
                entity.Property(i => i.DeletedBy).HasMaxLength(25);
                //entity.Property(i => i.sImage).IsRequired();

                // Index for common queries
                entity.HasIndex(i => i.ClientID);
                entity.HasIndex(i => i.TempClientID);
                entity.HasIndex(i => i.AccountID);
            });
        }
    }
}
