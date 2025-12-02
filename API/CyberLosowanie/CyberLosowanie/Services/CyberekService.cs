using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using Microsoft.Extensions.Caching.Memory;

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
                throw new InvalidOperationException("Failed to retrieve available cyberki to pick", ex);
            }
        }

        public async Task<Cyberek> GetCyberekByIdAsync(int id)
        {
            var validationErrors = _validationService.ValidateCyberekId(id);
            if (validationErrors.Any())
            {
                throw new BusinessValidationException(validationErrors);
            }

            var cyberek = await _cyberekRepository.GetByIdAsync(id);
            if (cyberek == null)
            {
                throw new CyberekNotFoundException(id);
            }

            return cyberek;
        }

        public async Task<List<int>> GetAvailableGiftTargetsAsync(int cyberekId)
        {
            var validationErrors = _validationService.ValidateCyberekId(cyberekId);
            if (validationErrors.Any())
            {
                throw new BusinessValidationException(validationErrors);
            }

            var cyberek = await _cyberekRepository.GetByIdAsync(cyberekId);
            if (cyberek == null)
            {
                throw new CyberekNotFoundException(cyberekId);
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
                throw new BusinessValidationException(CyberLosowanieConstants.INVALID_USERNAME);
            }

            var applicationUser = await _userRepository.GetByUsernameAsync(userName);
            if (applicationUser == null)
            {
                throw new UserNotFoundException(userName);
            }

            if (applicationUser.GiftedCyberekId == 0)
            {
                throw new InvalidGiftAssignmentException(0, 0, "User does not have a gifted cyberek assigned yet.");
            }

            var cyberek = await _cyberekRepository.GetByIdAsync(applicationUser.GiftedCyberekId);
            if (cyberek == null)
            {
                throw new CyberekNotFoundException(applicationUser.GiftedCyberekId);
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
                throw new BusinessValidationException(validationErrors);
            }

            if (string.IsNullOrWhiteSpace(userName))
            {
                throw new BusinessValidationException(CyberLosowanieConstants.INVALID_USERNAME);
            }

            var applicationUser = await _userRepository.GetByUsernameAsync(userName);
            if (applicationUser == null)
            {
                throw new UserNotFoundException(userName);
            }

            // Check if user already has a cyberek assigned
            if (applicationUser.CyberekId != 0)
            {
                return false; // User already has a cyberek
            }

            // Validate that the cyberek exists
            var cyberek = await _cyberekRepository.GetByIdAsync(cyberekId);
            if (cyberek == null)
            {
                throw new CyberekNotFoundException(cyberekId);
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
                throw new BusinessValidationException(validationErrors);
            }

            if (string.IsNullOrWhiteSpace(userName))
            {
                throw new BusinessValidationException(CyberLosowanieConstants.INVALID_USERNAME);
            }

            var applicationUser = await _userRepository.GetByUsernameAsync(userName);
            if (applicationUser == null)
            {
                throw new UserNotFoundException(userName);
            }

            // Check if user has a cyberek assigned
            if (applicationUser.CyberekId == 0)
            {
                throw new InvalidGiftAssignmentException(
                    0, 
                    giftedCyberekId, 
                    "User must have a cyberek assigned before they can assign gifts. Use the assign-cyberek endpoint first.");
            }

            // Validate that the target cyberek exists
            var targetCyberek = await _cyberekRepository.GetByIdAsync(giftedCyberekId);
            if (targetCyberek == null)
            {
                throw new CyberekNotFoundException(giftedCyberekId);
            }

            // Use database transaction for data consistency
            using var transaction = await _userRepository.BeginTransactionAsync();
            try
            {
                var allCyberki = await _cyberekRepository.GetAllAsync(); // Don't use cache for transactions
                var cyberkiList = allCyberki.ToList();

                var cyberek = cyberkiList.FirstOrDefault(c => c.Id == applicationUser.CyberekId);
                if (cyberek == null)
                {
                    throw new CyberekNotFoundException(applicationUser.CyberekId);
                }

                if (cyberek.GiftedCyberekId != 0)
                {
                    throw new InvalidGiftAssignmentException(
                        cyberek.Id, 
                        cyberek.GiftedCyberekId, 
                        CyberLosowanieConstants.GIFT_ALREADY_ASSIGNED);
                }

                // Use the gifting service to determine the best (globally valid) gift assignment
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
                _logger.LogInformation("Successfully assigned gift for user {UserName}", userName);
                
                // Log successful gift assignment
                await _auditService.LogInformationAsync(
                    $"Gift assignment completed: {userName} -> Cyberek {cyberek.GiftedCyberekId}",
                    additionalData: new 
                    { 
                        UserId = applicationUser.Id, 
                        UserName = userName,
                        CyberekId = cyberek.Id,
                        GiftedCyberekId = cyberek.GiftedCyberekId
                    }
                );
                
                // Return the actual assigned gifted cyberek ID
                return cyberek.GiftedCyberekId;
            }
            catch (Exception ex) when (!(ex is BusinessValidationException || ex is InvalidGiftAssignmentException))
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Failed to assign gift for user {UserName}", userName);
                
                // Log failed gift assignment
                await _auditService.LogErrorAsync(ex, null, applicationUser?.Id, userName);
                
                throw new InvalidOperationException("Failed to assign gift", ex);
            }
        }
    }
}