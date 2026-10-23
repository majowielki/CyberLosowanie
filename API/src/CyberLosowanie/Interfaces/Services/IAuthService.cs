using CyberLosowanie.Models.Dto;

namespace CyberLosowanie.Interfaces.Services
{
    public interface IAuthService
    {
        /// <summary>
        /// Signs in by username or email. Throws <see cref="Exceptions.ForbiddenAccessException"/>
        /// (403) when the password is right but the email is not confirmed yet.
        /// </summary>
        Task<LoginResponseDTO> LoginAsync(LoginRequestDTO request);

        /// <summary>Creates the account and emails the confirmation link (best-effort).</summary>
        Task<bool> RegisterAsync(RegisterRequestDTO request);

        /// <summary>Confirms the email from the link. Idempotent for an already confirmed account.</summary>
        Task ConfirmEmailAsync(ConfirmEmailRequestDTO request);

        /// <summary>
        /// Emails a fresh confirmation link. Silent for unknown or already confirmed
        /// accounts, so the endpoint does not reveal which accounts exist.
        /// </summary>
        Task ResendConfirmationAsync(ResendConfirmationRequestDTO request);

        /// <summary>
        /// Emails a single-use password reset link. Silent for unknown accounts, so the
        /// endpoint does not reveal which accounts exist.
        /// </summary>
        Task RequestPasswordResetAsync(ForgotPasswordRequestDTO request);

        /// <summary>
        /// Sets a new password from the emailed link. Also confirms the email address —
        /// opening a link sent to it proves the user owns it.
        /// </summary>
        Task ResetPasswordAsync(ResetPasswordRequestDTO request);
    }
}
