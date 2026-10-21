using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyberLosowanie.Migrations
{
    /// <inheritdoc />
    public partial class RemoveCyberekImageUrl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "Cyberki");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "Cyberki",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: false,
                defaultValue: "");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 1,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/men/1.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 2,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/women/2.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 3,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/women/3.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 4,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/women/4.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 5,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/women/5.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 6,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/men/6.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 7,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/men/7.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 8,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/men/8.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 9,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/men/9.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 10,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/women/10.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 11,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/men/11.jpg");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 12,
                column: "ImageUrl",
                value: "https://randomuser.me/api/portraits/women/12.jpg");
        }
    }
}
