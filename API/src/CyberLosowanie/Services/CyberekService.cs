using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore; // added for DbUpdateException
using Microsoft.Data.SqlClient; // SqlException for unique-constraint detection

namespace CyberLosowanie.Services
{
    public class CyberekService : ICyberekService
    {
        private readonly ICyberekRepository _cyberekRepository;
        private readonly IApplicationUserRepository _userRepository;
        private readonly IGiftingService _giftingService;
        private readonly IMemoryCache _cache;
        private readonly ILogger<CyberekService> _logger;
        private readonly IAuditService _auditService;

        private const string ALL_CYBERKI_CACHE_KEY = "all_cyberki";
        private const int CACHE_EXPIRATION_MINUTES = 30;

        public CyberekService(
            ICyberekRepository cyberekRepository,
            IApplicationUserRepository userRepository,
            IGiftingService giftingService,
            IMemoryCache cache,
            ILogger<CyberekService> logger,
            IAuditService auditService)
        {
            _cyberekRepository = cyberekRepository ?? throw new ArgumentNullException(nameof(cyberekRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _giftingService = giftingService ?? throw new ArgumentNullException(nameof(giftingService));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
        }

        // Domain guard: cyberek ids form a closed range defined by the seed (MIN..MAX).
        // Kept in the service (not the boundary) so every caller of the domain layer
        // gets the same rule regardless of the entry point.
        private async Task EnsureValidCyberekIdAsync(int cyberekId, string operation, string? userName = null)
        {
            if (cyberekId is >= CyberLosowanieConstants.MIN_CYBEREK_ID
                          and <= CyberLosowanieConstants.MAX_CYBEREK_ID)
            {
                return;
            }

            await _auditService.LogWarningAsync(
                $"Validation failed for {operation} with cyberekId {cyberekId}",
                userName: userName,
                additionalData: new { CyberekId = cyberekId, Error = CyberLosowanieConstants.INVALID_CYBEREK_ID });
            throw new BusinessValidationException(CyberLosowanieConstants.INVALID_CYBEREK_ID);
        }

        // Shared guard for every user-scoped operation: non-empty username + existing user.
        private async Task<ApplicationUser> GetRequiredUserAsync(string userName, string operation)
        {
            if (string.IsNullOrWhiteSpace(userName))
            {
                await _auditService.LogWarningAsync(
                    $"Validation failed for {operation} - empty username");
                throw new BusinessValidationException(CyberLosowanieConstants.INVALID_USERNAME);
            }

            var applicationUser = await _userRepository.GetByUsernameAsync(userName);
            if (applicationUser == null)
            {
                var ex = new UserNotFoundException(userName);
                await _auditService.LogErrorAsync(ex, null, null, userName);
                throw ex;
            }

            return applicationUser;
        }

        public async Task<IEnumerable<Cyberek>> GetAllCyberkiAsync()
        {
            try
            {
                if (_cache.TryGetValue(ALL_CYBERKI_CACHE_KEY, out IEnumerable<Cyberek>? cachedCyberki))
                {
                    _logger.LogDebug("Retrieved cyberki from cache");
                    return cachedCyberki!;
                }

                var cyberki = await _cyberekRepository.GetAllAsync();
                
                _cache.Set(ALL_CYBERKI_CACHE_KEY, cyberki, TimeSpan.FromMinutes(CACHE_EXPIRATION_MINUTES));
                _logger.LogDebug("Cached cyberki for {Minutes} minutes", CACHE_EXPIRATION_MINUTES);
                
                return cyberki;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve cyberki");
                await _auditService.LogErrorAsync(ex, context: null);
                throw new DataAccessException("Failed to retrieve cyberki", ex);
            }
        }

        public async Task<IEnumerable<Cyberek>> GetAvailableToPickCyberkiAsync()
        {
            try
            {
                // Get all cyberki and all users
                var allCyberki = await GetAllCyberkiAsync(); // Use cached version
                var allUsers = await _userRepository.GetAllAsync();
                
                // Get IDs of cyberki that are already assigned to users
                var assignedCyberkiIds = allUsers
                    .Where(u => u.CyberekId != 0)
                    .Select(u => u.CyberekId)
                    .ToHashSet();
                
                // Return only cyberki that haven't been assigned to any user
                var availableCyberki = allCyberki.Where(c => !assignedCyberkiIds.Contains(c.Id));
                
                _logger.LogDebug("Found {Count} available cyberki to pick from {Total} total cyberki", 
                    availableCyberki.Count(), allCyberki.Count());
                
                return availableCyberki;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to retrieve available cyberki to pick");
                await _auditService.LogErrorAsync(ex, context: null);
                throw new DataAccessException("Failed to retrieve available cyberki to pick", ex);
            }
        }

        public async Task<Cyberek> GetCyberekByIdAsync(int id)
        {
            await EnsureValidCyberekIdAsync(id, nameof(GetCyberekByIdAsync));

            var cyberek = await _cyberekRepository.GetByIdAsync(id);
            if (cyberek == null)
            {
                var ex = new CyberekNotFoundException(id);
                await _auditService.LogErrorAsync(ex, context: null);
                throw ex;
            }

            return cyberek;
        }

        public async Task<List<int>> GetAvailableGiftTargetsForUserAsync(string userName)
        {
            var applicationUser = await GetRequiredUserAsync(userName, nameof(GetAvailableGiftTargetsForUserAsync));

            if (applicationUser.CyberekId == 0)
            {
                var ex = new InvalidGiftAssignmentException(0, 0,
                    "User must have a cyberek assigned before they can see gift targets. Use the assign-cyberek endpoint first.");
                await _auditService.LogWarningAsync(
                    "GetAvailableGiftTargetsForUserAsync called but user has no cyberek assigned.",
                    userId: applicationUser.Id,
                    userName: userName);
                throw ex;
            }

            // Owner may see their own (already drawn) target — and only their own.
            // Other users' assignments are never exposed through this endpoint.
            if (applicationUser.GiftedCyberekId != 0)
                return new List<int> { applicationUser.GiftedCyberekId };

            var allCyberki = (await GetAllCyberkiAsync()).ToList(); // Use cached version
            var giver = allCyberki.FirstOrDefault(c => c.Id == applicationUser.CyberekId);
            if (giver == null)
            {
                var ex = new CyberekNotFoundException(applicationUser.CyberekId);
                await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);
                throw ex;
            }

            try
            {
                // Only choices that keep the draw completable for everyone else are shown,
                // so an honest client can never pick a dead-end box. While the state is
                // feasible this list is provably non-empty for a giver who has not drawn.
                return _giftingService.GetSafeTargets(allCyberki, giver);
            }
            catch (Exception ex) when (ex is not DomainException)
            {
                _logger.LogError(ex, "Failed to calculate safe gift targets for user {UserName}", userName);
                await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);
                throw new DataAccessException("Failed to calculate available gift targets", ex);
            }
        }

