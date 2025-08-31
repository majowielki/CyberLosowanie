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
                    Name = "Marcin",
                    Surname = "Malinowski",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/MarcinMalinowski.jpg",
                    BannedCyberki = new List<int> { 1, 2, 6 }
                },
                new Cyberek
                {
                    Id = 2,
                    Name = "Karolina",
                    Surname = "Malinowska",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/KarolinaMalinowska.jpg",
                    BannedCyberki = new List<int> { 1, 2, 10 }
                },
                new Cyberek
                {
                    Id = 3,
                    Name = "Alicja",
                    Surname = "Sudnik",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/AlicjaSudnik.jpg",
                    BannedCyberki = new List<int> { 3, 9, 11 }
                },
                new Cyberek
                {
                    Id = 4,
                    Name = "Dagmara",
                    Surname = "Kurkowska",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/DagmaraKurkowska.jpg",
                    BannedCyberki = new List<int> { 2, 4, 11 }
                },
                new Cyberek
                {
                    Id = 5,
                    Name = "Anna",
                    Surname = "Małecka",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/AnnaMalecka.jpg",
                    BannedCyberki = new List<int> { 5, 7, 8 }
                },
                new Cyberek
                {
                    Id = 6,
                    Name = "Fabian",
                    Surname = "Wilczyk",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/FabianWilczyk.jpg",
                    BannedCyberki = new List<int> { 5, 6, 12 }
                },
                new Cyberek
                {
                    Id = 7,
                    Name = "Maksymilian",
                    Surname = "Grabek",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/MaksymilianGrabek.jpg",
                    BannedCyberki = new List<int> { 3, 7, 10 }
                },
                new Cyberek
                {
                    Id = 8,
                    Name = "Mariusz",
                    Surname = "Karbownik",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/MariuszKarbownik.jpg",
                    BannedCyberki = new List<int> { 1, 5, 8 }
                },
                new Cyberek
                {
                    Id = 9,
                    Name = "Kamil",
                    Surname = "Jagielski",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/KamilJagielski.jpg",
                    BannedCyberki = new List<int> { 3, 4, 9 }
                },
                new Cyberek
                {
                    Id = 10,
                    Name = "Nikola",
                    Surname = "Grabek",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/NikolaGrabek.jpg",
                    BannedCyberki = new List<int> { 7, 10, 12 }
                },
                new Cyberek
                {
                    Id = 11,
                    Name = "Patryk",
                    Surname = "Kurkowski",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/PatrykKurkowski.jpg",
                    BannedCyberki = new List<int> { 4, 8, 11 }
                },
                new Cyberek
                {
                    Id = 12,
                    Name = "Weronika",
                    Surname = "Wilczyk",
                    ImageUrl = "https://cyberlosowanie.blob.core.windows.net/cyberlosowanie/WeronikaWilczyk.jpg",
                    BannedCyberki = new List<int> { 6, 9, 12 }
                });
        }
    }
}
