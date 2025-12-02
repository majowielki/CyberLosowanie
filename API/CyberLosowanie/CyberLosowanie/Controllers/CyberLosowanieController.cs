using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
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
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<Cyberek>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetCyberki()
        {
            var cyberki = await _cyberekService.GetAllCyberkiAsync();
            return Ok(ApiResponse<IEnumerable<Cyberek>>.Success(cyberki));
        }

        [HttpGet("available-to-pick")]
        [ProducesResponseType(typeof(ApiResponse<IEnumerable<Cyberek>>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetAvailableToPickCyberki()
        {
            var availableCyberki = await _cyberekService.GetAvailableToPickCyberkiAsync();
            return Ok(ApiResponse<IEnumerable<Cyberek>>.Success(availableCyberki));
        }

        [HttpGet("{id:int}", Name = "GetCyberek")]
        [ProducesResponseType(typeof(ApiResponse<Cyberek>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> GetCyberek([Range(1, int.MaxValue)] int id)
        {
            var cyberek = await _cyberekService.GetCyberekByIdAsync(id);
            return Ok(ApiResponse<Cyberek>.Success(cyberek));
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
        [ProducesResponseType(typeof(ApiResponse<Cyberek>), 200)]
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

            var cyberek = await _cyberekService.GetGiftedCyberekForUserAsync(userName);
            return Ok(ApiResponse<Cyberek>.Success(cyberek));
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

            try
            {
                var result = await _cyberekService.AssignCyberekToUserAsync(userName, assignmentDto.CyberekId);
                if (!result)
                {
                    return Conflict(ApiResponse<object>.Error(
                        "User already has a cyberek assigned. Use the assign-gift endpoint to assign a gift."));
                }
                return Ok(ApiResponse<object>.Success(null, "Cyberek assigned to user successfully"));
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("already"))
            {
                return Conflict(ApiResponse<object>.Error(
                    "User already has a cyberek assigned. Use the assign-gift endpoint to assign a gift."));
            }
        }

        [HttpPut("assign-gift")]
        [ProducesResponseType(typeof(ApiResponse<int>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        [ProducesResponseType(typeof(ApiResponse<object>), 409)] // Conflict - no cyberek assigned or gift already assigned
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> AssignGift(
            [Required][FromQuery] string userName, 
            [FromBody] GiftedCyberekAssignmentDTO giftDto)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();
                return BadRequest(ApiResponse<object>.ValidationError(errors));
            }

            try
            {
                // Service returns the actual gifted cyberek ID chosen by the algorithm
                var assignedId = await _cyberekService.AssignGiftAsync(userName, giftDto.GiftedCyberekId);
                return Ok(ApiResponse<int>.Success(assignedId, "Gift assignment completed successfully"));
            }
            catch (InvalidOperationException ex) when (ex.Message.Contains("must have a cyberek"))
            {
                return Conflict(ApiResponse<object>.Error(
                    "User must have a cyberek assigned before they can assign gifts. Use the assign-cyberek endpoint first."));
            }
        }
    }
}
