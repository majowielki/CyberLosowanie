using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore; // added for DbUpdateException

namespace CyberLosowanie.Services
{
    public class CyberekService : ICyberekService
    {
        private readonly ICyberekRepository _cyberekRepository;
        private readonly IApplicationUserRepository _userRepository;
        private readonly IGiftingService _giftingService;
        private readonly IValidationService _validationService;
        private readonly IMemoryCache _cache;
        private readonly ILogger<CyberekService> _logger;
        private readonly IAuditService _auditService;
        
        private const string ALL_CYBERKI_CACHE_KEY = "all_cyberki";
        private const int CACHE_EXPIRATION_MINUTES = 30;

        public CyberekService(
            ICyberekRepository cyberekRepository,
            IApplicationUserRepository userRepository,
            IGiftingService giftingService,
            IValidationService validationService,
            IMemoryCache cache,
            ILogger<CyberekService> logger,
            IAuditService auditService)
        {
            _cyberekRepository = cyberekRepository ?? throw new ArgumentNullException(nameof(cyberekRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _giftingService = giftingService ?? throw new ArgumentNullException(nameof(giftingService));
            _validationService = validationService ?? throw new ArgumentNullException(nameof(validationService));
            _cache = cache ?? throw new ArgumentNullException(nameof(cache));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
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
                await _auditService.LogErrorAsync(ex, null);
                throw new InvalidOperationException("Failed to retrieve cyberki", ex);
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
                await _auditService.LogErrorAsync(ex, null);
                throw new InvalidOperationException("Failed to retrieve available cyberki to pick", ex);
            }
        }

        public async Task<Cyberek> GetCyberekByIdAsync(int id)
        {
            var validationErrors = _validationService.ValidateCyberekId(id);
            if (validationErrors.Any())
            {
                await _auditService.LogWarningAsync(
                    $"Validation failed for GetCyberekByIdAsync with id {id}",
                    additionalData: new { Id = id, Errors = validationErrors });
                throw new BusinessValidationException(validationErrors);
            }

            var cyberek = await _cyberekRepository.GetByIdAsync(id);
            if (cyberek == null)
            {
                var ex = new CyberekNotFoundException(id);
                await _auditService.LogErrorAsync(ex, null);
                throw ex;
            }

            return cyberek;
        }

        public async Task<List<int>> GetAvailableGiftTargetsAsync(int cyberekId)
        {
            var validationErrors = _validationService.ValidateCyberekId(cyberekId);
            if (validationErrors.Any())
            {
                await _auditService.LogWarningAsync(
                    $"Validation failed for GetAvailableGiftTargetsAsync with cyberekId {cyberekId}",
                    additionalData: new { CyberekId = cyberekId, Errors = validationErrors });
                throw new BusinessValidationException(validationErrors);
            }

            var cyberek = await _cyberekRepository.GetByIdAsync(cyberekId);
            if (cyberek == null)
            {
                var ex = new CyberekNotFoundException(cyberekId);
                await _auditService.LogErrorAsync(ex, null);
                throw ex;
            }

            if (cyberek.GiftedCyberekId != 0)
                return new List<int> { cyberek.GiftedCyberekId };

            try
            {
                var allCyberki = await GetAllCyberkiAsync(); // Use cached version
                return _giftingService.GetAvailableToBeGiftedCyberki(
                    allCyberki.ToList(),
                    cyberek.BannedCyberki);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to calculate available gift targets for cyberek {CyberekId}", cyberekId);
                await _auditService.LogErrorAsync(ex, null);
                throw new InvalidOperationException("Failed to calculate available gift targets", ex);
            }
        }

        /// <summary>
        /// Gets the cyberek that the specified user will give a gift to.
        /// </summary>
        /// <param name="userName">Username whose gifted cyberek should be returned</param>
        /// <returns>The cyberek that will receive a gift from this user</returns>
        public async Task<Cyberek> GetGiftedCyberekForUserAsync(string userName)
        {
            if (string.IsNullOrWhiteSpace(userName))
            {
                await _auditService.LogWarningAsync(
                    "Validation failed for GetGiftedCyberekForUserAsync - empty username",
                    userName: userName);
                throw new BusinessValidationException(CyberLosowanieConstants.INVALID_USERNAME);
            }

            var applicationUser = await _userRepository.GetByUsernameAsync(userName);
            if (applicationUser == null)
            {
                var ex = new UserNotFoundException(userName);
                await _auditService.LogErrorAsync(ex, null, null, userName);
                throw ex;
            }

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
            var validationErrors = _validationService.ValidateCyberekId(cyberekId);
            if (validationErrors.Any())
            {
                await _auditService.LogWarningAsync(
                    "Validation failed for AssignCyberekToUserAsync",
                    userName: userName,
                    additionalData: new { CyberekId = cyberekId, Errors = validationErrors });
                throw new BusinessValidationException(validationErrors);
            }

            if (string.IsNullOrWhiteSpace(userName))
            {
                await _auditService.LogWarningAsync(
                    "Validation failed for AssignCyberekToUserAsync - empty username",
                    additionalData: new { CyberekId = cyberekId });
                throw new BusinessValidationException(CyberLosowanieConstants.INVALID_USERNAME);
            }

            var applicationUser = await _userRepository.GetByUsernameAsync(userName);
            if (applicationUser == null)
            {
                var ex = new UserNotFoundException(userName);
                await _auditService.LogErrorAsync(ex, null, null, userName);
                throw ex;
            }

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
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to assign cyberek {CyberekId} to user {UserName}", cyberekId, userName);
                
                // Log failed assignment
                await _auditService.LogErrorAsync(ex, null, applicationUser?.Id, userName);
                
                throw new InvalidOperationException("Failed to assign cyberek to user", ex);
            }
        }

