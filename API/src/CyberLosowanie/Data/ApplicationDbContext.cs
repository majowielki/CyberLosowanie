using CyberLosowanie.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace CyberLosowanie.Data
{
    public class ApplicationDbContext : IdentityDbContext<ApplicationUser>
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
            
        }

        public DbSet<ApplicationUser> ApplicationUsers { get; set; }
        public DbSet<Cyberek> Cyberki { get; set; }
        public DbSet<AuditLog> AuditLogs { get; set; }
        public DbSet<Wishlist> Wishlists { get; set; }

        protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
        {
            // Every DateTime in this model is written as UTC, but datetime2 does not
            // store the Kind: values would come back Unspecified and serialize without
            // the "Z", so browsers would read them as local time.
            configurationBuilder.Properties<DateTime>().HaveConversion<UtcDateTimeConverter>();
            configurationBuilder.Properties<DateTime?>().HaveConversion<UtcDateTimeConverter>();
        }

        private sealed class UtcDateTimeConverter : ValueConverter<DateTime, DateTime>
        {
            public UtcDateTimeConverter()
                : base(value => value, value => DateTime.SpecifyKind(value, DateTimeKind.Utc))
            {
            }
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<ApplicationUser>(entity =>
            {
                entity.Property(e => e.PreferredLanguage).HasMaxLength(5);

                // One account per cyberek — the database backs the service check, so
                // two concurrent picks of the same cyberek cannot both succeed.
                // 0 means "not picked yet" and may repeat.
                entity.HasIndex(e => e.CyberekId)
                      .IsUnique()
                      .HasFilter("[CyberekId] <> 0");
            });

            // Configure AuditLog entity
            modelBuilder.Entity<AuditLog>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.CorrelationId);
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.LogLevel);
                entity.HasIndex(e => e.UserId);

                // Unbounded text fields. The nvarchar(max) column type is SQL Server
                // specific; other providers (e.g. SQLite in tests) map string to their
                // own unbounded text type, so only apply it for SQL Server.
                if (Database.IsSqlServer())
                {
                    entity.Property(e => e.Message).HasColumnType("nvarchar(max)");
                    entity.Property(e => e.ExceptionDetails).HasColumnType("nvarchar(max)");
                    entity.Property(e => e.StackTrace).HasColumnType("nvarchar(max)");
                    entity.Property(e => e.RequestBody).HasColumnType("nvarchar(max)");
                    entity.Property(e => e.AdditionalData).HasColumnType("nvarchar(max)");
                }
            });

            // Configure Wishlist entity — one canvas per participant. A separate table
            // (not a column on Cyberki) keeps the large document away from draw data
            // and does not touch the Cyberki seed below.
            modelBuilder.Entity<Wishlist>(entity =>
            {
                entity.HasKey(e => e.Id);

                // One wishlist per cyberek; saving again overwrites (upsert).
                entity.HasIndex(e => e.CyberekId).IsUnique();

                entity.HasOne<Cyberek>()
                      .WithMany()
                      .HasForeignKey(e => e.CyberekId);

                // Same SQL Server-only column type guard as AuditLog above.
                if (Database.IsSqlServer())
                {
                    entity.Property(e => e.CanvasJson).HasColumnType("nvarchar(max)");
                }
            });

            // Configure Cyberek entity
            modelBuilder.Entity<Cyberek>(entity =>
            {
                // Unique filtered index to ensure one gifted target can only be assigned once
                entity.HasIndex(e => e.GiftedCyberekId)
                      .IsUnique()
                      .HasFilter("[GiftedCyberekId] IS NOT NULL AND [GiftedCyberekId] <> 0");
            });
            
            // Canonical set of TOTAL_CYBERKI_COUNT (12) cyberki. Kept in sync with the
            // test fixture GiftingServiceTests.CreateRealisticDatabaseCyberki().
            // Portraits live in Blob Storage by cyberek id (CyberekImageConstants, E6).
            modelBuilder.Entity<Cyberek>().HasData(
                new Cyberek
                {
                    Id = 1,
                    Name = "Michał",
                    Surname = "Majewski",
                    BannedCyberki = new List<int> { 1, 2, 6, 4, 12 }
                },
                new Cyberek
                {
                    Id = 2,
                    Name = "Kornelia",
                    Surname = "Majewska",
                    BannedCyberki = new List<int> { 2, 1, 10, 12, 5 }
                },
                new Cyberek
                {
                    Id = 3,
                    Name = "Ola",
                    Surname = "Sudoł",
                    BannedCyberki = new List<int> { 3, 9, 11, 10, 6}
                },
                new Cyberek
                {
                    Id = 4,
                    Name = "Daria",
                    Surname = "Kurowska",
                    BannedCyberki = new List<int> { 4, 11, 2, 5 }
                },
                new Cyberek
                {
                    Id = 5,
                    Name = "Asia",
                    Surname = "Małek",
                    BannedCyberki = new List<int> { 5, 8, 7, 3, 10}
                },
                new Cyberek
                {
                    Id = 6,
                    Name = "Filip",
                    Surname = "Wilczyński",
                    BannedCyberki = new List<int> { 6, 12, 5, 9, 3}
                },
                new Cyberek
                {
                    Id = 7,
                    Name = "Marek",
                    Surname = "Grabowski",
                    BannedCyberki = new List<int> { 7, 10, 3, 5, 8 } //w 2024 wylosował 11 ale robił prezent 5
                },
                new Cyberek
                {
                    Id = 8,
                    Name = "Michał",
                    Surname = "Karbowiak",
                    BannedCyberki = new List<int> { 8, 5, 1, 7, 9}
                },
                new Cyberek
                {
                    Id = 9,
                    Name = "Karol",
                    Surname = "Jagiełło",
                    BannedCyberki = new List<int> { 9, 3, 4, 1, 7}
                },
                new Cyberek
                {
                    Id = 10,
                    Name = "Natalia",
                    Surname = "Dutka",
                    BannedCyberki = new List<int> { 10, 7, 12, 6, 2 }
                },
                new Cyberek
                {
                    Id = 11,
                    Name = "Paweł",
                    Surname = "Kurowski",
                    BannedCyberki = new List<int> { 11, 4, 8, 2}
                },
                new Cyberek
                {
                    Id = 12,
                    Name = "Wiktoria",
                    Surname = "Wilczyńska",
                    BannedCyberki = new List<int> { 12, 6, 9, 5, 1 } //w 2024 wylosowała 8 ale robiła prezent 5
                });
        }
    }
}
