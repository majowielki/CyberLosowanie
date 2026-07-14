using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace CyberLosowanie.Migrations
{
    /// <inheritdoc />
    public partial class SeedTwelveCyberki : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[1,2,6]", "https://randomuser.me/api/portraits/men/1.jpg", "Michał", "Majewski" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[1,2,10]", "https://randomuser.me/api/portraits/women/2.jpg", "Kornelia", "Majewska" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[3,9,11]", "https://randomuser.me/api/portraits/women/3.jpg", "Ola", "Sudoł" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[2,4,11]", "https://randomuser.me/api/portraits/women/4.jpg", "Daria", "Kurowska" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[5,7,8]", "https://randomuser.me/api/portraits/women/5.jpg", "Asia", "Małek" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[5,6,12]", "https://randomuser.me/api/portraits/men/6.jpg", "Filip", "Wilczyński" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[3,7,10]", "https://randomuser.me/api/portraits/men/7.jpg", "Marek", "Grabowski" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[1,5,8]", "https://randomuser.me/api/portraits/men/8.jpg", "Michał", "Karbowiak" });

            migrationBuilder.InsertData(
                table: "Cyberki",
                columns: new[] { "Id", "BannedCyberki", "GiftedCyberekId", "ImageUrl", "Name", "Surname" },
                values: new object[,]
                {
                    { 9, "[3,4,9]", 0, "https://randomuser.me/api/portraits/men/9.jpg", "Karol", "Jagiełło" },
                    { 10, "[7,10,12]", 0, "https://randomuser.me/api/portraits/women/10.jpg", "Natalia", "Dutka" },
                    { 11, "[4,8,11]", 0, "https://randomuser.me/api/portraits/men/11.jpg", "Paweł", "Kurowski" },
                    { 12, "[6,9,12]", 0, "https://randomuser.me/api/portraits/women/12.jpg", "Wiktoria", "Wilczyńska" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[1]", "https://losowanie.blob.core.windows.net/losowanieblobs/Andrzej.jpg", "Andrzej", "Ziulweski" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 2,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[2,5]", "https://losowanie.blob.core.windows.net/losowanieblobs/Oskar.jpg", "Oskar", "Ziulewski" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 3,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[3,8]", "https://losowanie.blob.core.windows.net/losowanieblobs/Iza.jpg", "Iza", "Kawulok" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 4,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[4,7]", "https://losowanie.blob.core.windows.net/losowanieblobs/Kornelia.jpg", "Kornelia", "Majewska" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 5,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[5,2]", "https://losowanie.blob.core.windows.net/losowanieblobs/Ania.jpg", "Ania", "Velychko" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 6,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[6]", "https://losowanie.blob.core.windows.net/losowanieblobs/Oksana.jpg", "Oksana", "Velychko" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 7,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[7,4]", "https://losowanie.blob.core.windows.net/losowanieblobs/Michal.jpg", "Michał", "Majewski" });

            migrationBuilder.UpdateData(
                table: "Cyberki",
                keyColumn: "Id",
                keyValue: 8,
                columns: new[] { "BannedCyberki", "ImageUrl", "Name", "Surname" },
                values: new object[] { "[8,3]", "https://losowanie.blob.core.windows.net/losowanieblobs/Filip.jpg", "Filip", "Ziulewski" });
        }
    }
}
