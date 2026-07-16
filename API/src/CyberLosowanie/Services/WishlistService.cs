using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace CyberLosowanie.Services
{
    public class WishlistService : IWishlistService
    {
        private readonly IWishlistRepository _wishlistRepository;
        private readonly IApplicationUserRepository _userRepository;
        private readonly IWishlistImageStorage _imageStorage;
        private readonly ILogger<WishlistService> _logger;
        private readonly IAuditService _auditService;

        // Magic-byte signatures of the allowed upload formats. Content-Type headers
        // are client-controlled and not trusted.
        private static readonly byte[] JpegSignature = [0xFF, 0xD8, 0xFF];
        private static readonly byte[] PngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        private const int SignatureHeaderLength = 12; // RIFF????WEBP needs 12 bytes

        public WishlistService(
            IWishlistRepository wishlistRepository,
            IApplicationUserRepository userRepository,
            IWishlistImageStorage imageStorage,
            ILogger<WishlistService> logger,
            IAuditService auditService)
        {
            _wishlistRepository = wishlistRepository ?? throw new ArgumentNullException(nameof(wishlistRepository));
            _userRepository = userRepository ?? throw new ArgumentNullException(nameof(userRepository));
            _imageStorage = imageStorage ?? throw new ArgumentNullException(nameof(imageStorage));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
        }

        public async Task<WishlistResponse?> GetMyWishlistAsync(string userName)
        {
            var user = await GetRequiredUserAsync(userName, nameof(GetMyWishlistAsync));
            var cyberekId = EnsureCyberekSelected(user);

            var wishlist = await _wishlistRepository.GetByCyberekIdAsync(cyberekId);
            return wishlist?.ToResponse();
        }

        public async Task<WishlistResponse> SaveMyWishlistAsync(string userName, string canvasJson)
        {
            var user = await GetRequiredUserAsync(userName, nameof(SaveMyWishlistAsync));
            var cyberekId = EnsureCyberekSelected(user);

            var (document, errors) = CanvasDocumentValidator.Parse(canvasJson, cyberekId);
            if (document == null)
            {
                await _auditService.LogWarningAsync(
                    "Wishlist document rejected by validation.",
                    userId: user.Id,
                    userName: userName,
                    additionalData: new { CyberekId = cyberekId, Errors = errors });
                throw new BusinessValidationException(errors);
            }

            // Only the validated, re-serialized form is stored — never raw client JSON.
            var canonicalJson = CanvasDocumentValidator.ToCanonicalJson(document);
            var wishlist = await UpsertAsync(cyberekId, canonicalJson, userName);

            await _auditService.LogInformationAsync(
                $"Wishlist saved for cyberek {cyberekId}",
                userId: user.Id,
                userName: userName);

            // Best-effort: blobs uploaded but no longer referenced (undone inserts,
            // overwritten versions) are removed. A cleanup failure must not fail the
            // save — the document is already committed.
            await CleanUpOrphanedImagesAsync(cyberekId, CanvasDocumentValidator.GetReferencedImagePaths(document));

            return wishlist.ToResponse();
        }

        public async Task<WishlistResponse?> GetGiftedWishlistAsync(string userName)
        {
            var user = await GetRequiredUserAsync(userName, nameof(GetGiftedWishlistAsync));

            if (user.GiftedCyberekId == 0)
            {
                await _auditService.LogWarningAsync(
                    "GetGiftedWishlistAsync called before the draw was completed.",
                    userId: user.Id,
                    userName: userName);
                throw new WishlistConflictException(WishlistConstants.DRAW_NOT_COMPLETED);
            }

            var wishlist = await _wishlistRepository.GetByCyberekIdAsync(user.GiftedCyberekId);
            return wishlist?.ToResponse();
        }

        public async Task<UploadImageResponse> UploadImageAsync(string userName, Stream content, long contentLength)
        {
            var user = await GetRequiredUserAsync(userName, nameof(UploadImageAsync));
            var cyberekId = EnsureCyberekSelected(user);

            if (contentLength <= 0 || contentLength > WishlistConstants.MAX_IMAGE_UPLOAD_BYTES)
            {
                throw new BusinessValidationException(WishlistConstants.IMAGE_TOO_LARGE);
            }

            // Buffer the upload so the signature can be inspected and the stream
            // rewound for the storage client (5 MB cap makes this safe).
            using var buffered = new MemoryStream();
            await content.CopyToAsync(buffered);

            if (buffered.Length > WishlistConstants.MAX_IMAGE_UPLOAD_BYTES)
            {
                throw new BusinessValidationException(WishlistConstants.IMAGE_TOO_LARGE);
            }

            var extension = DetectImageExtension(buffered);
            if (extension == null)
            {
                await _auditService.LogWarningAsync(
                    "Wishlist image upload rejected: unrecognized file signature.",
                    userId: user.Id,
                    userName: userName);
                throw new BusinessValidationException(WishlistConstants.INVALID_IMAGE_FILE);
            }

            var path = $"{cyberekId}/{Guid.NewGuid():N}.{extension}";
            buffered.Position = 0;
            await _imageStorage.UploadAsync(path, buffered, GetContentTypeForExtension(extension));

            await _auditService.LogInformationAsync(
                $"Wishlist image uploaded: {path}",
                userId: user.Id,
                userName: userName);

            return new UploadImageResponse { Path = path };
        }

        public async Task<WishlistImageResult?> GetImageAsync(string userName, int cyberekId, string fileName)
        {
            var user = await GetRequiredUserAsync(userName, nameof(GetImageAsync));

            // Same visibility rule as the wishlist itself (decision D3):
            // the owner and their Santa — nobody else.
            if (user.CyberekId != cyberekId && user.GiftedCyberekId != cyberekId)
            {
                await _auditService.LogWarningAsync(
                    "Wishlist image access denied.",
                    userId: user.Id,
                    userName: userName,
                    additionalData: new { RequestedCyberekId = cyberekId, FileName = fileName });
                throw new ForbiddenAccessException(WishlistConstants.IMAGE_ACCESS_DENIED);
            }

            // The file name is part of a blob path — accept only the exact format the
            // upload endpoint produces (no traversal, no wildcards).
            if (!CanvasDocumentValidator.ImageFileNameRegex.IsMatch(fileName))
            {
                throw new BusinessValidationException("Invalid image file name.");
            }

            var download = await _imageStorage.DownloadAsync($"{cyberekId}/{fileName}");
            return download == null ? null : new WishlistImageResult(download.Value.Content, download.Value.ContentType);
        }

        private async Task<Wishlist> UpsertAsync(int cyberekId, string canonicalJson, string userName)
        {
            var existing = await _wishlistRepository.GetByCyberekIdAsync(cyberekId);
            if (existing != null)
            {
                existing.CanvasJson = canonicalJson;
                existing.UpdatedAtUtc = DateTime.UtcNow;
                await _wishlistRepository.SaveChangesAsync();
                return existing;
            }

            var wishlist = new Wishlist
            {
                CyberekId = cyberekId,
                CanvasJson = canonicalJson,
                UpdatedAtUtc = DateTime.UtcNow
            };

            try
            {
                await _wishlistRepository.AddAsync(wishlist);
                await _wishlistRepository.SaveChangesAsync();
                return wishlist;
            }
            catch (DbUpdateException ex) when (IsUniqueConflict(ex))
            {
                // Two first saves raced; the unique index on CyberekId won. Retry as an
                // update — for an upsert "last write wins" is the intended semantics.
                _logger.LogWarning(ex, "Concurrent first wishlist save for cyberek {CyberekId}; retrying as update", cyberekId);
                await _auditService.LogWarningAsync(
                    "Concurrent wishlist insert resolved as update.",
                    userName: userName,
                    additionalData: new { CyberekId = cyberekId });

                var current = await _wishlistRepository.GetByCyberekIdAsync(cyberekId)
                    ?? throw new DataAccessException("Failed to save wishlist after a concurrent insert.", ex);
                current.CanvasJson = canonicalJson;
                current.UpdatedAtUtc = DateTime.UtcNow;
                await _wishlistRepository.SaveChangesAsync();
                return current;
            }
        }

        private async Task CleanUpOrphanedImagesAsync(int cyberekId, HashSet<string> referencedPaths)
        {
            try
            {
                var storedPaths = await _imageStorage.ListPathsAsync($"{cyberekId}/");
                foreach (var path in storedPaths.Where(p => !referencedPaths.Contains(p)))
                {
                    await _imageStorage.DeleteAsync(path);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Orphaned wishlist image cleanup failed for cyberek {CyberekId}", cyberekId);
            }
        }

        // Shared guard for every user-scoped operation — same pattern as CyberekService.
        private async Task<ApplicationUser> GetRequiredUserAsync(string userName, string operation)
        {
            if (string.IsNullOrWhiteSpace(userName))
            {
                await _auditService.LogWarningAsync($"Validation failed for {operation} - empty username");
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

        // A wishlist belongs to a Cyberek, so a user without one has no wishlist yet —
        // a state conflict (409), not a validation error.
        private static int EnsureCyberekSelected(ApplicationUser user)
        {
            if (user.CyberekId == 0)
            {
                throw new WishlistConflictException(WishlistConstants.CYBEREK_NOT_SELECTED);
            }
            return user.CyberekId;
        }

        private static string? DetectImageExtension(MemoryStream buffered)
        {
            if (buffered.Length < SignatureHeaderLength)
            {
                return null;
            }

            Span<byte> header = stackalloc byte[SignatureHeaderLength];
            buffered.Position = 0;
            buffered.ReadExactly(header);

            if (header[..JpegSignature.Length].SequenceEqual(JpegSignature))
            {
                return "jpg";
            }
            if (header[..PngSignature.Length].SequenceEqual(PngSignature))
            {
                return "png";
            }
            // WebP: "RIFF" <4-byte size> "WEBP"
            if (header[..4].SequenceEqual("RIFF"u8) && header[8..12].SequenceEqual("WEBP"u8))
            {
                return "webp";
            }
            return null;
        }

        private static string GetContentTypeForExtension(string extension) => extension switch
        {
            "jpg" => "image/jpeg",
            "png" => "image/png",
            "webp" => "image/webp",
            _ => "application/octet-stream"
        };

        private static bool IsUniqueConflict(DbUpdateException ex)
        {
            // SQL Server unique-index violation numbers (2601/2627) — same detection
            // as CyberekService.IsUniqueGiftConflict.
            return ex.InnerException is SqlException sqlEx && sqlEx.Number is 2601 or 2627;
        }
    }
}
