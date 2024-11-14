using CyberLosowanie.Data;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace CyberLosowanie.Controllers
{
    [Route("api/CyberLosowanie")]
    [ApiController]
    public class CyberLosowanieController : ControllerBase
    {
        private readonly ApplicationDbContext _dbContext;
        private readonly IGiftingService _giftingService;
        private ApiResponse _apiResponse;
        public CyberLosowanieController(ApplicationDbContext dbContext, IGiftingService giftingService)
        {
            _dbContext = dbContext;
            _giftingService = giftingService;
            _apiResponse = new ApiResponse();
        }

        [HttpGet]
        public async Task<IActionResult> GetCyberki()
        {
            _apiResponse.Result = await _dbContext.Cyberki.ToListAsync();
            _apiResponse.StatusCode = HttpStatusCode.OK;
            return Ok(_apiResponse);
        }

        [HttpGet("{id:int}", Name = "GetCyberek")]
        public async Task<IActionResult> GetCyberek(int id)
        {
            if (id == 0)
            {
                _apiResponse.StatusCode = HttpStatusCode.BadRequest;
                return BadRequest(_apiResponse);
            }

            Cyberek cyberek = await _dbContext.Cyberki.FindAsync(id);

            if (cyberek == null)
            {
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                return NotFound(_apiResponse);
            }
            _apiResponse.Result = cyberek;
            _apiResponse.StatusCode = HttpStatusCode.OK;
            return Ok(_apiResponse);
        }

        [HttpGet("validate")]
        public async Task<IActionResult> GetToBeGiftedCyberki(int id)
        {
            Cyberek cyberek = await _dbContext.Cyberki.FindAsync(id);
            if (cyberek == null)
            {
                _apiResponse.StatusCode = HttpStatusCode.NotFound;
                return NotFound(_apiResponse);
            }
            else if (cyberek.GiftedCyberekId != 0)
            {
                _apiResponse.Result = cyberek.GiftedCyberekId;
                _apiResponse.StatusCode = HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
            else
            {
                var cyberki = await _dbContext.Cyberki.ToListAsync();

                _apiResponse.Result = _giftingService.GetAvailableToBeGiftedCyberki(cyberki, cyberek.BannedCyberki);
                _apiResponse.StatusCode = HttpStatusCode.OK;
                return Ok(_apiResponse);
            }
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<ApiResponse>> UpdateCyberek(int id, [FromForm] CyberekUpdateDTO cyberekUpdateDto)
        {
            try
            {
                var cyberki = await _dbContext.Cyberki.ToListAsync();
                var cyberek = cyberki.FirstOrDefault(c => c.Id == id);
                if (cyberek != null)
                {
                    if (cyberek.ApplicationUserId == 0)
                    {
                        cyberek.ApplicationUserId = cyberekUpdateDto.ApplicationUserId;
                    }
                    if (cyberek.GiftedCyberekId == 0)
                    {
                        cyberek.GiftedCyberekId = _giftingService.GetAvailableToBeGiftedCyberek(cyberki, cyberek, cyberekUpdateDto.GiftedCyberekId);
                    }
                }
                else
                {
                    _apiResponse.StatusCode = HttpStatusCode.NotFound;
                    return NotFound(_apiResponse);
                }

                _dbContext.Cyberki.Update(cyberek);
                await _dbContext.SaveChangesAsync();
                _apiResponse.StatusCode = HttpStatusCode.NoContent;
                return Ok(_apiResponse);
            }
            catch (Exception ex)
            {
                _apiResponse.IsSuccess = false;
                _apiResponse.StatusCode = HttpStatusCode.InternalServerError;
                _apiResponse.ErrorMessages.Add(ex.Message);
                return StatusCode((int)HttpStatusCode.InternalServerError, _apiResponse);
            }
        }
    }
}
