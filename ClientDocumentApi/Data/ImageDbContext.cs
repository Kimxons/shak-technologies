using ClientDocumentApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClientDocumentApi.Data
{
    public class ImageDbContext : DbContext
    {
        public ImageDbContext(DbContextOptions<ImageDbContext> options) : base(options)
        {
        }

        public DbSet<Image> Images => Set<Image>();
        public DbSet<ImageAccount> ImageAccounts => Set<ImageAccount>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ImageAccount>(entity =>
            {
                entity.ToTable("t_ImageAccount");
                entity.HasKey(i => i.ImageID);
                entity.Property(i => i.ImageTypeID).HasMaxLength(50).IsRequired();
                entity.Property(i => i.ClientID).HasMaxLength(40).IsRequired();
                entity.Property(i => i.Description).HasMaxLength(255);
                entity.Property(i => i.CreatedBy).HasMaxLength(25).IsRequired();
                entity.Property(i => i.SupervisedBy).HasMaxLength(25);
                entity.Property(i => i.OurBranchIDMig).HasMaxLength(12);

                // Index for common queries
                entity.HasIndex(i => i.ClientID);
                entity.HasIndex(i => i.ImageTypeID);
            });

            modelBuilder.Entity<Image>(entity =>
            {
                entity.ToTable("t_Image");
                entity.HasKey(i => i.ImageID);
                entity.Property(i => i.ImageData).HasColumnName("Image");
                entity.Property(i => i.ImageTypeID).HasMaxLength(50);
                entity.Property(i => i.Description).HasMaxLength(1000);
                entity.Property(i => i.ClosedBy).HasMaxLength(25);
                entity.Property(i => i.ImageStatusID).HasMaxLength(50).HasDefaultValue("NEW");
                entity.Property(i => i.CreatedBy).HasMaxLength(25);
                entity.Property(i => i.ModifiedBy).HasMaxLength(25);
                entity.Property(i => i.SupervisedBy).HasMaxLength(25);
                entity.Property(i => i.MimeType).HasMaxLength(255);
                entity.Property(i => i.FilePath).HasMaxLength(1024);
            });
        }
    }
}
