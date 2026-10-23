using CyberLosowanie.Models;
using Microsoft.EntityFrameworkCore.Storage;

namespace CyberLosowanie.Interfaces.Repositories
{
    public interface IApplicationUserRepository
    {
        Task<IEnumerable<ApplicationUser>> GetAllAsync();
        Task<ApplicationUser?> GetByIdAsync(string id);
        Task<ApplicationUser?> GetByUsernameAsync(string username);
        Task<ApplicationUser?> GetByEmailAsync(string email);
        /// <summary>The user who drew <paramref name="cyberekId"/> (their Santa), or null before that happens.</summary>
        Task<ApplicationUser?> GetSantaOfCyberekAsync(int cyberekId);
        /// <summary>The user who picked <paramref name="cyberekId"/> as their own, or null while it is free.</summary>
        Task<ApplicationUser?> GetOwnerOfCyberekAsync(int cyberekId);
        Task UpdateAsync(ApplicationUser user);
        Task SaveChangesAsync();
        Task<IDbContextTransaction> BeginTransactionAsync();
    }
}
