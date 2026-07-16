using CyberLosowanie.Constants;
using CyberLosowanie.Models;
using CyberLosowanie.Repositories;
using CyberLosowanie.Test.TestSupport;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Repository tests against a real (SQLite in-memory) relational engine, so the
    /// seeded schema and genuine transaction semantics are exercised (I4).
    /// </summary>
    public class RepositoryTests
    {
        #region CyberekRepository

        [Fact]
        public async Task CyberekRepository_GetAllAsync_ReturnsSeededCyberki()
        {
            using var db = new SqliteTestDatabase();
            var repo = new CyberekRepository(db.Context);

            var all = (await repo.GetAllAsync()).ToList();

            all.Should().HaveCount(CyberLosowanieConstants.TOTAL_CYBERKI_COUNT);
            all.Should().Contain(c => c.Name == "Michał" && c.Surname == "Majewski");
        }

        [Fact]
        public async Task CyberekRepository_GetByIdAsync_ReturnsMatchOrNull()
        {
            using var db = new SqliteTestDatabase();
            var repo = new CyberekRepository(db.Context);

            (await repo.GetByIdAsync(1)).Should().NotBeNull();
            (await repo.GetByIdAsync(999)).Should().BeNull();
        }

        [Fact]
        public async Task CyberekRepository_UpdateAsync_PersistsChanges()
        {
            using var db = new SqliteTestDatabase();
            var repo = new CyberekRepository(db.Context);

            var cyberek = await repo.GetByIdAsync(1);
            cyberek.GiftedCyberekId = 3;
            await repo.UpdateAsync(cyberek);
            await repo.SaveChangesAsync();

            using var verify = db.NewContext();
            (await verify.Cyberki.FirstAsync(c => c.Id == 1)).GiftedCyberekId.Should().Be(3);
        }

        [Fact]
        public async Task CyberekRepository_PreservesBannedCyberkiCollection()
        {
            using var db = new SqliteTestDatabase();
            var repo = new CyberekRepository(db.Context);

            // BannedCyberki is a primitive collection — verify it round-trips through the DB.
            var michal = await repo.GetByIdAsync(1);
            michal.BannedCyberki.Should().BeEquivalentTo(new[] { 1, 2, 6 });
        }

        #endregion

        #region ApplicationUserRepository (real transactions)

        [Fact]
        public async Task ApplicationUserRepository_GetAllAsync_ReturnsUsers()
        {
            using var db = new SqliteTestDatabase();
            db.Context.Users.Add(new ApplicationUser { UserName = "alice" });
            db.Context.Users.Add(new ApplicationUser { UserName = "bob" });
            await db.Context.SaveChangesAsync();

            var repo = new ApplicationUserRepository(db.Context, IdentityMocks.MockUserManager().Object);

            (await repo.GetAllAsync()).Should().HaveCount(2);
        }

        [Fact]
        public async Task ApplicationUserRepository_CommittedTransaction_PersistsChanges()
        {
            using var db = new SqliteTestDatabase();
            var repo = new ApplicationUserRepository(db.Context, IdentityMocks.MockUserManager().Object);

            using (var transaction = await repo.BeginTransactionAsync())
            {
                db.Context.Users.Add(new ApplicationUser { UserName = "committed" });
                await repo.SaveChangesAsync();
                await transaction.CommitAsync();
            }

            using var verify = db.NewContext();
            (await verify.Users.AnyAsync(u => u.UserName == "committed")).Should().BeTrue();
        }

        [Fact]
        public async Task ApplicationUserRepository_RolledBackTransaction_DiscardsChanges()
        {
            using var db = new SqliteTestDatabase();
            var repo = new ApplicationUserRepository(db.Context, IdentityMocks.MockUserManager().Object);

            using (var transaction = await repo.BeginTransactionAsync())
            {
                db.Context.Users.Add(new ApplicationUser { UserName = "rolledback" });
                await repo.SaveChangesAsync();
                await transaction.RollbackAsync();
            }

            using var verify = db.NewContext();
            (await verify.Users.AnyAsync(u => u.UserName == "rolledback")).Should().BeFalse();
        }

        #endregion

        #region WishlistRepository (upsert + unique CyberekId)

        [Fact]
        public async Task WishlistRepository_AddAndGetByCyberekId_RoundTrips()
        {
            using var db = new SqliteTestDatabase();
            var repo = new WishlistRepository(db.Context);

            await repo.AddAsync(new Wishlist { CyberekId = 1, CanvasJson = "{\"version\":1}", UpdatedAtUtc = DateTime.UtcNow });
            await repo.SaveChangesAsync();

            var loaded = await repo.GetByCyberekIdAsync(1);
            loaded.Should().NotBeNull();
            loaded!.CanvasJson.Should().Be("{\"version\":1}");
            (await repo.GetByCyberekIdAsync(2)).Should().BeNull();
        }

        [Fact]
        public async Task WishlistRepository_UpdatingTrackedEntity_OverwritesPreviousVersion()
        {
            using var db = new SqliteTestDatabase();
            var repo = new WishlistRepository(db.Context);
            await repo.AddAsync(new Wishlist { CyberekId = 1, CanvasJson = "old", UpdatedAtUtc = DateTime.UtcNow.AddDays(-1) });
            await repo.SaveChangesAsync();

            // Upsert path: GetByCyberekIdAsync returns a tracked entity that can be
            // mutated and saved directly.
            var tracked = await repo.GetByCyberekIdAsync(1);
            tracked!.CanvasJson = "new";
            tracked.UpdatedAtUtc = DateTime.UtcNow;
            await repo.SaveChangesAsync();

            using var verify = db.NewContext();
            var wishlists = await verify.Wishlists.Where(w => w.CyberekId == 1).ToListAsync();
            wishlists.Should().ContainSingle().Which.CanvasJson.Should().Be("new");
        }

        [Fact]
        public async Task WishlistRepository_SecondWishlistForSameCyberek_ViolatesUniqueIndex()
        {
            using var db = new SqliteTestDatabase();
            var repo = new WishlistRepository(db.Context);
            await repo.AddAsync(new Wishlist { CyberekId = 1, CanvasJson = "first", UpdatedAtUtc = DateTime.UtcNow });
            await repo.SaveChangesAsync();

            // The one-wishlist-per-cyberek invariant is enforced by the database,
            // not only by service logic (H2).
            using var second = db.NewContext();
            var duplicateRepo = new WishlistRepository(second);
            await duplicateRepo.AddAsync(new Wishlist { CyberekId = 1, CanvasJson = "second", UpdatedAtUtc = DateTime.UtcNow });

            await Assert.ThrowsAsync<DbUpdateException>(() => duplicateRepo.SaveChangesAsync());
        }

        #endregion
    }
}
