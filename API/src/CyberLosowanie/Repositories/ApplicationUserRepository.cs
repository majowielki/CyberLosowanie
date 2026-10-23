using CyberLosowanie.Data;
using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace CyberLosowanie.Repositories
{
    public class ApplicationUserRepository : IApplicationUserRepository
    {
        private readonly ApplicationDbContext _context;
        private readonly UserManager<ApplicationUser> _userManager;

        public ApplicationUserRepository(ApplicationDbContext context, UserManager<ApplicationUser> userManager)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
        }

        public async Task<IEnumerable<ApplicationUser>> GetAllAsync()
        {
            return await _context.ApplicationUsers.ToListAsync();
        }

        public async Task<ApplicationUser?> GetByIdAsync(string id)
        {
            return await _userManager.FindByIdAsync(id);
        }

        public async Task<ApplicationUser?> GetByUsernameAsync(string username)
        {
            return await _userManager.FindByNameAsync(username);
        }

        public async Task<ApplicationUser?> GetByEmailAsync(string email)
        {
            return await _userManager.FindByEmailAsync(email);
        }

        public async Task<ApplicationUser?> GetSantaOfCyberekAsync(int cyberekId)
        {
            return await _context.ApplicationUsers.FirstOrDefaultAsync(u => u.GiftedCyberekId == cyberekId);
        }

        public async Task<ApplicationUser?> GetOwnerOfCyberekAsync(int cyberekId)
        {
            return await _context.ApplicationUsers.FirstOrDefaultAsync(u => u.CyberekId == cyberekId);
        }

        public Task UpdateAsync(ApplicationUser user)
        {
            // EF Core's Update is synchronous; there is no I/O until SaveChangesAsync (F5).
            _context.ApplicationUsers.Update(user);
            return Task.CompletedTask;
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task<IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }
    }
}