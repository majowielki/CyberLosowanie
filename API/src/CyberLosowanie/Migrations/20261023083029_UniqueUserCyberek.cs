using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyberLosowanie.Migrations
{
    /// <inheritdoc />
    public partial class UniqueUserCyberek : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_AspNetUsers_CyberekId",
                table: "AspNetUsers",
                column: "CyberekId",
                unique: true,
                filter: "[CyberekId] <> 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AspNetUsers_CyberekId",
                table: "AspNetUsers");
        }
    }
}
