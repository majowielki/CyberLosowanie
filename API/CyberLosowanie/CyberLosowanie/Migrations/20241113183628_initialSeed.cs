using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CyberLosowanie.Migrations
{
    /// <inheritdoc />
    public partial class initialSeed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Cyberki",
                columns: new[] { "Id", "ApplicationUserId", "BannedCyberki", "GiftedCyberekId", "ImageUrl", "Name", "Surname" },
                values: new object[,]
                {
                    { 1, 0, "[1,2,6]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/Snapchat-1097463068.jpg", "Michał", "Majewski" },
                    { 2, 0, "[1,2,10]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC06751.jpg", "Kornelia", "Majewska" },
                    { 3, 0, "[3,9,11]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC06756.jpg", "Ola", "Sudoł" },
                    { 4, 0, "[2,4,11]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC07182.jpg", "Daria", "Kurowska" },
                    { 5, 0, "[5,7,8]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1194698987364878.jpg", "Asia", "Małek" },
                    { 6, 0, "[6,12]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/filip.jpg", "Filip", "Wilczyński" },
                    { 7, 0, "[3,7,10]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1601092693274773.jpg", "Marek", "Grabowski" },
                    { 8, 0, "[1,5,8]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC06728.jpg", "Michał", "Karbowiak" },
                    { 9, 0, "[3,4,9]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1392476584166599.jpg", "Karol", "Jagiełło" },
                    { 10, 0, "[7,10,12]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/naja.jpg", "Natalia", "Dutka" },
                    { 11, 0, "[4,11]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_969302823211650.jpg", "Paweł", "Kurowski" },
                    { 12, 0, "[6,9,12]", 0, "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1823180021058625.jpg", "Wiktoria", "Wilczyńska" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 1);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 2);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 3);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 4);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 5);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 6);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 7);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 8);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 9);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 10);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 11);

            migrationBuilder.DeleteData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 12);
        }
    }
}
