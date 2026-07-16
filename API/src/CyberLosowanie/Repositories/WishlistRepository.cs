using CyberLosowanie.Data;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Models;
using Microsoft.EntityFrameworkCore;

namespace CyberLosowanie.Repositories
{
    public class WishlistRepository : IWishlistRepository
    {
        private readonly ApplicationDbContext _context;

        public WishlistRepository(ApplicationDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<Wishlist?> GetByCyberekIdAsync(int cyberekId)
        {
            return await _context.Wishlists
                .FirstOrDefaultAsync(w => w.CyberekId == cyberekId);
        }

        public async Task AddAsync(Wishlist wishlist)
        {
            await _context.Wishlists.AddAsync(wishlist);
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}
