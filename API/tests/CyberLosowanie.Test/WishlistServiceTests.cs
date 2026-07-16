using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Services;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Text;
using System.Text.Json;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Unit tests for the wishlist orchestration layer: document validation (section
    /// 3.4 limits), upsert semantics, draw-state guards, image upload validation and
    /// the owner-or-Santa access rule — all with mocked collaborators (I4).
    /// </summary>
    public class WishlistServiceTests
    {
        private const string UserName = "alice";
        private const int OwnCyberekId = 3;
        private const int GiftedCyberekId = 7;

        private readonly Mock<IWishlistRepository> _wishlistRepo = new();
        private readonly Mock<IApplicationUserRepository> _userRepo = new();
        private readonly Mock<IWishlistImageStorage> _storage = new();
        private readonly Mock<IAuditService> _audit = new();

        public WishlistServiceTests()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync(UserName))
                .ReturnsAsync(new ApplicationUser
                {
                    Id = "user-1",
                    UserName = UserName,
                    CyberekId = OwnCyberekId,
                    GiftedCyberekId = GiftedCyberekId
                });
        }

        private WishlistService CreateService() => new(
            _wishlistRepo.Object,
            _userRepo.Object,
            _storage.Object,
            NullLogger<WishlistService>.Instance,
            _audit.Object);

        private void SetupUser(int cyberekId, int giftedCyberekId) =>
            _userRepo.Setup(r => r.GetByUsernameAsync(UserName))
                .ReturnsAsync(new ApplicationUser
                {
                    Id = "user-1",
                    UserName = UserName,
                    CyberekId = cyberekId,
                    GiftedCyberekId = giftedCyberekId
                });

        private static string BuildCanvasJson(
            int version = WishlistConstants.CANVAS_DOCUMENT_VERSION,
            int width = WishlistConstants.CANVAS_WIDTH,
            int height = WishlistConstants.CANVAS_HEIGHT,
            string background = "#ffffff",
            object[]? strokes = null,
            object[]? items = null)
        {
            return JsonSerializer.Serialize(new
            {
                version,
                canvas = new { width, height, background },
                strokes = strokes ?? Array.Empty<object>(),
                items = items ?? Array.Empty<object>()
            });
        }

        private static object Stroke(string tool = "pen", string color = "#e11d48", double width = 6, double[]? points = null) =>
            new { id = Guid.NewGuid().ToString("N"), tool, color, width, points = points ?? new double[] { 1, 2, 3, 4 } };

        private static object TextItem(string text = "Lego Technic", double fontSize = 36) =>
            new { id = Guid.NewGuid().ToString("N"), type = "text", text, x = 10.0, y = 20.0, rotation = 0.0, fontSize, fill = "#111827", width = 400.0 };

        private static object ImageItem(string path) =>
            new { id = Guid.NewGuid().ToString("N"), type = "image", path, x = 5.0, y = 5.0, rotation = 0.0, width = 300.0, height = 200.0 };

        private static string OwnImagePath(int cyberekId = OwnCyberekId) =>
            $"{cyberekId}/{Guid.NewGuid():N}.png";

        #region Constructor guards

        [Fact]
        public void Constructor_NullDependencies_ThrowArgumentNullException()
        {
            var repo = _wishlistRepo.Object;
            var users = _userRepo.Object;
            var storage = _storage.Object;
            var logger = NullLogger<WishlistService>.Instance;
            var audit = _audit.Object;

            Assert.Throws<ArgumentNullException>(() => new WishlistService(null!, users, storage, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new WishlistService(repo, null!, storage, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new WishlistService(repo, users, null!, logger, audit));
            Assert.Throws<ArgumentNullException>(() => new WishlistService(repo, users, storage, null!, audit));
            Assert.Throws<ArgumentNullException>(() => new WishlistService(repo, users, storage, logger, null!));
        }

        #endregion

        #region GetMyWishlistAsync

        [Fact]
        public async Task GetMyWishlistAsync_NoWishlistSavedYet_ReturnsNull()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(OwnCyberekId)).ReturnsAsync((Wishlist?)null);

            var result = await CreateService().GetMyWishlistAsync(UserName);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetMyWishlistAsync_WishlistExists_ReturnsItsContent()
        {
            var updatedAt = DateTime.UtcNow.AddMinutes(-5);
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(OwnCyberekId))
                .ReturnsAsync(new Wishlist { CyberekId = OwnCyberekId, CanvasJson = "{}", UpdatedAtUtc = updatedAt });

            var result = await CreateService().GetMyWishlistAsync(UserName);

            result.Should().NotBeNull();
            result!.CanvasJson.Should().Be("{}");
            result.UpdatedAtUtc.Should().Be(updatedAt);
        }

        [Fact]
        public async Task GetMyWishlistAsync_UserHasNoCyberekSelected_ThrowsWishlistConflict()
        {
            SetupUser(cyberekId: 0, giftedCyberekId: 0);

            await Assert.ThrowsAsync<WishlistConflictException>(
                () => CreateService().GetMyWishlistAsync(UserName));
        }

        [Fact]
        public async Task GetMyWishlistAsync_UnknownUser_ThrowsUserNotFound()
        {
            _userRepo.Setup(r => r.GetByUsernameAsync("ghost")).ReturnsAsync((ApplicationUser?)null);

            await Assert.ThrowsAsync<UserNotFoundException>(
                () => CreateService().GetMyWishlistAsync("ghost"));
        }

        [Fact]
        public async Task GetMyWishlistAsync_EmptyUserName_ThrowsBusinessValidation()
        {
            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().GetMyWishlistAsync("  "));
        }

        #endregion

        #region SaveMyWishlistAsync — upsert

        [Fact]
        public async Task SaveMyWishlistAsync_FirstSave_CreatesWishlist()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(OwnCyberekId)).ReturnsAsync((Wishlist?)null);
            Wishlist? added = null;
            _wishlistRepo.Setup(r => r.AddAsync(It.IsAny<Wishlist>()))
                .Callback<Wishlist>(w => added = w)
                .Returns(Task.CompletedTask);
            _storage.Setup(s => s.ListPathsAsync(It.IsAny<string>())).ReturnsAsync(new List<string>());

            var result = await CreateService().SaveMyWishlistAsync(UserName, BuildCanvasJson());

            added.Should().NotBeNull();
            added!.CyberekId.Should().Be(OwnCyberekId);
            result.CanvasJson.Should().Be(added.CanvasJson);
            _wishlistRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveMyWishlistAsync_SecondSave_OverwritesAndBumpsUpdatedAtUtc()
        {
            var previousUpdatedAt = DateTime.UtcNow.AddDays(-1);
            var existing = new Wishlist
            {
                Id = 1,
                CyberekId = OwnCyberekId,
                CanvasJson = "old",
                UpdatedAtUtc = previousUpdatedAt
            };
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(OwnCyberekId)).ReturnsAsync(existing);
            _storage.Setup(s => s.ListPathsAsync(It.IsAny<string>())).ReturnsAsync(new List<string>());

            var result = await CreateService().SaveMyWishlistAsync(UserName, BuildCanvasJson());

            existing.CanvasJson.Should().NotBe("old");
            existing.UpdatedAtUtc.Should().BeAfter(previousUpdatedAt);
            result.UpdatedAtUtc.Should().Be(existing.UpdatedAtUtc);
            _wishlistRepo.Verify(r => r.AddAsync(It.IsAny<Wishlist>()), Times.Never);
            _wishlistRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        [Fact]
        public async Task SaveMyWishlistAsync_StoresCanonicalJson_NotRawClientInput()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(OwnCyberekId)).ReturnsAsync((Wishlist?)null);
            Wishlist? added = null;
            _wishlistRepo.Setup(r => r.AddAsync(It.IsAny<Wishlist>()))
                .Callback<Wishlist>(w => added = w)
                .Returns(Task.CompletedTask);
            _storage.Setup(s => s.ListPathsAsync(It.IsAny<string>())).ReturnsAsync(new List<string>());

            // Extra unknown fields must be dropped by deserialize -> validate -> re-serialize.
            var raw = BuildCanvasJson().Replace("\"version\"", "\"evil\":\"<script>\",\"version\"");

            await CreateService().SaveMyWishlistAsync(UserName, raw);

            added!.CanvasJson.Should().NotContain("evil");
            added.CanvasJson.Should().Contain("\"version\":1");
        }

        [Fact]
        public async Task SaveMyWishlistAsync_UserHasNoCyberekSelected_ThrowsWishlistConflict()
        {
            SetupUser(cyberekId: 0, giftedCyberekId: 0);

            await Assert.ThrowsAsync<WishlistConflictException>(
                () => CreateService().SaveMyWishlistAsync(UserName, BuildCanvasJson()));
        }

        #endregion

        #region SaveMyWishlistAsync — document validation

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData("not json at all")]
        [InlineData("null")]
        public async Task SaveMyWishlistAsync_MalformedDocument_ThrowsBusinessValidation(string canvasJson)
        {
            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, canvasJson));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_WrongVersion_ThrowsBusinessValidation()
        {
            var json = BuildCanvasJson(version: 2);

            var ex = await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));

            ex.ValidationErrors.Should().ContainSingle(e => e.Contains("version"));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_WrongCanvasSize_ThrowsBusinessValidation()
        {
            var json = BuildCanvasJson(width: 500, height: 500);

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_DocumentOverSizeLimit_ThrowsBusinessValidation()
        {
            // A single huge text field pushes the raw JSON above 512 KB.
            var hugeText = new string('x', WishlistConstants.MAX_CANVAS_JSON_BYTES + 1);
            var json = BuildCanvasJson(items: new[] { TextItem(text: hugeText) });
            Encoding.UTF8.GetByteCount(json).Should().BeGreaterThan(WishlistConstants.MAX_CANVAS_JSON_BYTES);

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_TooManyStrokes_ThrowsBusinessValidation()
        {
            var strokes = Enumerable.Range(0, WishlistConstants.MAX_STROKES + 1)
                .Select(_ => Stroke())
                .ToArray();
            var json = BuildCanvasJson(strokes: strokes);

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Theory]
        [InlineData("marker")]              // unknown tool
        [InlineData("")]                    // missing tool
        public async Task SaveMyWishlistAsync_InvalidStrokeTool_ThrowsBusinessValidation(string tool)
        {
            var json = BuildCanvasJson(strokes: new[] { Stroke(tool: tool) });

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Theory]
        [InlineData("red")]
        [InlineData("#fff")]
        [InlineData("#11223344")]
        public async Task SaveMyWishlistAsync_InvalidStrokeColor_ThrowsBusinessValidation(string color)
        {
            var json = BuildCanvasJson(strokes: new[] { Stroke(color: color) });

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Theory]
        [InlineData(0)]
        [InlineData(65)]
        public async Task SaveMyWishlistAsync_StrokeWidthOutOfRange_ThrowsBusinessValidation(double width)
        {
            var json = BuildCanvasJson(strokes: new[] { Stroke(width: width) });

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_OddPointCount_ThrowsBusinessValidation()
        {
            var json = BuildCanvasJson(strokes: new[] { Stroke(points: new double[] { 1, 2, 3 }) });

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_TextTooLong_ThrowsBusinessValidation()
        {
            var json = BuildCanvasJson(items: new[]
            {
                TextItem(text: new string('a', WishlistConstants.MAX_TEXT_LENGTH + 1))
            });

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Theory]
        [InlineData(7)]
        [InlineData(201)]
        public async Task SaveMyWishlistAsync_FontSizeOutOfRange_ThrowsBusinessValidation(double fontSize)
        {
            var json = BuildCanvasJson(items: new[] { TextItem(fontSize: fontSize) });

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_TooManyImages_ThrowsBusinessValidation()
        {
            var items = Enumerable.Range(0, WishlistConstants.MAX_IMAGE_ITEMS + 1)
                .Select(_ => ImageItem(OwnImagePath()))
                .ToArray();
            var json = BuildCanvasJson(items: items);

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_ImagePathOfAnotherCyberek_ThrowsBusinessValidation()
        {
            // Ownership rule: the path prefix must be the author's own CyberekId.
            var foreignPath = OwnImagePath(cyberekId: OwnCyberekId + 1);
            var json = BuildCanvasJson(items: new[] { ImageItem(foreignPath) });

            var ex = await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));

            ex.ValidationErrors.Should().ContainSingle(e => e.Contains("path"));
        }

        [Theory]
        [InlineData("3/../secret.png")]
        [InlineData("3/file.exe")]
        [InlineData("https://evil.example/x.png")]
        public async Task SaveMyWishlistAsync_MalformedImagePath_ThrowsBusinessValidation(string path)
        {
            var json = BuildCanvasJson(items: new[] { ImageItem(path) });

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));
        }

        [Fact]
        public async Task SaveMyWishlistAsync_ValidationFails_NothingIsPersisted()
        {
            var json = BuildCanvasJson(version: 99);

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().SaveMyWishlistAsync(UserName, json));

            _wishlistRepo.Verify(r => r.AddAsync(It.IsAny<Wishlist>()), Times.Never);
            _wishlistRepo.Verify(r => r.SaveChangesAsync(), Times.Never);
        }

        #endregion

        #region SaveMyWishlistAsync — orphaned image cleanup

        [Fact]
        public async Task SaveMyWishlistAsync_DeletesBlobsNotReferencedByTheDocument()
        {
            var keptPath = OwnImagePath();
            var orphanedPath = OwnImagePath();
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(OwnCyberekId)).ReturnsAsync((Wishlist?)null);
            _storage.Setup(s => s.ListPathsAsync($"{OwnCyberekId}/"))
                .ReturnsAsync(new List<string> { keptPath, orphanedPath });

            var json = BuildCanvasJson(items: new[] { ImageItem(keptPath) });
            await CreateService().SaveMyWishlistAsync(UserName, json);

            _storage.Verify(s => s.DeleteAsync(orphanedPath), Times.Once);
            _storage.Verify(s => s.DeleteAsync(keptPath), Times.Never);
        }

        [Fact]
        public async Task SaveMyWishlistAsync_CleanupFailure_DoesNotFailTheSave()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(OwnCyberekId)).ReturnsAsync((Wishlist?)null);
            _storage.Setup(s => s.ListPathsAsync(It.IsAny<string>()))
                .ThrowsAsync(new Exception("storage down"));

            // The document is committed before cleanup — a cleanup failure is logged, not thrown.
            var result = await CreateService().SaveMyWishlistAsync(UserName, BuildCanvasJson());

            result.Should().NotBeNull();
            _wishlistRepo.Verify(r => r.SaveChangesAsync(), Times.Once);
        }

        #endregion

        #region GetGiftedWishlistAsync

        [Fact]
        public async Task GetGiftedWishlistAsync_DrawNotCompleted_ThrowsWishlistConflict()
        {
            SetupUser(cyberekId: OwnCyberekId, giftedCyberekId: 0);

            await Assert.ThrowsAsync<WishlistConflictException>(
                () => CreateService().GetGiftedWishlistAsync(UserName));
        }

        [Fact]
        public async Task GetGiftedWishlistAsync_TargetWithoutWishlist_ReturnsNull()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(GiftedCyberekId)).ReturnsAsync((Wishlist?)null);

            var result = await CreateService().GetGiftedWishlistAsync(UserName);

            result.Should().BeNull();
        }

        [Fact]
        public async Task GetGiftedWishlistAsync_ReturnsTargetsWishlist_NotOwn()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(GiftedCyberekId))
                .ReturnsAsync(new Wishlist { CyberekId = GiftedCyberekId, CanvasJson = "target-doc" });

            var result = await CreateService().GetGiftedWishlistAsync(UserName);

            result!.CanvasJson.Should().Be("target-doc");
            _wishlistRepo.Verify(r => r.GetByCyberekIdAsync(OwnCyberekId), Times.Never);
        }

        #endregion

        #region UploadImageAsync

        private static readonly byte[] PngHeader =
            [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D];
        private static readonly byte[] JpegHeader =
            [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01];
        private static readonly byte[] WebpHeader =
            [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];

        [Theory]
        [InlineData(0)]
        [InlineData(WishlistConstants.MAX_IMAGE_UPLOAD_BYTES + 1)]
        public async Task UploadImageAsync_InvalidDeclaredLength_ThrowsBusinessValidation(long length)
        {
            using var content = new MemoryStream(PngHeader);

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().UploadImageAsync(UserName, content, length));
        }

        [Fact]
        public async Task UploadImageAsync_UnrecognizedSignature_ThrowsBusinessValidation()
        {
            var bytes = Encoding.ASCII.GetBytes("GIF89a-definitely-not-allowed");
            using var content = new MemoryStream(bytes);

            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().UploadImageAsync(UserName, content, bytes.Length));

            _storage.Verify(s => s.UploadAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>()), Times.Never);
        }

        [Theory]
        [InlineData("png", "image/png")]
        [InlineData("jpg", "image/jpeg")]
        [InlineData("webp", "image/webp")]
        public async Task UploadImageAsync_ValidImage_UploadsUnderOwnPrefixWithDetectedType(
            string expectedExtension, string expectedContentType)
        {
            var header = expectedExtension switch
            {
                "png" => PngHeader,
                "jpg" => JpegHeader,
                _ => WebpHeader
            };
            using var content = new MemoryStream(header);
            string? uploadedPath = null;
            string? uploadedContentType = null;
            _storage.Setup(s => s.UploadAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>()))
                .Callback<string, Stream, string>((p, _, ct) => { uploadedPath = p; uploadedContentType = ct; })
                .Returns(Task.CompletedTask);

            var result = await CreateService().UploadImageAsync(UserName, content, header.Length);

            result.Path.Should().MatchRegex($@"^{OwnCyberekId}/[0-9a-f]{{32}}\.{expectedExtension}$");
            uploadedPath.Should().Be(result.Path);
            uploadedContentType.Should().Be(expectedContentType);
        }

        [Fact]
        public async Task UploadImageAsync_UserHasNoCyberekSelected_ThrowsWishlistConflict()
        {
            SetupUser(cyberekId: 0, giftedCyberekId: 0);
            using var content = new MemoryStream(PngHeader);

            await Assert.ThrowsAsync<WishlistConflictException>(
                () => CreateService().UploadImageAsync(UserName, content, PngHeader.Length));
        }

        #endregion

        #region GetImageAsync — access rule (decision D3)

        [Fact]
        public async Task GetImageAsync_Owner_CanReadOwnImage()
        {
            var fileName = $"{Guid.NewGuid():N}.png";
            _storage.Setup(s => s.DownloadAsync($"{OwnCyberekId}/{fileName}"))
                .ReturnsAsync((new MemoryStream(), "image/png"));

            var result = await CreateService().GetImageAsync(UserName, OwnCyberekId, fileName);

            result.Should().NotBeNull();
            result!.ContentType.Should().Be("image/png");
        }

        [Fact]
        public async Task GetImageAsync_Santa_CanReadGiftedPersonsImage()
        {
            var fileName = $"{Guid.NewGuid():N}.jpg";
            _storage.Setup(s => s.DownloadAsync($"{GiftedCyberekId}/{fileName}"))
                .ReturnsAsync((new MemoryStream(), "image/jpeg"));

            var result = await CreateService().GetImageAsync(UserName, GiftedCyberekId, fileName);

            result.Should().NotBeNull();
        }

        [Fact]
        public async Task GetImageAsync_ThirdParty_ThrowsForbiddenAccess()
        {
            var unrelatedCyberekId = 11;

            await Assert.ThrowsAsync<ForbiddenAccessException>(
                () => CreateService().GetImageAsync(UserName, unrelatedCyberekId, $"{Guid.NewGuid():N}.png"));

            _storage.Verify(s => s.DownloadAsync(It.IsAny<string>()), Times.Never);
        }

        [Theory]
        [InlineData("../../secrets.txt")]
        [InlineData("file.png.exe")]
        [InlineData("short.png")]
        public async Task GetImageAsync_MalformedFileName_ThrowsBusinessValidation(string fileName)
        {
            await Assert.ThrowsAsync<BusinessValidationException>(
                () => CreateService().GetImageAsync(UserName, OwnCyberekId, fileName));
        }

        [Fact]
        public async Task GetImageAsync_BlobMissing_ReturnsNull()
        {
            var fileName = $"{Guid.NewGuid():N}.png";
            _storage.Setup(s => s.DownloadAsync($"{OwnCyberekId}/{fileName}"))
                .ReturnsAsync(((Stream, string)?)null);

            var result = await CreateService().GetImageAsync(UserName, OwnCyberekId, fileName);

            result.Should().BeNull();
        }

        #endregion
    }
}