        /// <summary>
        /// Assigns a gift target for a user's cyberek (requires user to already have a cyberek)
        /// </summary>
        /// <param name="userName">Username whose cyberek will give the gift</param>
        /// <param name="giftedCyberekId">Preferred ID of the cyberek to receive the gift (may be adjusted by algorithm)</param>
        /// <returns>ID of the cyberek that was actually assigned as the gift target</returns>
        public async Task<int> AssignGiftAsync(string userName, int giftedCyberekId)
        {
            // Validate inputs
            var validationErrors = _validationService.ValidateCyberekId(giftedCyberekId);
            if (validationErrors.Any())
            {
                await _auditService.LogWarningAsync(
                    "Validation failed for AssignGiftAsync",
                    userName: userName,
                    additionalData: new { GiftedCyberekId = giftedCyberekId, Errors = validationErrors });
                throw new BusinessValidationException(validationErrors);
            }

            if (string.IsNullOrWhiteSpace(userName))
            {
                await _auditService.LogWarningAsync(
                    "Validation failed for AssignGiftAsync - empty username",
                    additionalData: new { GiftedCyberekId = giftedCyberekId });
                throw new BusinessValidationException(CyberLosowanieConstants.INVALID_USERNAME);
            }

            var applicationUser = await _userRepository.GetByUsernameAsync(userName);
            if (applicationUser == null)
            {
                var ex = new UserNotFoundException(userName);
                await _auditService.LogErrorAsync(ex, null, null, userName);
                throw ex;
            }

            // Check if user has a cyberek assigned
            if (applicationUser.CyberekId == 0)
            {
                var ex = new InvalidGiftAssignmentException(
                    0, 
                    giftedCyberekId, 
                    "User must have a cyberek assigned before they can assign gifts. Use the assign-cyberek endpoint first.");
                await _auditService.LogWarningAsync(
                    "AssignGiftAsync called but user has no cyberek assigned.",
                    userId: applicationUser.Id,
                    userName: userName);
                throw ex;
            }
            var targetCyberek = await _cyberekRepository.GetByIdAsync(giftedCyberekId);
            if (targetCyberek == null)
            {
                var ex = new CyberekNotFoundException(giftedCyberekId);
                await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);
                throw ex;
            }