        /// <summary>
        /// Gets the cyberek that the specified user will give a gift to.
        /// </summary>
        /// <param name="userName">Username whose gifted cyberek should be returned</param>
        /// <returns>The cyberek that will receive a gift from this user</returns>
        public async Task<Cyberek> GetGiftedCyberekForUserAsync(string userName)
        {
            var applicationUser = await GetRequiredUserAsync(userName, nameof(GetGiftedCyberekForUserAsync));

            if (applicationUser.GiftedCyberekId == 0)
            {
                var ex = new InvalidGiftAssignmentException(0, 0, "User does not have a gifted cyberek assigned yet.");
                await _auditService.LogWarningAsync(
                    "User requested gifted cyberek before assignment.",
                    userId: applicationUser.Id,
                    userName: userName);
                throw ex;
            }

            var cyberek = await _cyberekRepository.GetByIdAsync(applicationUser.GiftedCyberekId);
            if (cyberek == null)
            {
                var ex = new CyberekNotFoundException(applicationUser.GiftedCyberekId);
                await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);
                throw ex;
            }

            return cyberek;
        }

        /// <summary>
        /// Assigns a cyberek to a user (one-time setup operation)
        /// </summary>
        /// <param name="userName">Username to assign cyberek to</param>
        /// <param name="cyberekId">ID of the cyberek to assign</param>
        /// <returns>True if assignment was successful, False if user already has a cyberek</returns>
        public async Task<bool> AssignCyberekToUserAsync(string userName, int cyberekId)
        {
            // Validate inputs
            await EnsureValidCyberekIdAsync(cyberekId, nameof(AssignCyberekToUserAsync), userName);
            var applicationUser = await GetRequiredUserAsync(userName, nameof(AssignCyberekToUserAsync));

            // Check if user already has a cyberek assigned
            if (applicationUser.CyberekId != 0)
            {
                await _auditService.LogInformationAsync(
                    "AssignCyberekToUserAsync called but user already has a cyberek.",
                    userId: applicationUser.Id,
                    userName: userName,
                    additionalData: new { ExistingCyberekId = applicationUser.CyberekId, RequestedCyberekId = cyberekId });
                return false; // User already has a cyberek
            }

            // Validate that the cyberek exists
            var cyberek = await _cyberekRepository.GetByIdAsync(cyberekId);
            if (cyberek == null)
            {
                var ex = new CyberekNotFoundException(cyberekId);
                await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);
                throw ex;
            }

