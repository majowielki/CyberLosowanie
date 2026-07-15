using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Models.Dto.Responses;
using CyberLosowanie.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

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
        public async Task<IActionResult> GetCyberek([Range(1, int.MaxValue)] int id)
        {
            var cyberek = await _cyberekService.GetCyberekByIdAsync(id);
            return Ok(ApiResponse<CyberekResponse>.Success(cyberek.ToResponse()));
        }

        [HttpGet("available-targets/{id:int}")]
        [ProducesResponseType(typeof(ApiResponse<List<int>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - no targets available
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetAvailableGiftTargets([Range(1, int.MaxValue)] int id)
        {
            var availableTargets = await _cyberekService.GetAvailableGiftTargetsAsync(id);
            
            // Handle case where no targets are available - FIXED TODO
            if (!availableTargets.Any())
            {
                return Conflict(ApiResponse<object>.Error(
                    "No gift targets are currently available for this cyberek. " +
                    "This may occur when all other cyberki have been assigned as gifts or due to banned list restrictions."));
            }
            
            return Ok(ApiResponse<List<int>>.Success(availableTargets));
        }

        [HttpGet("my-gifted-cyberek")]
        [ProducesResponseType(typeof(ApiResponse<CyberekResponse>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetMyGiftedCyberek([FromQuery] string userName)
        {
            if (string.IsNullOrWhiteSpace(userName))
            {
                return BadRequest(ApiResponse<object>.Error("Username is required."));
            }

            // The owner is allowed to see WHO they gift (name + photo), but not that
            // target's own draw result — ToResponse() strips GiftedCyberekId/BannedCyberki.
            var cyberek = await _cyberekService.GetGiftedCyberekForUserAsync(userName);
            return Ok(ApiResponse<CyberekResponse>.Success(cyberek.ToResponse()));
        }

        [HttpPost("assign-cyberek")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - user already has cyberek
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> AssignCyberekToUser(
            [Required][FromQuery] string userName,
            [FromBody] CyberekAssignmentDTO assignmentDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(ApiResponse<object>.ValidationError(errors));
            }

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
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - no cyberek assigned or gift already assigned
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> AssignGift([Required][FromQuery] string userName)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(ApiResponse<object>.ValidationError(errors));
            }

            // Server-side draw (C2): the client does not choose the target. Domain errors
            // (e.g. user has no cyberek yet, gift already assigned) are raised as domain
            // exceptions and handled by the global exception handler. The service returns
            // the gifted cyberek ID chosen by the algorithm.
            var assignedId = await _cyberekService.AssignGiftAsync(userName);
            return Ok(ApiResponse<int>.Success(assignedId, "Gift assignment completed successfully"));
        }
    }
}
