using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CyberLosowanie.Migrations
{
    /// <inheritdoc />
    public partial class UpdateBannedCyberkiSeedData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 1,
                column: "BannedCyberki",
                value: "[1,2,6,4,12]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 2,
                column: "BannedCyberki",
                value: "[2,1,10,12,5]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 3,
                column: "BannedCyberki",
                value: "[3,9,11,10,6]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 4,
                column: "BannedCyberki",
                value: "[4,11,2,5]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 5,
                column: "BannedCyberki",
                value: "[5,8,7,3,10]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 6,
                column: "BannedCyberki",
                value: "[6,12,5,9,3]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 7,
                column: "BannedCyberki",
                value: "[7,10,3,5,8]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 8,
                column: "BannedCyberki",
                value: "[8,5,1,7,9]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 9,
                column: "BannedCyberki",
                value: "[9,3,4,1,7]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 10,
                column: "BannedCyberki",
                value: "[10,7,12,6,2]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 11,
                column: "BannedCyberki",
                value: "[11,4,8,2]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 12,
                column: "BannedCyberki",
                value: "[12,6,9,5,1]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 1,
                column: "BannedCyberki",
                value: "[1,2,6]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 2,
                column: "BannedCyberki",
                value: "[1,2,10]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 3,
                column: "BannedCyberki",
                value: "[3,9,11]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 4,
                column: "BannedCyberki",
                value: "[2,4,11]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 5,
                column: "BannedCyberki",
                value: "[5,7,8]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 6,
                column: "BannedCyberki",
                value: "[5,6,12]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 7,
                column: "BannedCyberki",
                value: "[3,7,10]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 8,
                column: "BannedCyberki",
                value: "[1,5,8]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 9,
                column: "BannedCyberki",
                value: "[3,4,9]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 10,
                column: "BannedCyberki",
                value: "[7,10,12]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 11,
                column: "BannedCyberki",
                value: "[4,8,11]");

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 12,
                column: "BannedCyberki",
                value: "[6,9,12]");
        }
    }
}
