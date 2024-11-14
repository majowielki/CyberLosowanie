using CyberLosowanie.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CyberLosowanie.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions options) : base(options)
        {
            
        }

        public DbSet<ApplicationUser> ApplicationUsers { get; set; }
        public DbSet<Cyberek> Cyberki { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Cyberek>().HasData(
                new Cyberek
                {
                    Id = 1,
                    Name = "Michał",
                    Surname = "Majewski",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/Snapchat-1097463068.jpg",
                    BannedCyberki = new List<int> { 1, 2, 6 }
                },
                new Cyberek
                {
                    Id = 2,
                    Name = "Kornelia",
                    Surname = "Majewska",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC06751.jpg",
                    BannedCyberki = new List<int> { 1, 2, 10 }
                },
                new Cyberek
                {
                    Id = 3,
                    Name = "Ola",
                    Surname = "Sudoł",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC06756.jpg",
                    BannedCyberki = new List<int> { 3, 9, 11 }
                },
                new Cyberek
                {
                    Id = 4,
                    Name = "Daria",
                    Surname = "Kurowska",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC07182.jpg",
                    BannedCyberki = new List<int> { 2, 4, 11 }
                },
                new Cyberek
                {
                    Id = 5,
                    Name = "Asia",
                    Surname = "Małek",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1194698987364878.jpg",
                    BannedCyberki = new List<int> { 5, 7, 8 }
                },
                new Cyberek
                {
                    Id = 6,
                    Name = "Filip",
                    Surname = "Wilczyński",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/filip.jpg",
                    BannedCyberki = new List<int> { 6, 8, 12 }
                },
                new Cyberek
                {
                    Id = 7,
                    Name = "Marek",
                    Surname = "Grabowski",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1601092693274773.jpg",
                    BannedCyberki = new List<int> { 3, 7, 10 }
                },
                new Cyberek
                {
                    Id = 8,
                    Name = "Michał",
                    Surname = "Karbowiak",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/PIC06728.jpg",
                    BannedCyberki = new List<int> { 1, 5, 8 }
                },
                new Cyberek
                {
                    Id = 9,
                    Name = "Karol",
                    Surname = "Jagiełło",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1392476584166599.jpg",
                    BannedCyberki = new List<int> { 3, 4, 9 }
                },
                new Cyberek
                {
                    Id = 10,
                    Name = "Natalia",
                    Surname = "Dutka",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/naja.jpg",
                    BannedCyberki = new List<int> { 7, 10, 12 }
                },
                new Cyberek
                {
                    Id = 11,
                    Name = "Paweł",
                    Surname = "Kurowski",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_969302823211650.jpg",
                    BannedCyberki = new List<int> { 4, 5, 11 }
                },
                new Cyberek
                {
                    Id = 12,
                    Name = "Wiktoria",
                    Surname = "Wilczyńska",
                    ImageUrl = "https://cyberlosowaniedata.blob.core.windows.net/losowanko/received_1823180021058625.jpg",
                    BannedCyberki = new List<int> { 6, 9, 12 }
                });
        }
    }
}
