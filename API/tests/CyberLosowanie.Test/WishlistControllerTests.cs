using CyberLosowanie.Controllers;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Security.Claims;
using System.Text;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Controller tests: ApiResponse mapping, the missing-identity guard (401) and
    /// the binary image proxy contract. Business rules live in WishlistServiceTests.
    /// </summary>
    public class WishlistControllerTests
    {
        private const string UserName = "alice";

        private readonly Mock<IWishlistService> _wishlistServiceMock = new();
        private readonly WishlistController _controller;

        public WishlistControllerTests()
        {
            _controller = new WishlistController(_wishlistServiceMock.Object);
            SetAuthenticatedUser(UserName);
        }

        // The controller reads identity from the "fullName" JWT claim — mirror that here.
        private void SetAuthenticatedUser(string? fullName)
        {
            var claims = fullName == null
                ? Array.Empty<Claim>()
                : new[] { new Claim("fullName", fullName) };

            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(claims, "TestAuth"))
                }
            };
        }

        #region Constructor

        [Fact]
        public void Constructor_WithNullService_ThrowsArgumentNullException()
        {
            var exception = Assert.Throws<ArgumentNullException>(() => new WishlistController(null!));
            exception.ParamName.Should().Be("wishlistService");
        }

        #endregion

        #region GetMyWishlist

        [Fact]
        public async Task GetMyWishlist_NoIdentityClaim_ReturnsUnauthorized()
        {
            SetAuthenticatedUser(null);

            var result = await _controller.GetMyWishlist();

            result.Should().BeOfType<UnauthorizedObjectResult>();
            _wishlistServiceMock.Verify(s => s.GetMyWishlistAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task GetMyWishlist_NoWishlistYet_ReturnsOkWithNullData()
        {
            _wishlistServiceMock.Setup(s => s.GetMyWishlistAsync(UserName))
                .ReturnsAsync((WishlistResponse?)null);

            var result = await _controller.GetMyWishlist();

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<WishlistResponse?>>().Subject;
            apiResponse.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().BeNull();
        }

        [Fact]
        public async Task GetMyWishlist_WishlistExists_ReturnsOkWithData()
        {
            var response = new WishlistResponse { CanvasJson = "{}", UpdatedAtUtc = DateTime.UtcNow };
            _wishlistServiceMock.Setup(s => s.GetMyWishlistAsync(UserName)).ReturnsAsync(response);

            var result = await _controller.GetMyWishlist();

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<WishlistResponse?>>().Subject;
            apiResponse.Data.Should().Be(response);
        }

        #endregion

        #region SaveMyWishlist

        [Fact]
        public async Task SaveMyWishlist_NoIdentityClaim_ReturnsUnauthorized()
        {
            SetAuthenticatedUser(null);

            var result = await _controller.SaveMyWishlist(new SaveWishlistRequestDTO { CanvasJson = "{}" });

            result.Should().BeOfType<UnauthorizedObjectResult>();
            _wishlistServiceMock.Verify(
                s => s.SaveMyWishlistAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task SaveMyWishlist_DelegatesBodyToServiceAndReturnsSavedWishlist()
        {
            var saved = new WishlistResponse { CanvasJson = "canonical", UpdatedAtUtc = DateTime.UtcNow };
            _wishlistServiceMock.Setup(s => s.SaveMyWishlistAsync(UserName, "raw-json")).ReturnsAsync(saved);

            var result = await _controller.SaveMyWishlist(new SaveWishlistRequestDTO { CanvasJson = "raw-json" });

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<WishlistResponse>>().Subject;
            apiResponse.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().Be(saved);
            _wishlistServiceMock.Verify(s => s.SaveMyWishlistAsync(UserName, "raw-json"), Times.Once);
        }

        #endregion

        #region GetGiftedWishlist

        [Fact]
        public async Task GetGiftedWishlist_NoIdentityClaim_ReturnsUnauthorized()
        {
            SetAuthenticatedUser(null);

            var result = await _controller.GetGiftedWishlist();

            result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task GetGiftedWishlist_TargetWithoutWishlist_ReturnsOkWithNullData()
        {
            _wishlistServiceMock.Setup(s => s.GetGiftedWishlistAsync(UserName))
                .ReturnsAsync((WishlistResponse?)null);

            var result = await _controller.GetGiftedWishlist();

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<WishlistResponse?>>().Subject;
            apiResponse.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().BeNull();
        }

        #endregion

        #region UploadImage

        private static IFormFile CreateFormFile(byte[] content, string fileName = "photo.png")
        {
            var stream = new MemoryStream(content);
            return new FormFile(stream, 0, content.Length, "file", fileName);
        }

        [Fact]
        public async Task UploadImage_NoIdentityClaim_ReturnsUnauthorized()
        {
            SetAuthenticatedUser(null);

            var result = await _controller.UploadImage(CreateFormFile([1, 2, 3]));

            result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task UploadImage_MissingFile_ReturnsBadRequest()
        {
            var result = await _controller.UploadImage(null);

            result.Should().BeOfType<BadRequestObjectResult>();
            _wishlistServiceMock.Verify(
                s => s.UploadImageAsync(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<long>()), Times.Never);
        }

        [Fact]
        public async Task UploadImage_ValidFile_ReturnsUploadedPath()
        {
            var upload = new UploadImageResponse { Path = "3/abc.png" };
            _wishlistServiceMock
                .Setup(s => s.UploadImageAsync(UserName, It.IsAny<Stream>(), 3))
                .ReturnsAsync(upload);

            var result = await _controller.UploadImage(CreateFormFile([1, 2, 3]));

            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var apiResponse = okResult.Value.Should().BeOfType<ApiResponse<UploadImageResponse>>().Subject;
            apiResponse.Data.Should().Be(upload);
        }

        #endregion

        #region GetImage (binary proxy)

        [Fact]
        public async Task GetImage_NoIdentityClaim_ReturnsUnauthorized()
        {
            SetAuthenticatedUser(null);

            var result = await _controller.GetImage(3, "abc.png");

            result.Should().BeOfType<UnauthorizedObjectResult>();
        }

        [Fact]
        public async Task GetImage_ImageMissing_ReturnsNotFound()
        {
            _wishlistServiceMock.Setup(s => s.GetImageAsync(UserName, 3, "abc.png"))
                .ReturnsAsync((WishlistImageResult?)null);

            var result = await _controller.GetImage(3, "abc.png");

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Fact]
        public async Task GetImage_ImageExists_StreamsItWithContentTypeAndPrivateCache()
        {
            var bytes = Encoding.ASCII.GetBytes("image-bytes");
            _wishlistServiceMock.Setup(s => s.GetImageAsync(UserName, 3, "abc.png"))
                .ReturnsAsync(new WishlistImageResult(new MemoryStream(bytes), "image/png"));

            var result = await _controller.GetImage(3, "abc.png");

            var fileResult = result.Should().BeOfType<FileStreamResult>().Subject;
            fileResult.ContentType.Should().Be("image/png");
            // Blob responses are user-private — they must never land in shared caches.
            _controller.Response.Headers.CacheControl.ToString().Should().Contain("private");
        }

        #endregion
    }
}
