using CyberLosowanie.Models.Dto;

namespace CyberLosowanie.Interfaces.Services
{
    public interface IAuthService
    {
        Task<LoginResponseDTO> LoginAsync(LoginRequestDTO request);
        Task<bool> RegisterAsync(RegisterRequestDTO request);
    }
}