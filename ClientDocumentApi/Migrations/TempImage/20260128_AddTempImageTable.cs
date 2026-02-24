using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ClientDocumentApi.Migrations.TempImage
{
    /// <inheritdoc />
    public partial class AddTempImageTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "t_ImageTemp",
                columns: table => new
                {
                    TempImageID = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ModuleID = table.Column<short>(type: "smallint", nullable: true),
                    ImageID = table.Column<long>(type: "bigint", nullable: true),
                    ImageTypeID = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false),
                    OurBranchID = table.Column<string>(type: "varchar(12)", maxLength: 12, nullable: true),
                    ClientID = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    AccountID = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    TempClientID = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true),
                    Image = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    ThumbNailImage = table.Column<byte[]>(type: "varbinary(max)", nullable: true),
                    Description = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true),
                    CopyToClientImage = table.Column<bool>(type: "bit", nullable: true),
                    CreatedBy = table.Column<string>(type: "varchar(25)", maxLength: 25, nullable: true),
                    CreatedOn = table.Column<DateTime>(type: "datetime2", nullable: true),
                    sImage = table.Column<string>(type: "varchar(max)", nullable: false),
                    ModifiedBy = table.Column<string>(type: "varchar(25)", maxLength: 25, nullable: true),
                    ModifiedOn = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "varchar(25)", maxLength: 25, nullable: true),
                    DeletedOn = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdateCount = table.Column<byte>(type: "tinyint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_t_ImageTemp", x => x.TempImageID);
                });

            migrationBuilder.CreateIndex(
                name: "IX_t_ImageTemp_ClientID",
                table: "t_ImageTemp",
                column: "ClientID");

            migrationBuilder.CreateIndex(
                name: "IX_t_ImageTemp_TempClientID",
                table: "t_ImageTemp",
                column: "TempClientID");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "t_ImageTemp");
        }
    }
}
