using CyberLosowanie.Constants;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

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
        [EnableRateLimiting(CyberLosowanieConstants.LOGIN_RATE_LIMIT_POLICY)]
        [ProducesResponseType(typeof(ApiResponse<LoginResponseDTO>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 401)]
        [ProducesResponseType(typeof(ApiResponse<object>), 429)] // account locked, or too many attempts from this client
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> Login([FromBody] LoginRequestDTO model)
        {
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
        [EnableRateLimiting(EmailConstants.EMAIL_RATE_LIMIT_POLICY)]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> Register([FromBody] RegisterRequestDTO model)
        {
            await _authService.RegisterAsync(model);
            
            // Log successful registration to audit table
            await _auditService.LogInformationAsync(
                $"New user '{model.UserName}' registered successfully",
                HttpContext,
                userName: model.UserName,
                additionalData: new { Action = "Register", Success = true });
            
            return Ok(ApiResponse<object>.Success(null, "Registration successful"));
        }

        [HttpPost("confirm-email")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> ConfirmEmail([FromBody] ConfirmEmailRequestDTO model)
        {
            await _authService.ConfirmEmailAsync(model);

            await _auditService.LogInformationAsync(
                "Email confirmed",
                HttpContext,
                userId: model.UserId,
                additionalData: new { Action = "ConfirmEmail", Success = true });

            return Ok(ApiResponse<object>.Success(null, "Email confirmed"));
        }

        /// <summary>
        /// Always 200 — the response is the same whether or not the account exists or
        /// is already confirmed, so the endpoint cannot be used to probe for accounts.
        /// </summary>
        [HttpPost("resend-confirmation")]
        [EnableRateLimiting(EmailConstants.EMAIL_RATE_LIMIT_POLICY)]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 429)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> ResendConfirmation([FromBody] ResendConfirmationRequestDTO model)
        {
            await _authService.ResendConfirmationAsync(model);
            return Ok(ApiResponse<object>.Success(null, "If the account needs confirmation, a new link has been sent"));
        }

        /// <summary>
        /// Always 200 — the response is the same whether or not the account exists, so
        /// the endpoint cannot be used to probe for accounts.
        /// </summary>
        [HttpPost("forgot-password")]
        [EnableRateLimiting(EmailConstants.EMAIL_RATE_LIMIT_POLICY)]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 429)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequestDTO model)
        {
            await _authService.RequestPasswordResetAsync(model);
            return Ok(ApiResponse<object>.Success(null, "If the account exists, a password reset link has been sent"));
        }

        [HttpPost("reset-password")]
        [EnableRateLimiting(EmailConstants.EMAIL_RATE_LIMIT_POLICY)]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        [ProducesResponseType(typeof(ApiResponse<object>), 429)]
        [ProducesResponseType(typeof(ApiResponse<object>), 500)]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequestDTO model)
        {
            await _authService.ResetPasswordAsync(model);

            await _auditService.LogInformationAsync(
                "Password reset",
                HttpContext,
                userId: model.UserId,
                additionalData: new { Action = "ResetPassword", Success = true });

            return Ok(ApiResponse<object>.Success(null, "Password has been reset"));
        }
    }
}
