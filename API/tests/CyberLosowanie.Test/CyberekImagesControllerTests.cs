using CyberLosowanie.Constants;
using CyberLosowanie.Controllers;
using CyberLosowanie.Interfaces.Services;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Text;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Contract of the cyberek portrait proxy: input validation, 404 for missing
    /// blobs and a private-cache binary response.
    /// </summary>
    public class CyberekImagesControllerTests
    {
        private readonly Mock<ICyberekImageStorage> _storageMock = new();
        private readonly CyberekImagesController _controller;

        public CyberekImagesControllerTests()
        {
            _controller = new CyberekImagesController(_storageMock.Object)
            {
                ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
            };
        }

        [Fact]
        public void Constructor_WithNullStorage_ThrowsArgumentNullException()
        {
            var exception = Assert.Throws<ArgumentNullException>(() => new CyberekImagesController(null!));

            exception.ParamName.Should().Be("imageStorage");
        }

        [Theory]
        [InlineData(CyberLosowanieConstants.MIN_CYBEREK_ID - 1)]
        [InlineData(CyberLosowanieConstants.MAX_CYBEREK_ID + 1)]
        public async Task GetImage_IdOutOfRange_ReturnsBadRequestWithoutTouchingStorage(int id)
        {
            var result = await _controller.GetImage(id, CyberekImageConstants.KIND_SANTA);

            result.Should().BeOfType<BadRequestObjectResult>();
            _storageMock.VerifyNoOtherCalls();
        }

        [Theory]
        [InlineData("portrait")]
        [InlineData("Santa")]
        [InlineData("../santa")]
        public async Task GetImage_UnknownKind_ReturnsBadRequestWithoutTouchingStorage(string kind)
        {
            var result = await _controller.GetImage(3, kind);

            result.Should().BeOfType<BadRequestObjectResult>();
            _storageMock.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task GetImage_ImageMissing_ReturnsNotFound()
        {
            _storageMock.Setup(s => s.DownloadAsync(3, CyberekImageConstants.KIND_CHILD))
                .ReturnsAsync(((Stream, string)?)null);

            var result = await _controller.GetImage(3, CyberekImageConstants.KIND_CHILD);

            result.Should().BeOfType<NotFoundObjectResult>();
        }

        [Theory]
        [InlineData(CyberekImageConstants.KIND_SANTA)]
        [InlineData(CyberekImageConstants.KIND_CARICATURE)]
        [InlineData(CyberekImageConstants.KIND_CHILD)]
        public async Task GetImage_ImageExists_StreamsItWithContentTypeAndPrivateCache(string kind)
        {
            var bytes = Encoding.ASCII.GetBytes("image-bytes");
            _storageMock.Setup(s => s.DownloadAsync(3, kind))
                .ReturnsAsync((new MemoryStream(bytes), "image/jpeg"));

            var result = await _controller.GetImage(3, kind);

            var fileResult = result.Should().BeOfType<FileStreamResult>().Subject;
            fileResult.ContentType.Should().Be("image/jpeg");
            // Photos of real people — they must never land in shared caches.
            _controller.Response.Headers.CacheControl.ToString().Should().Contain("private");
        }

        [Fact]
        public void BlobPath_FollowsTheIdAndKindConvention()
        {
            CyberekImageConstants.BlobPath(7, CyberekImageConstants.KIND_CARICATURE).Should().Be("7/caricature.jpg");
        }
    }
}
