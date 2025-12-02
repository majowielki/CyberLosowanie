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
        public DbSet<AuditLog> AuditLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Configure AuditLog entity
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.CorrelationId);
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.LogLevel);
                entity.HasIndex(e => e.UserId);
                
                // Configure text fields for SQL Server
                entity.Property(e => e.Message).HasColumnType("nvarchar(max)");
                entity.Property(e => e.ExceptionDetails).HasColumnType("nvarchar(max)");
                entity.Property(e => e.StackTrace).HasColumnType("nvarchar(max)");
                entity.Property(e => e.RequestBody).HasColumnType("nvarchar(max)");
                entity.Property(e => e.AdditionalData).HasColumnType("nvarchar(max)");
            });
            
            modelBuilder.Entity<Cyberek>().HasData(
                new Cyberek
                {
                    Id = 1,
                    Name = "Michał",
                    Surname = "Majewski",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/MarcinMalinowski.jpg",
                    BannedCyberki = new List<int> { 1, 2, 6, 4, 11 }
                },
                new Cyberek
                {
                    Id = 2,
                    Name = "Kornelia",
                    Surname = "Majewska",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/KarolinaMalinowska.jpg",
                    BannedCyberki = new List<int> { 1, 2, 10, 12, 4, 11 }
                },
                new Cyberek
                {
                    Id = 3,
                    Name = "Ola",
                    Surname = "Sudoł",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/AlicjaSudnik.jpg",
                    BannedCyberki = new List<int> { 3, 9, 11, 1, 4, 11 }
                },
                new Cyberek
                {
                    Id = 4,
                    Name = "Daria",
                    Surname = "Kurowska",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/DagmaraKurkowska.jpg",
                    BannedCyberki = new List<int> { } //new List<int> { 4, 11, 2, 5 }
                },
                new Cyberek
                {
                    Id = 5,
                    Name = "Asia",
                    Surname = "Małek",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/AnnaMalecka.jpg",
                    BannedCyberki = new List<int> { 5, 8, 7, 3, 4, 11 }
                },
                new Cyberek
                {
                    Id = 6,
                    Name = "Filip",
                    Surname = "Wilczyński",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/FabianWilczyk.jpg",
                    BannedCyberki = new List<int> { 6, 12, 5, 9, 4, 11 }
                },
                new Cyberek
                {
                    Id = 7,
                    Name = "Marek",
                    Surname = "Grabowski",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/MaksymilianGrabek.jpg",
                    BannedCyberki = new List<int> { 7, 10, 3, 5, 4, 11 }
                },
                new Cyberek
                {
                    Id = 8,
                    Name = "Michał",
                    Surname = "Karbowiak",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/MariuszKarbownik.jpg",
                    BannedCyberki = new List<int> { 5, 8, 1, 7, 4, 11 }
                },
                new Cyberek
                {
                    Id = 9,
                    Name = "Karol",
                    Surname = "Jagiełło",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/KamilJagielski.jpg",
                    BannedCyberki = new List<int> { 3, 9, 4, 10, 11 }
                },
                new Cyberek
                {
                    Id = 10,
                    Name = "Natalia",
                    Surname = "Grabowska",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/NikolaGrabek.jpg",
                    BannedCyberki = new List<int> { 7, 10, 12, 6, 4, 11 }
                },
                new Cyberek
                {
                    Id = 11,
                    Name = "Paweł",
                    Surname = "Kurowski",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/PatrykKurkowski.jpg",
                    BannedCyberki = new List<int> { } //new List<int> { 4, 11, 8, 2 }
                },
                new Cyberek
                {
                    Id = 12,
                    Name = "Wiktoria",
                    Surname = "Wilczyńska",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/WeronikaWilczyk.jpg",
                    BannedCyberki = new List<int> { 6, 12, 9, 5, 4, 11 }
                });
        }
    }
}
