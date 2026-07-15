using CyberLosowanie.Data;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Models;
using Microsoft.EntityFrameworkCore;

namespace CyberLosowanie.Repositories
{
    public class CyberekRepository : ICyberekRepository
    {
        private readonly ApplicationDbContext _context;

        public CyberekRepository(ApplicationDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<IEnumerable<Cyberek>> GetAllAsync()
        {
            return await _context.Cyberki
                .AsNoTracking()
                .ToListAsync();
        }

        // Tracked read for the write path (F4): entities returned here are change-tracked,
        // so they can be mutated and saved inside a transaction without re-attaching a
        // detached AsNoTracking instance.
        public async Task<List<Cyberek>> GetAllForUpdateAsync()
        {
            return await _context.Cyberki.ToListAsync();
        }

        public async Task<Cyberek?> GetByIdAsync(int id)
        {
            return await _context.Cyberki
                .FirstOrDefaultAsync(c => c.Id == id);
        }

        public Task UpdateAsync(Cyberek cyberek)
        {
            // EF Core's Update is synchronous; there is no I/O until SaveChangesAsync (F5).
            _context.Cyberki.Update(cyberek);
            return Task.CompletedTask;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }
    }
}