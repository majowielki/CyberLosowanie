using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CyberLosowanie.Controllers
{
    /// <summary>
    /// Authorized proxy for the cyberek portraits in the private container — returns
    /// a binary stream instead of the ApiResponse envelope. Any signed-in user may
    /// see every portrait: the whole group is listed on the pick screen anyway, and
    /// a portrait says nothing about the draw. Caricatures are the exception: the
    /// landing page hangs them on the tree for every visitor, so they are public.
    /// </summary>
    [Route("api/CyberLosowanie")]
    [ApiController]
    [Authorize]
    public class CyberekImagesController : ControllerBase
    {
        // Portraits change only when the upload script is re-run; a private cache
        // keeps the pick grid from re-downloading twelve images on every visit.
        private const string ImageCacheControlHeader = "private, max-age=3600";

        private readonly ICyberekImageStorage _imageStorage;

        public CyberekImagesController(ICyberekImageStorage imageStorage)
        {
            _imageStorage = imageStorage ?? throw new ArgumentNullException(nameof(imageStorage));
        }

        [HttpGet("{id:int}/images/{kind}")]
        [ProducesResponseType(200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetImage(int id, string kind)
        {
            if (id < CyberLosowanieConstants.MIN_CYBEREK_ID || id > CyberLosowanieConstants.MAX_CYBEREK_ID)
            {
                return BadRequest(ApiResponse<object>.Error(CyberLosowanieConstants.INVALID_CYBEREK_ID));
            }

            if (!CyberekImageConstants.KINDS.Contains(kind))
            {
                return BadRequest(ApiResponse<object>.Error(CyberekImageConstants.INVALID_IMAGE_KIND));
            }

            var image = await _imageStorage.DownloadAsync(id, kind);
            if (image == null)
            {
                return NotFound(ApiResponse<object>.Error(
                    CyberekImageConstants.IMAGE_NOT_FOUND, System.Net.HttpStatusCode.NotFound));
            }

            Response.Headers.CacheControl = ImageCacheControlHeader;
            return File(image.Value.Content, image.Value.ContentType);
        }

        // Same URL as GetImage for the caricature kind — the literal segment wins over
        // {kind} in routing, so the frontend needs no separate public URL.
        [AllowAnonymous]
        [HttpGet("{id:int}/images/" + CyberekImageConstants.KIND_CARICATURE)]
        [ProducesResponseType(200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public Task<IActionResult> GetCaricature(int id) => GetImage(id, CyberekImageConstants.KIND_CARICATURE);
    }
}
