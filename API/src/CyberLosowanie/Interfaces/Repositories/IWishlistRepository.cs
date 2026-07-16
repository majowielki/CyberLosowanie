using CyberLosowanie.Models;

namespace CyberLosowanie.Interfaces.Repositories
{
    public interface IWishlistRepository
    {
        /// <summary>Tracked read — the returned entity may be mutated and saved (upsert path).</summary>
        Task<Wishlist?> GetByCyberekIdAsync(int cyberekId);
        Task AddAsync(Wishlist wishlist);
        Task SaveChangesAsync();
    }
}
