using ClientDocumentApi.Models;
using Microsoft.EntityFrameworkCore;

namespace ClientDocumentApi.Data
{
    public class DocumentDbContext : DbContext
    {
        public DocumentDbContext(DbContextOptions<DocumentDbContext> options) : base(options)
        {
        }

        public DbSet<ClientDocument> ClientDocuments => Set<ClientDocument>();
        public DbSet<WFAdvDocument> WFAdvDocuments => Set<WFAdvDocument>();
        public DbSet<Client> Clients => Set<Client>();
        public DbSet<WFClient> WFClients => Set<WFClient>();
        public DbSet<AccountOperatedby> AccountOperatedbys => Set<AccountOperatedby>();
        public DbSet<Image> Images => Set<Image>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ClientDocument>(entity =>
            {
                entity.ToTable("t_ClientDocument");
                entity.HasKey(d => d.RowID);
                entity.Property(d => d.ClientID).HasMaxLength(40).IsRequired();
                entity.Property(d => d.DocumentID).HasColumnName("DocumentID").HasMaxLength(50).IsRequired();
                entity.Property(d => d.DocumentTypeID).HasMaxLength(50);
                entity.Property(d => d.RequestID).HasMaxLength(36);
                entity.Property(d => d.FilePath).HasMaxLength(1024).IsRequired();
            });

            modelBuilder.Entity<WFAdvDocument>(entity =>
            {
                entity.ToTable("t_WFAdvDocument");
                entity.HasKey(d => new { d.OurBranchID, d.ApplicationID, d.DocumentID });
                entity.Property(d => d.OurBranchID).HasMaxLength(12).IsRequired();
                entity.Property(d => d.ApplicationID).HasMaxLength(100).IsRequired();
                entity.Property(d => d.DocumentID).HasMaxLength(50).IsRequired();
                entity.Property(d => d.DocumentTypeID).HasMaxLength(50).IsRequired();
                entity.Property(d => d.MimeType).HasMaxLength(200);
                entity.Property(d => d.ReceivedBy).HasMaxLength(25);
                entity.Property(d => d.LocationID).HasMaxLength(50);
                entity.Property(d => d.Remarks).HasMaxLength(500);
                entity.Property(d => d.FilePath).HasMaxLength(1000);
                entity.Property(d => d.CreatedBy).HasMaxLength(25);
                entity.Property(d => d.ModifiedBy).HasMaxLength(25);
            });

            modelBuilder.Entity<Client>(entity =>
            {
                entity.ToTable("t_Client");
                entity.HasKey(c => c.ClientID);
                entity.Property(c => c.ClientID).HasMaxLength(40).IsRequired();
                entity.Property(c => c.PhotoID).HasMaxLength(50);
                entity.Property(c => c.SignID).HasMaxLength(50);
                entity.Property(c => c.BioID).HasMaxLength(50);
            });

            modelBuilder.Entity<WFClient>(entity =>
            {
                entity.ToTable("t_WFClient");
                entity.HasKey(c => c.ClientID);
                entity.Property(c => c.ClientID).HasMaxLength(40).IsRequired();
                entity.Property(c => c.PhotoID).HasMaxLength(50);
                entity.Property(c => c.SignID).HasMaxLength(50);
                entity.Property(c => c.BioID).HasMaxLength(50);
                entity.Property(c => c.RequestID).HasMaxLength(50);
            });

            modelBuilder.Entity<AccountOperatedby>(entity =>
            {
                entity.ToTable("t_AccountOperatedby");
                entity.HasKey(a => a.SignatoryID);
                entity.Property(a => a.SignatoryID).HasMaxLength(40).IsRequired();
                entity.Property(a => a.PhotoID).HasMaxLength(50);
                entity.Property(a => a.SignID).HasMaxLength(50);
                entity.Property(a => a.BioID).HasMaxLength(50);
            });

            modelBuilder.Entity<Image>(entity =>
            {
                entity.ToTable("t_Image");
                entity.HasKey(i => i.ImageID);
                entity.Property(i => i.ImageID).ValueGeneratedOnAdd();
                entity.Property(i => i.ImageTypeID).HasMaxLength(50);
                entity.Property(i => i.Description).HasMaxLength(1000);
                entity.Property(i => i.ClosedBy).HasMaxLength(25);
                entity.Property(i => i.ImageStatusID).HasMaxLength(50);
                entity.Property(i => i.CreatedBy).HasMaxLength(25);
                entity.Property(i => i.ModifiedBy).HasMaxLength(25);
                entity.Property(i => i.SupervisedBy).HasMaxLength(25);
            });
        }
    }
}