            const int maxRetries = 3;

            for (var attempt = 1; attempt <= maxRetries; attempt++)
            {
                // Use database transaction for data consistency 
                using var transaction = await _userRepository.BeginTransactionAsync();
                try
                {
                    var allCyberki = await _cyberekRepository.GetAllAsync(); // Don't use cache for transactions
                    var cyberkiList = allCyberki.ToList();

                    var cyberek = cyberkiList.FirstOrDefault(c => c.Id == applicationUser.CyberekId);
                    if (cyberek == null)
                    {
                        var ex = new CyberekNotFoundException(applicationUser.CyberekId);
                        await _auditService.LogErrorAsync(ex, null, applicationUser.Id, userName);
                        throw ex;
                    }

                    if (cyberek.GiftedCyberekId != 0)
                    {
                        var ex = new InvalidGiftAssignmentException(
                            cyberek.Id, 
                            cyberek.GiftedCyberekId, 
                            CyberLosowanieConstants.GIFT_ALREADY_ASSIGNED);
                        await _auditService.LogWarningAsync(
                            "AssignGiftAsync called but gift already assigned for cyberek.",
                            userId: applicationUser.Id,
                            userName: userName);
                        throw ex;
                    }

                    cyberek.GiftedCyberekId = _giftingService.GetAvailableToBeGiftedCyberek(
                        cyberkiList, 
                        cyberek, 
                        giftedCyberekId);
                    
                    applicationUser.GiftedCyberekId = cyberek.GiftedCyberekId;

                    await _cyberekRepository.UpdateAsync(cyberek);
                    await _userRepository.UpdateAsync(applicationUser);
                    await _cyberekRepository.SaveChangesAsync();
                    await transaction.CommitAsync();
                    
                    // Invalidate cache after successful data changes
                    _cache.Remove(ALL_CYBERKI_CACHE_KEY);
                    _logger.LogInformation("Successfully assigned gift for user {UserName} on attempt {Attempt}", userName, attempt);
                    
                    // Log successful gift assignment
                    await _auditService.LogInformationAsync(
                        $"Gift assignment completed: {userName} -> Cyberek {cyberek.GiftedCyberekId}");
                    
                    return cyberek.GiftedCyberekId;
                }
                catch (DbUpdateException dbEx) when (IsUniqueGiftConflict(dbEx))
                {
                    await transaction.RollbackAsync();

                    _logger.LogWarning(dbEx,
                        "Concurrency conflict while assigning gift for user {UserName}, attempt {Attempt}/{MaxAttempts}",
                        userName, attempt, maxRetries);

                    await _auditService.LogWarningAsync(
                        "Concurrency conflict while assigning gift (unique GiftedCyberekId violated)",
                        userId: applicationUser.Id,
                        userName: userName);

                    if (attempt == maxRetries)
                    {
                        await _auditService.LogErrorAsync(dbEx, null, applicationUser?.Id, userName);

                        throw new InvalidGiftAssignmentException(
                            applicationUser.CyberekId,
                            giftedCyberekId,
                            "Unable to assign a unique gift target due to concurrent assignments. Please try again.",
                            dbEx);
                    }

                }
                catch (Exception ex) when (!(ex is BusinessValidationException || ex is InvalidGiftAssignmentException))
                {
                    await transaction.RollbackAsync();
                    _logger.LogError(ex, "Failed to assign gift for user {UserName}", userName);
                    
                    await _auditService.LogErrorAsync(ex, null, applicationUser?.Id, userName);
                    
                    throw new InvalidOperationException("Failed to assign gift", ex);
                }
            }

            throw new InvalidOperationException("Failed to assign gift due to unexpected concurrency behaviour.");
        }

        private bool IsUniqueGiftConflict(DbUpdateException ex)
        {
            var message = ex.InnerException?.Message ?? ex.Message;
            return message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase)
                   || message.Contains("GiftedCyberekId", StringComparison.OrdinalIgnoreCase);
        }
    }
}