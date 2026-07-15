using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Services;
using FluentAssertions;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Unit tests for the orchestration layer: caching, validation, error mapping,
    /// transactions and retry — all with mocked repositories/collaborators (I4).
    /// </summary>
    public class CyberekServiceTests
    {
        private readonly Mock<ICyberekRepository> _cyberekRepo = new();
        private readonly Mock<IApplicationUserRepository> _userRepo = new();
        private readonly Mock<IGiftingService> _gifting = new();
        private readonly Mock<IValidationService> _validation = new();
        private readonly Mock<IAuditService> _audit = new();
        private readonly IMemoryCache _cache = new MemoryCache(new MemoryCacheOptions());

        private CyberekService CreateService()
        {
            // Default: every id passes validation. Individual tests override this.
            _validation.Setup(v => v.ValidateCyberekId(It.IsAny<int>())).Returns(new List<string>());
            return new CyberekService(
                _cyberekRepo.Object,
                _userRepo.Object,
                _gifting.Object,
                _validation.Object,
                _cache,
                NullLogger<CyberekService>.Instance,
                _audit.Object);
        }

        private static Mock<IDbContextTransaction> MockTransaction() => new();

        private static Cyberek Cyberek(int id, int gifted = 0, List<int>? banned = null) => new()
        {
            Id = id,
            Name = $"Name{id}",
            Surname = $"Surname{id}",
            ImageUrl = $"https://example.com/{id}.jpg",
            GiftedCyberekId = gifted,
            BannedCyberki = banned ?? new List<int>()
        };

        #region Constructor guards

        [Fact]
        public void Constructor_NullDependencies_ThrowArgumentNullException()
        {
            var repo = _cyberekRepo.Object;
            var users = _userRepo.Object;
            var gifting = _gifting.Object;
            var validation = _validation.Object;
            var audit = _audit.Object;
            var logger = NullLogger<CyberekService>.Instance;

            Assert.Throws<ArgumentNullException>(() => new CyberekService(null!, users, gifting, validation, _cache, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new CyberekService(repo, null!, gifting, validation, _cache, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new CyberekService(repo, users, null!, validation, _cache, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new CyberekService(repo, users, gifting, null!, _cache, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new CyberekService(repo, users, gifting, validation, null!, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new CyberekService(repo, users, gifting, validation, _cache, null!, audit));
            Assert.Throws<ArgumentNullException>(() => new CyberekService(repo, users, gifting, validation, _cache, logger, null!));
        }

        #endregion

        #region GetAllCyberkiAsync

        [Fact]
        public async Task GetAllCyberkiAsync_OnCacheMiss_QueriesRepositoryThenCaches()
        {
            var data = new List<Cyberek> { Cyberek(1), Cyberek(2) };
            _cyberekRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(data);
            var service = CreateService();

            var first = await service.GetAllCyberkiAsync();
            var second = await service.GetAllCyberkiAsync();

            first.Should().BeEquivalentTo(data);
            second.Should().BeEquivalentTo(data);
            // Second call is served from cache — repository hit only once.
            _cyberekRepo.Verify(r => r.GetAllAsync(), Times.Once);
        }

        [Fact]
        public async Task GetAllCyberkiAsync_WhenRepositoryThrows_ThrowsDataAccessExceptionAndAudits()
        {
            _cyberekRepo.Setup(r => r.GetAllAsync()).ThrowsAsync(new Exception("db down"));
            var service = CreateService();

            await Assert.ThrowsAsync<DataAccessException>(() => service.GetAllCyberkiAsync());
            // Service-layer errors log through the HttpContext overload (context: null),
            // not the AuditContext one used by the middleware.
            _audit.Verify(a => a.LogErrorAsync(
                It.IsAny<Exception>(), (Microsoft.AspNetCore.Http.HttpContext?)null, null, null), Times.Once);
        }

        #endregion

        #region GetAvailableToPickCyberkiAsync

        [Fact]
        public async Task GetAvailableToPickCyberkiAsync_ExcludesCyberkiAlreadyAssignedToUsers()
        {
            _cyberekRepo.Setup(r => r.GetAllAsync())
                .ReturnsAsync(new List<Cyberek> { Cyberek(1), Cyberek(2), Cyberek(3) });
            _userRepo.Setup(r => r.GetAllAsync())
                .ReturnsAsync(new List<ApplicationUser> { new() { CyberekId = 2 }, new() { CyberekId = 0 } });
            var service = CreateService();

            var result = await service.GetAvailableToPickCyberkiAsync();

            result.Select(c => c.Id).Should().BeEquivalentTo(new[] { 1, 3 });
        }

        [Fact]
        public async Task GetAvailableToPickCyberkiAsync_WhenUserRepositoryThrows_ThrowsDataAccessException()
        {
            _cyberekRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Cyberek> { Cyberek(1) });
            _userRepo.Setup(r => r.GetAllAsync()).ThrowsAsync(new Exception("db down"));
            var service = CreateService();

            await Assert.ThrowsAsync<DataAccessException>(() => service.GetAvailableToPickCyberkiAsync());
        }

        #endregion

        #region GetCyberekByIdAsync

        [Fact]
        public async Task GetCyberekByIdAsync_WithInvalidId_ThrowsBusinessValidationException()
        {
            var service = CreateService();
            _validation.Setup(v => v.ValidateCyberekId(It.IsAny<int>())).Returns(new List<string> { "invalid" });

            await Assert.ThrowsAsync<BusinessValidationException>(() => service.GetCyberekByIdAsync(99));
        }

        [Fact]
        public async Task GetCyberekByIdAsync_WhenNotFound_ThrowsCyberekNotFoundException()
        {
            _cyberekRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync((Cyberek)null!);
            var service = CreateService();

            await Assert.ThrowsAsync<CyberekNotFoundException>(() => service.GetCyberekByIdAsync(5));
        }

        [Fact]
        public async Task GetCyberekByIdAsync_WhenFound_ReturnsCyberek()
        {
            _cyberekRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(Cyberek(5));
            var service = CreateService();

            var result = await service.GetCyberekByIdAsync(5);

            result.Id.Should().Be(5);
        }

        #endregion

        #region GetAvailableGiftTargetsAsync

        [Fact]
        public async Task GetAvailableGiftTargetsAsync_WhenAlreadyGifted_ReturnsSingleAssignedTarget()
        {
            _cyberekRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(Cyberek(1, gifted: 4));
            var service = CreateService();

            var result = await service.GetAvailableGiftTargetsAsync(1);

            result.Should().Equal(4);
            _gifting.Verify(g => g.GetAvailableToBeGiftedCyberki(It.IsAny<List<Cyberek>>(), It.IsAny<List<int>>()), Times.Never);
        }

        [Fact]
        public async Task GetAvailableGiftTargetsAsync_WhenNotGifted_DelegatesToGiftingService()
        {
            _cyberekRepo.Setup(r => r.GetByIdAsync(1)).ReturnsAsync(Cyberek(1, banned: new List<int> { 2 }));
            _cyberekRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Cyberek> { Cyberek(1), Cyberek(2), Cyberek(3) });
            _gifting.Setup(g => g.GetAvailableToBeGiftedCyberki(It.IsAny<List<Cyberek>>(), It.IsAny<List<int>>()))
                .Returns(new List<int> { 3 });
            var service = CreateService();

            var result = await service.GetAvailableGiftTargetsAsync(1);

            result.Should().Equal(3);
        }

        [Fact]
        public async Task GetAvailableGiftTargetsAsync_WhenCyberekNotFound_ThrowsCyberekNotFoundException()
        {
            _cyberekRepo.Setup(r => r.GetByIdAsync(7)).ReturnsAsync((Cyberek)null!);
            var service = CreateService();

            await Assert.ThrowsAsync<CyberekNotFoundException>(() => service.GetAvailableGiftTargetsAsync(7));
        }

        #endregion

        #region GetGiftedCyberekForUserAsync

        [Fact]
        public async Task GetGiftedCyberekForUserAsync_WithEmptyUsername_ThrowsBusinessValidationException()
        {
            var service = CreateService();

            await Assert.ThrowsAsync<BusinessValidationException>(() => service.GetGiftedCyberekForUserAsync("  "));
        }

        [Fact]
        public async Task GetGiftedCyberekForUserAsync_WhenUserNotFound_ThrowsUserNotFoundException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync((ApplicationUser)null!);
            var service = CreateService();

            await Assert.ThrowsAsync<UserNotFoundException>(() => service.GetGiftedCyberekForUserAsync("john"));
        }

        [Fact]
        public async Task GetGiftedCyberekForUserAsync_WhenNoGiftAssignedYet_ThrowsInvalidGiftAssignmentException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(new ApplicationUser { GiftedCyberekId = 0 });
            var service = CreateService();

            await Assert.ThrowsAsync<InvalidGiftAssignmentException>(() => service.GetGiftedCyberekForUserAsync("john"));
        }

        [Fact]
        public async Task GetGiftedCyberekForUserAsync_WhenAssigned_ReturnsGiftedCyberek()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(new ApplicationUser { GiftedCyberekId = 6 });
            _cyberekRepo.Setup(r => r.GetByIdAsync(6)).ReturnsAsync(Cyberek(6));
            var service = CreateService();

            var result = await service.GetGiftedCyberekForUserAsync("john");

            result.Id.Should().Be(6);
        }

        #endregion

        #region AssignCyberekToUserAsync

        [Fact]
        public async Task AssignCyberekToUserAsync_WhenUserAlreadyHasCyberek_ReturnsFalseWithoutTransaction()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(new ApplicationUser { CyberekId = 3 });
            var service = CreateService();

            var result = await service.AssignCyberekToUserAsync("john", 5);

            result.Should().BeFalse();
            _userRepo.Verify(r => r.BeginTransactionAsync(), Times.Never);
        }

        [Fact]
        public async Task AssignCyberekToUserAsync_WhenUserNotFound_ThrowsUserNotFoundException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("ghost")).ReturnsAsync((ApplicationUser)null!);
            var service = CreateService();

            await Assert.ThrowsAsync<UserNotFoundException>(() => service.AssignCyberekToUserAsync("ghost", 5));
        }

        [Fact]
        public async Task AssignCyberekToUserAsync_OnSuccess_CommitsTransactionAndInvalidatesCache()
        {
            var user = new ApplicationUser { CyberekId = 0, Id = "u1" };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _cyberekRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(Cyberek(5));
            var tx = MockTransaction();
            _userRepo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(tx.Object);

            // Prime the cache so we can assert it gets invalidated.
            _cyberekRepo.Setup(r => r.GetAllAsync()).ReturnsAsync(new List<Cyberek> { Cyberek(1) });
            var service = CreateService();
            await service.GetAllCyberkiAsync(); // populate cache

            var result = await service.AssignCyberekToUserAsync("john", 5);

            result.Should().BeTrue();
            user.CyberekId.Should().Be(5);
            tx.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
            _userRepo.Verify(r => r.SaveChangesAsync(), Times.Once);

            // Cache invalidated: the next read hits the repository again.
            await service.GetAllCyberkiAsync();
            _cyberekRepo.Verify(r => r.GetAllAsync(), Times.Exactly(2));
        }

        [Fact]
        public async Task AssignCyberekToUserAsync_WhenSaveFails_RollsBackAndThrowsDataAccessException()
        {
            var user = new ApplicationUser { CyberekId = 0, Id = "u1" };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _cyberekRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(Cyberek(5));
            var tx = MockTransaction();
            _userRepo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(tx.Object);
            _userRepo.Setup(r => r.SaveChangesAsync()).ThrowsAsync(new Exception("save failed"));
            var service = CreateService();

            await Assert.ThrowsAsync<DataAccessException>(() => service.AssignCyberekToUserAsync("john", 5));
            tx.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion

        #region AssignGiftAsync

        [Fact]
        public async Task AssignGiftAsync_WhenUserHasNoCyberek_ThrowsInvalidGiftAssignmentException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(new ApplicationUser { CyberekId = 0 });
            var service = CreateService();

            await Assert.ThrowsAsync<InvalidGiftAssignmentException>(() => service.AssignGiftAsync("john"));
        }

        [Fact]
        public async Task AssignGiftAsync_WhenGiftAlreadyAssigned_ThrowsInvalidGiftAssignmentException()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(new ApplicationUser { CyberekId = 1, Id = "u1" });
            _cyberekRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(Cyberek(5));
            // The giver (cyberek 1) already has a gift assigned in the transactional snapshot.
            _cyberekRepo.Setup(r => r.GetAllForUpdateAsync())
                .ReturnsAsync(new List<Cyberek> { Cyberek(1, gifted: 7), Cyberek(5) });
            var tx = MockTransaction();
            _userRepo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(tx.Object);
            var service = CreateService();

            await Assert.ThrowsAsync<InvalidGiftAssignmentException>(() => service.AssignGiftAsync("john"));
        }

        [Fact]
        public async Task AssignGiftAsync_OnSuccess_ReturnsAssignedTargetAndCommits()
        {
            var user = new ApplicationUser { CyberekId = 1, Id = "u1" };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _cyberekRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(Cyberek(5));
            _cyberekRepo.Setup(r => r.GetAllForUpdateAsync())
                .ReturnsAsync(new List<Cyberek> { Cyberek(1), Cyberek(5) });
            _gifting.Setup(g => g.GetAvailableToBeGiftedCyberek(It.IsAny<List<Cyberek>>(), It.IsAny<Cyberek>()))
                .Returns(5);
            var tx = MockTransaction();
            _userRepo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(tx.Object);
            var service = CreateService();

            var result = await service.AssignGiftAsync("john");

            result.Should().Be(5);
            user.GiftedCyberekId.Should().Be(5);
            tx.Verify(t => t.CommitAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        [Fact]
        public async Task AssignGiftAsync_WhenSaveFailsGenerically_RollsBackAndThrowsDataAccessException()
        {
            var user = new ApplicationUser { CyberekId = 1, Id = "u1" };
            _userRepo.Setup(r => r.GetByUsernameAsync("john")).ReturnsAsync(user);
            _cyberekRepo.Setup(r => r.GetByIdAsync(5)).ReturnsAsync(Cyberek(5));
            _cyberekRepo.Setup(r => r.GetAllForUpdateAsync())
                .ReturnsAsync(new List<Cyberek> { Cyberek(1), Cyberek(5) });
            _gifting.Setup(g => g.GetAvailableToBeGiftedCyberek(It.IsAny<List<Cyberek>>(), It.IsAny<Cyberek>()))
                .Returns(5);
            _cyberekRepo.Setup(r => r.SaveChangesAsync()).ThrowsAsync(new Exception("save failed"));
            var tx = MockTransaction();
            _userRepo.Setup(r => r.BeginTransactionAsync()).ReturnsAsync(tx.Object);
            var service = CreateService();

            await Assert.ThrowsAsync<DataAccessException>(() => service.AssignGiftAsync("john"));
            tx.Verify(t => t.RollbackAsync(It.IsAny<CancellationToken>()), Times.Once);
        }

        #endregion
    }
}
