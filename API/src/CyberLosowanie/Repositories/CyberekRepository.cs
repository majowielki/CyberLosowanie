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

        // Two users can validate different targets against the same snapshot and each
        // choice alone is safe, while both together strand a third person — no unique
        // index catches that (targets differ). An exclusive, transaction-scoped applock
        // makes validate+commit sections run one at a time (released automatically at
        // commit/rollback). On SQLite (tests) writes are serialized by the engine's
        // single-writer model, so this is a no-op — same pattern as the AuditLog column
        // types guarded by IsSqlServer().
        public async Task AcquireDrawLockAsync()
        {
            if (_context.Database.IsSqlServer())
            {
                await _context.Database.ExecuteSqlRawAsync(
                    "EXEC sp_getapplock @Resource = N'CyberLosowanie.GiftDraw', @LockMode = 'Exclusive', @LockOwner = 'Transaction';");
            }
        }
    }
}