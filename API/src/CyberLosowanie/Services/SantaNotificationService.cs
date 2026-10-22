using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Services.Email;

namespace CyberLosowanie.Services
{
    public class SantaNotificationService : ISantaNotificationService
    {
        private readonly IApplicationUserRepository _userRepository;
        private readonly ICyberekRepository _cyberekRepository;
        private readonly IWishlistRepository _wishlistRepository;
        private readonly IEmailService _emailService;
        private readonly AppLinks _appLinks;
        private readonly ILogger<SantaNotificationService> _logger;

        public SantaNotificationService(
            IApplicationUserRepository userRepository,
            ICyberekRepository cyberekRepository,
            IWishlistRepository wishlistRepository,
            IEmailService emailService,
            AppLinks appLinks,
            ILogger<SantaNotificationService> logger)
        {
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _cyberekRepository = cyberekRepository ?? throw new ArgumentNullException(nameof(cyberekRepository));
            _wishlistRepository = wishlistRepository ?? throw new ArgumentNullException(nameof(wishlistRepository));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _appLinks = appLinks ?? throw new ArgumentNullException(nameof(appLinks));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task NotifyLetterSentAsync(int cyberekId, bool isUpdate, string? note)
        {
            try
            {
                var santa = await _userRepository.GetSantaOfCyberekAsync(cyberekId);
                if (santa == null)
                    return;

                await SendAsync(santa, cyberekId, isUpdate, note);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not notify the Santa of cyberek {CyberekId}", cyberekId);
            }
        }

        public async Task NotifyAfterDrawAsync(string santaUserId, int giftedCyberekId)
        {
            try
            {
                var wishlist = await _wishlistRepository.GetByCyberekIdAsync(giftedCyberekId);
                if (wishlist?.SentAtUtc == null)
                    return;

                var santa = await _userRepository.GetByIdAsync(santaUserId);
                if (santa == null)
                    return;

                await SendAsync(santa, giftedCyberekId, isUpdate: false, note: null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Could not send the waiting letter of cyberek {CyberekId} after the draw", giftedCyberekId);
            }
        }

        private async Task SendAsync(ApplicationUser santa, int giftedCyberekId, bool isUpdate, string? note)
        {
            if (string.IsNullOrEmpty(santa.Email) || !santa.EmailConfirmed)
                return;

            var gifted = await _cyberekRepository.GetByIdAsync(giftedCyberekId);
            if (gifted == null)
                return;

            var fullName = $"{gifted.Name} {gifted.Surname}";
            var link = _appLinks.Build(EmailConstants.GIFTED_WISHLIST_PATH);
            var message = isUpdate
                ? EmailTemplates.LetterUpdated(santa.Email, santa.PreferredLanguage, fullName, link, note)
                : EmailTemplates.LetterReceived(santa.Email, santa.PreferredLanguage, fullName, link, note);

            await _emailService.SendAsync(message);
            _logger.LogInformation("Santa of cyberek {CyberekId} notified (update: {IsUpdate})", giftedCyberekId, isUpdate);
        }
    }
}
