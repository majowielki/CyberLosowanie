using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Models.Dto.Responses;
using CyberLosowanie.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace CyberLosowanie.Controllers
{
    [Route("api/CyberLosowanie")]
    [ApiController]
    [Authorize] // Add authorization requirement
    public class CyberLosowanieController : ControllerBase
    {
        private readonly ICyberekService _cyberekService;

        public CyberLosowanieController(ICyberekService cyberekService)
        {
            _cyberekService = cyberekService ?? throw new ArgumentNullException(nameof(cyberekService));
        }

        // Identity comes from the JWT, never from query parameters — otherwise any
        // authenticated user could read or mutate another user's draw by passing their
        // username. The "fullName" claim is set at login (AuthService.GenerateJwtToken).
        private string? GetAuthenticatedUserName() => User.FindFirstValue("fullName");

        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<CyberekResponse>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetCyberki()
        {
            var cyberki = await _cyberekService.GetAllCyberkiAsync();
            return Ok(ApiResponse<IEnumerable<CyberekResponse>>.Success(cyberki.ToResponse()));
        }

        [HttpGet("available-to-pick")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<CyberekResponse>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetAvailableToPickCyberki()
        {
            var availableCyberki = await _cyberekService.GetAvailableToPickCyberkiAsync();
            // Collection endpoints always return 200 with a (possibly empty) list
            return Ok(ApiResponse<IEnumerable<CyberekResponse>>.Success(
                (availableCyberki ?? Enumerable.Empty<Cyberek>()).ToResponse()));
        }

        [HttpGet("{id:int}", Name = "GetCyberek")]
        [ProducesResponseType(typeof(ApiResponse<CyberekResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetCyberek(
            [Range(CyberLosowanieConstants.MIN_CYBEREK_ID, CyberLosowanieConstants.MAX_CYBEREK_ID)] int id)
        {
            var cyberek = await _cyberekService.GetCyberekByIdAsync(id);
            return Ok(ApiResponse<CyberekResponse>.Success(cyberek.ToResponse()));
        }

        [HttpGet("my-available-targets")]
        [ProducesResponseType(typeof(ApiResponse<List<int>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - no targets available
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetMyAvailableGiftTargets()
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            // Only choices that keep the draw completable are returned. Unavailable boxes
            // are indistinguishable on purpose (taken / banned / would strand someone) —
            // the reason would leak draw results or ban lists.
            var availableTargets = await _cyberekService.GetAvailableGiftTargetsForUserAsync(userName);

            // Safety net: with a feasible configuration this cannot happen (a giver who
            // has not drawn always has at least one safe choice).
            if (!availableTargets.Any())
            {
                return Conflict(ApiResponse<object>.Error(
                    "No gift targets are currently available. Contact the organizer — the draw configuration may need fixing."));
            }

            return Ok(ApiResponse<List<int>>.Success(availableTargets));
        }

        [HttpGet("my-gifted-cyberek")]
        [ProducesResponseType(typeof(ApiResponse<CyberekResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetMyGiftedCyberek()
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            // The owner is allowed to see WHO they gift (name + photo), but not that
            // target's own draw result — ToResponse() strips GiftedCyberekId/BannedCyberki.
            var cyberek = await _cyberekService.GetGiftedCyberekForUserAsync(userName);
            return Ok(ApiResponse<CyberekResponse>.Success(cyberek.ToResponse()));
        }

        [HttpPost("assign-cyberek")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - user already has cyberek
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> AssignCyberekToUser([FromBody] CyberekAssignmentDTO assignmentDto)
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            // Input shape is enforced at the boundary: [ApiController] auto-400s invalid
            // models (formatted as ApiResponse via InvalidModelStateResponseFactory).
            // Domain errors (validation, user/cyberek not found) propagate to the
            // global exception handler. "Already has a cyberek" is signalled by a
            // false result, not an exception.
            var result = await _cyberekService.AssignCyberekToUserAsync(userName, assignmentDto.CyberekId);
            if (!result)
            {
                return Conflict(ApiResponse<object>.Error(
                    "User already has a cyberek assigned. Use the assign-gift endpoint to assign a gift."));
            }
            return Ok(ApiResponse<object>.Success(null, "Cyberek assigned to user successfully"));
        }

        [HttpPut("assign-gift")]
        [ProducesResponseType(typeof(ApiResponse<int>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - box taken/unsafe, no cyberek, or gift already assigned
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> AssignGift([FromBody] GiftChoiceDTO choice)
        {
            var userName = GetAuthenticatedUserName();
            if (string.IsNullOrWhiteSpace(userName))
            {
                return Unauthorized(ApiResponse<object>.Error(
                    "Authenticated token carries no user identity.", System.Net.HttpStatusCode.Unauthorized));
            }

            // The user picks the box (product decision C2-rev): the server validates the
            // choice — free, not self, not banned, and the rest of the draw must remain
            // completable — inside a serialized transaction. A box lost to a concurrent
            // draw surfaces as GiftTargetUnavailableException → 409; the client refreshes
            // the list and the user picks again.
            var assignedId = await _cyberekService.AssignGiftAsync(userName, choice.GiftedCyberekId);
            return Ok(ApiResponse<int>.Success(assignedId, "Gift assignment completed successfully"));
        }
    }
}
