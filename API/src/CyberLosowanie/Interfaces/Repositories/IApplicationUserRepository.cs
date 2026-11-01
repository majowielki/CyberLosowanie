using CyberLosowanie.Models;

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
        /// <summary>
        /// Runs <paramref name="operation"/> in a database transaction that is committed when it
        /// completes and rolled back when it throws. A transient connection failure replays the
        /// whole operation, so it must re-read the state it validates rather than reuse it.
        /// </summary>
        Task<T> ExecuteInTransactionAsync<T>(Func<Task<T>> operation);
    }
}
