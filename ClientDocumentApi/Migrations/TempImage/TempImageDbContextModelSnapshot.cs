using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;

#nullable disable

namespace ClientDocumentApi.Migrations.TempImage
{
    [DbContext(typeof(ClientDocumentApi.Data.TempImageDbContext))]
    partial class TempImageDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "8.0.0")
                .HasAnnotation("Relational:MaxIdentifierLength", 128);

            SqlServerModelBuilderExtensions.UseIdentityColumns(modelBuilder);

            modelBuilder.Entity("ClientDocumentApi.Models.TempImage", b =>
                {
                    b.Property<long>("TempImageID")
                        .ValueGeneratedOnAdd()
                        .HasColumnType("bigint");

                    SqlServerPropertyBuilderExtensions.UseIdentityColumn(b.Property<long>("TempImageID"));

                    b.Property<long?>("ImageID")
                        .HasColumnType("bigint");

                    b.Property<string>("ImageTypeID")
                        .IsRequired()
                        .HasMaxLength(50)
                        .HasColumnType("varchar(50)");

                    b.Property<byte[]>("Image")
                        .HasColumnType("varbinary(max)");

                    b.Property<string>("OurBranchID")
                        .HasMaxLength(12)
                        .HasColumnType("varchar(12)");

                    b.Property<string>("AccountID")
                        .HasMaxLength(40)
                        .HasColumnType("varchar(40)");

                    b.Property<string>("ClientID")
                        .HasMaxLength(40)
                        .HasColumnType("varchar(40)");

                    b.Property<bool?>("CopyToClientImage")
                        .HasColumnType("bit");

                    b.Property<string>("CreatedBy")
                        .HasMaxLength(25)
                        .HasColumnType("varchar(25)");

                    b.Property<DateTime?>("CreatedOn")
                        .HasColumnType("datetime2");

                    b.Property<string>("DeletedBy")
                        .HasMaxLength(25)
                        .HasColumnType("varchar(25)");

                    b.Property<DateTime?>("DeletedOn")
                        .HasColumnType("datetime2");

                    b.Property<string>("Description")
                        .HasMaxLength(255)
                        .HasColumnType("varchar(255)");

                    b.Property<short?>("ModuleID")
                        .HasColumnType("smallint");

                    b.Property<string>("ModifiedBy")
                        .HasMaxLength(25)
                        .HasColumnType("varchar(25)");

                    b.Property<DateTime?>("ModifiedOn")
                        .HasColumnType("datetime2");

                    b.Property<string>("TempClientID")
                        .HasMaxLength(40)
                        .HasColumnType("varchar(40)");

                    b.Property<byte[]>("ThumbNailImage")
                        .HasColumnType("varbinary(max)");

                    b.Property<byte?>("UpdateCount")
                        .HasColumnType("tinyint");

                    b.Property<string>("sImage")
                        .IsRequired()
                        .HasColumnType("varchar(max)");

                    b.HasKey("TempImageID");

                    b.HasIndex("ClientID");

                    b.HasIndex("TempClientID");

                    b.ToTable("t_ImageTemp");
                });
#pragma warning restore 612, 618
        }
    }
}
