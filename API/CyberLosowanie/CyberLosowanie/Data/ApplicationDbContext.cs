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

            // Configure Cyberek entity
            modelBuilder.Entity<Cyberek>(entity =>
            {
                // Unique filtered index to ensure one gifted target can only be assigned once
                entity.HasIndex(e => e.GiftedCyberekId)
                      .IsUnique()
                      .HasFilter("[GiftedCyberekId] IS NOT NULL AND [GiftedCyberekId] <> 0");
            });
            
            modelBuilder.Entity<Cyberek>().HasData(
                new Cyberek
                {
                    Id = 1,
                    Name = "Andrzej",
                    Surname = "Ziulweski",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/MarcinMalinowski.jpg",
                    BannedCyberki = new List<int> { 1 }
                },
                new Cyberek
                {
                    Id = 2,
                    Name = "Oskar",
                    Surname = "Ziulewski",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/KarolinaMalinowska.jpg",
                    BannedCyberki = new List<int> { 2, 5 }
                },
                new Cyberek
                {
                    Id = 3,
                    Name = "Iza",
                    Surname = "Kawulok",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/AlicjaSudnik.jpg",
                    BannedCyberki = new List<int> { 3, 8 }
                },
                new Cyberek
                {
                    Id = 4,
                    Name = "Kornelia",
                    Surname = "Majewska",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/DagmaraKurkowska.jpg",
                    BannedCyberki = new List<int> { 4, 7 }
                },
                new Cyberek
                {
                    Id = 5,
                    Name = "Ania",
                    Surname = "Velychko",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/FabianWilczyk.jpg",
                    BannedCyberki = new List<int> { 5, 2 }
                },
                new Cyberek
                {
                    Id = 6,
                    Name = "Oksana",
                    Surname = "Velychko",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/FabianWilczyk.jpg",
                    BannedCyberki = new List<int> { 6 }
                },
                new Cyberek
                {
                    Id = 7,
                    Name = "Michał",
                    Surname = "Majewski",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/MaksymilianGrabek.jpg",
                    BannedCyberki = new List<int> { 7, 4 }
                },
                new Cyberek
                {
                    Id = 8,
                    Name = "Filip",
                    Surname = "Ziulewski",
                    ImageUrl = "https://cyberlosowanieblobs.blob.core.windows.net/cyberlosowanie/MariuszKarbownik.jpg",
                    BannedCyberki = new List<int> { 8, 3 }
                });
        }
    }
}