            // Use database transaction for data consistency
            using var transaction = await _userRepository.BeginTransactionAsync();
            try
            {
                applicationUser.CyberekId = cyberekId;
                await _userRepository.UpdateAsync(applicationUser);
                await _userRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                // Invalidate cache after data changes
                _cache.Remove(ALL_CYBERKI_CACHE_KEY);

                // Log successful assignment
                await _auditService.LogInformationAsync(
                    $"User {userName} assigned to cyberek {cyberekId}",
                    additionalData: new { UserId = applicationUser.Id, CyberekId = cyberekId }
                );

                return true;
            }
            catch (Exception ex) when (ex is not DomainException)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to assign cyberek {CyberekId} to user {UserName}", cyberekId, userName);

                // Log failed assignment
                await _auditService.LogErrorAsync(ex, null, applicationUser?.Id, userName);

                throw new DataAccessException("Failed to assign cyberek to user", ex);
            }
        }

        /// <summary>
        /// Commits the user's chosen gift target (the box they opened). The choice is
        /// validated from scratch inside a serialized transaction — see AcquireDrawLockAsync
        /// for why serialization is required beyond the unique index.
        /// </summary>
        /// <param name="userName">Username whose cyberek gives the gift</param>
        /// <param name="chosenTargetId">The box (cyberek id) the user chose</param>
        /// <returns>ID of the committed gift target (echoes the accepted choice)</returns>
        public async Task<int> AssignGiftAsync(string userName, int chosenTargetId)
        {
            await EnsureValidCyberekIdAsync(chosenTargetId, nameof(AssignGiftAsync), userName);
            var applicationUser = await GetRequiredUserAsync(userName, nameof(AssignGiftAsync));

            // Check if user has a cyberek assigned
            if (applicationUser.CyberekId == 0)
            {
                var ex = new InvalidGiftAssignmentException(
                    0,
                    chosenTargetId,
                    "User must have a cyberek assigned before they can assign gifts. Use the assign-cyberek endpoint first.");
                await _auditService.LogWarningAsync(
                    "AssignGiftAsync called but user has no cyberek assigned.",
                    userId: applicationUser.Id,
                    userName: userName);
                throw ex;
            }

            using var transaction = await _userRepository.BeginTransactionAsync();
            try
            {
                // One draw commit at a time: two users validating different targets against
                // the same snapshot can each pass alone yet jointly strand a third person.
                await _cyberekRepository.AcquireDrawLockAsync();

                // Tracked read (F4): entities are change-tracked so the mutation below
                // is saved directly, not via a detached AsNoTracking instance.
                var cyberkiList = await _cyberekRepository.GetAllForUpdateAsync();

                var giver = cyberkiList.FirstOrDefault(c => c.Id == applicationUser.CyberekId);
                if (giver == null)
                {
                    var ex = new CyberekNotFoundException(applicationUser.CyberekId);
                    await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);
                    throw ex;
                }

                if (giver.GiftedCyberekId != 0)
                {
                    var ex = new InvalidGiftAssignmentException(
                        giver.Id,
                        giver.GiftedCyberekId,
                        CyberLosowanieConstants.GIFT_ALREADY_ASSIGNED);
                    await _auditService.LogWarningAsync(
                        "AssignGiftAsync called but gift already assigned for cyberek.",
                        userId: applicationUser.Id,
                        userName: userName);
                    throw ex;
                }

                // Self/banned targets are never shown as available — an honest client
                // cannot send them. Treat as a bad request, not a race.
                if (chosenTargetId == giver.Id || giver.BannedCyberki?.Contains(chosenTargetId) == true)
                {
                    await _auditService.LogWarningAsync(
                        "AssignGiftAsync called with a target that is never allowed for this giver (self or banned).",
                        userId: applicationUser.Id,
                        userName: userName,
                        additionalData: new { GiverCyberekId = giver.Id, ChosenTargetId = chosenTargetId });
                    throw new BusinessValidationException("The chosen target is not allowed for this user.");
                }

                // Race outcomes → 409: the box was available when displayed but is not anymore.
                if (cyberkiList.Any(c => c.GiftedCyberekId == chosenTargetId))
                {
                    await _auditService.LogWarningAsync(
                        "AssignGiftAsync race: chosen target already taken.",
                        userId: applicationUser.Id,
                        userName: userName,
                        additionalData: new { GiverCyberekId = giver.Id, ChosenTargetId = chosenTargetId });
                    throw new GiftTargetUnavailableException(giver.Id, chosenTargetId,
                        "This box has just been taken by another participant. Refresh the list and choose a different one.");
                }

                if (!_giftingService.IsChoiceSafe(cyberkiList, giver, chosenTargetId))
                {
                    await _auditService.LogWarningAsync(
                        "AssignGiftAsync race: chosen target would strand another participant.",
                        userId: applicationUser.Id,
                        userName: userName,
                        additionalData: new { GiverCyberekId = giver.Id, ChosenTargetId = chosenTargetId });
                    throw new GiftTargetUnavailableException(giver.Id, chosenTargetId,
                        "Choosing this box would leave another participant without any valid option. Refresh the list and choose a different one.");
                }

                giver.GiftedCyberekId = chosenTargetId;
                applicationUser.GiftedCyberekId = chosenTargetId;

                await _cyberekRepository.UpdateAsync(giver);
                await _userRepository.UpdateAsync(applicationUser);
                await _cyberekRepository.SaveChangesAsync();
                await transaction.CommitAsync();

                // Invalidate cache after successful data changes
                _cache.Remove(ALL_CYBERKI_CACHE_KEY);
                _logger.LogInformation("Gift assignment committed for user {UserName}", userName);

                // Log successful gift assignment
                await _auditService.LogInformationAsync(
                    $"Gift assignment completed: {userName} -> Cyberek {chosenTargetId}");

                return chosenTargetId;
            }
            catch (DbUpdateException dbEx) when (IsUniqueGiftConflict(dbEx))
            {
                // Last line of defense — with the draw lock in place this should not happen.
                await transaction.RollbackAsync();
                _logger.LogWarning(dbEx, "Unique-index conflict while committing gift for user {UserName}", userName);
                await _auditService.LogErrorAsync(dbEx, null, applicationUser.Id, userName);

                throw new GiftTargetUnavailableException(applicationUser.CyberekId, chosenTargetId,
                    "This box has just been taken by another participant. Refresh the list and choose a different one.",
                    dbEx);
            }
            catch (Exception ex) when (ex is not DomainException)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to assign gift for user {UserName}", userName);

                await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);

                throw new DataAccessException("Failed to assign gift", ex);
            }
        }

        private static bool IsUniqueGiftConflict(DbUpdateException ex)
        {
            // SQL Server error numbers for a unique-index/constraint violation:
            //   2601 = cannot insert duplicate key row in object with unique index
            //   2627 = violation of unique constraint
            return ex.InnerException is SqlException sqlEx
                   && (sqlEx.Number == 2601 || sqlEx.Number == 2627);
        }
    }
}