using CyberLosowanie.Models;

namespace CyberLosowanie.Interfaces.Repositories
{
    public interface ICyberekRepository
    {
        Task<IEnumerable<Cyberek>> GetAllAsync();
        Task<List<Cyberek>> GetAllForUpdateAsync();
        Task<Cyberek?> GetByIdAsync(int id);
        Task UpdateAsync(Cyberek cyberek);
        Task SaveChangesAsync();

        /// <summary>
        /// Serializes the draw's validate+commit section across concurrent requests.
        /// Must be called inside an active transaction; the lock is released with it.
        /// </summary>
        Task AcquireDrawLockAsync();
    }
}