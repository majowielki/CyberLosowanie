using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using Microsoft.AspNetCore.Mvc;

namespace CyberLosowanie.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly IAuditService _auditService;

        public AuthController(IAuthService authService, IAuditService auditService)
        {
            _authService = authService ?? throw new ArgumentNullException(nameof(authService));
            _auditService = auditService ?? throw new ArgumentNullException(nameof(auditService));
        }

        [HttpPost("login")]
        [ProducesResponseType(typeof(ApiResponse<LoginResponseDTO>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDTO model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<object>.ValidationError(errors));
            }
            
            var loginResponse = await _authService.LoginAsync(model);
            
            // Log successful login to audit table
            await _auditService.LogInformationAsync(
                $"User '{model.UserName}' logged in successfully",
                HttpContext,
                userName: model.UserName,
                additionalData: new { Action = "Login", Success = true });
            
            return Ok(ApiResponse<LoginResponseDTO>.Success(loginResponse, "Login successful"));
        }

        [HttpPost("register")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDTO model)
        {
            if (!ModelState.IsValid)
            {
                var errors = ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage).ToList();
                return BadRequest(ApiResponse<object>.ValidationError(errors));
            }
            
            await _authService.RegisterAsync(model);
            
            // Log successful registration to audit table
            await _auditService.LogInformationAsync(
                $"New user '{model.UserName}' registered successfully",
                HttpContext,
                userName: model.UserName,
                additionalData: new { Action = "Register", Success = true });
            
            return Ok(ApiResponse<object>.Success(null, "Registration successful"));
        }
    }
}
