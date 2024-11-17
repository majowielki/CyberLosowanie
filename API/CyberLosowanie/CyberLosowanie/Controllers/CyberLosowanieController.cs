using CyberLosowanie.Data;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Services;
using Microsoft.AspNetCore.Identity;
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
        private readonly UserManager<ApplicationUser> _userManager;
        private ApiResponse _apiResponse;
        public CyberLosowanieController(ApplicationDbContext dbContext, IGiftingService giftingService, UserManager<ApplicationUser> userManager)
        {
            _dbContext = dbContext;
            _giftingService = giftingService;
            _userManager = userManager;
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

        [HttpPut]
        public async Task<ActionResult<ApiResponse>> UpdateUser(string userName, [FromForm] CyberekUpdateDTO cyberekUpdateDto)
        {
            try
            {
                var applicationUser = await _userManager.FindByNameAsync(userName);
                var cyberki = await _dbContext.Cyberki.ToListAsync();
                if (applicationUser == null)
                {
                    _apiResponse.StatusCode = HttpStatusCode.NotFound;
                    return NotFound(_apiResponse);
                }
                else
                {
                    if (applicationUser.CyberekId == 0)
                    {
                        applicationUser.CyberekId = cyberekUpdateDto.CyberekId;
                    }
                    else 
                    {
                        var cyberek = cyberki.FirstOrDefault(c => c.Id == applicationUser.CyberekId);
                        if (cyberek != null)
                        {
                            if (cyberek.GiftedCyberekId == 0)
                            {
                                cyberek.GiftedCyberekId = _giftingService.GetAvailableToBeGiftedCyberek(cyberki, cyberek, cyberekUpdateDto.GiftedCyberekId);
                                applicationUser.GiftedCyberekId = cyberek.GiftedCyberekId;
                            }
                            _dbContext.Cyberki.Update(cyberek);
                        }
                        else
                        {
                            _apiResponse.StatusCode = HttpStatusCode.NotFound;
                            return NotFound(_apiResponse);
                        }
                    }
                }

                _dbContext.ApplicationUsers.Update(applicationUser);
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
