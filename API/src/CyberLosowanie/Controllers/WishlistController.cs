using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace CyberLosowanie.Controllers
{
    [Route("api/wishlist")]
    [ApiController]
    [Authorize]
    public class WishlistController : ControllerBase
    {
        // Image responses change only when the wishlist is edited; a short private
        // cache avoids re-downloading blobs on every canvas render.
        private const string ImageCacheControlHeader = "private, max-age=3600";

        private readonly IWishlistService _wishlistService;

        public WishlistController(IWishlistService wishlistService)
        {
            _wishlistService = wishlistService ?? throw new ArgumentNullException(nameof(wishlistService));
        }

        // Identity comes from the JWT, never from parameters — same rule as
        // CyberLosowanieController. The "fullName" claim is set at login.
        private string? GetAuthenticatedUserName() => User.FindFirstValue("fullName");

        /// <summary>My own wishlist. Data is null when none has been saved yet (a normal state, not 404).</summary>
        [HttpGet("my")]
        [ProducesResponseType(typeof(ApiResponse<WishlistResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - no cyberek selected yet
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetMyWishlist()
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            var wishlist = await _wishlistService.GetMyWishlistAsync(userName);
            return Ok(ApiResponse<WishlistResponse?>.Success(wishlist));
        }

        /// <summary>Upsert of my wishlist — creating or overwriting the previous version.</summary>
        [HttpPut("my")]
        [ProducesResponseType(typeof(ApiResponse<WishlistResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - no cyberek selected yet
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> SaveMyWishlist([FromBody] SaveWishlistRequestDTO request)
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            // Document limits and schema (section 3.4) are enforced in the service;
            // violations surface as BusinessValidationException -> 400 with error list.
            var saved = await _wishlistService.SaveMyWishlistAsync(userName, request.CanvasJson);
            return Ok(ApiResponse<WishlistResponse>.Success(saved, "Wishlist saved successfully"));
        }

        /// <summary>Wishlist of the person I drew. Data is null when they have not saved one yet.</summary>
        [HttpGet("gifted")]
        [ProducesResponseType(typeof(ApiResponse<WishlistResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - draw not completed yet
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetGiftedWishlist()
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            var wishlist = await _wishlistService.GetGiftedWishlistAsync(userName);
            return Ok(ApiResponse<WishlistResponse?>.Success(wishlist));
        }

        /// <summary>Upload of a wishlist image (JPEG/PNG/WebP, max 5 MB) to the caller's blob prefix.</summary>
        [HttpPost("my/images")]
        // Multipart envelope overhead on top of the 5 MB image limit enforced in the service.
        [RequestSizeLimit(WishlistConstants.MAX_IMAGE_UPLOAD_BYTES + 1024 * 1024)]
        [ProducesResponseType(typeof(ApiResponse<UploadImageResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - no cyberek selected yet
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> UploadImage(IFormFile? file)
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.Error("An image file is required."));
            }

            await using var content = file.OpenReadStream();
            var result = await _wishlistService.UploadImageAsync(userName, content, file.Length);
            return Ok(ApiResponse<UploadImageResponse>.Success(result, "Image uploaded successfully"));
        }

        /// <summary>
        /// Authorized proxy for images from the private container — the only endpoint
        /// returning a binary stream instead of the ApiResponse envelope. Access rule
        /// matches the wishlist itself: owner or their Santa.
        /// </summary>
        [HttpGet("images/{cyberekId:int}/{fileName}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 403)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetImage(int cyberekId, string fileName)
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            var image = await _wishlistService.GetImageAsync(userName, cyberekId, fileName);
            if (image == null)
            {
                return NotFound(ApiResponse<object>.Error("Image not found.", System.Net.HttpStatusCode.NotFound));
            }

            Response.Headers.CacheControl = ImageCacheControlHeader;
            return File(image.Content, image.ContentType);
        }
    }
}
