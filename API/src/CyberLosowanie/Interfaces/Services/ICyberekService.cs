using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;

namespace CyberLosowanie.Interfaces.Services
{
    public interface ICyberekService
    {
        Task<IEnumerable<Cyberek>> GetAllCyberkiAsync();
        Task<IEnumerable<Cyberek>> GetAvailableToPickCyberkiAsync();
        Task<Cyberek> GetCyberekByIdAsync(int id);
        Task<List<int>> GetAvailableGiftTargetsAsync(int cyberekId);
        
        /// <summary>
        /// Assigns a cyberek to a user (one-time setup operation)
        /// </summary>
        /// <param name="userName">Username to assign cyberek to</param>
        /// <param name="cyberekId">ID of the cyberek to assign</param>
        /// <returns>True if assignment was successful, False if user already has a cyberek</returns>
        Task<bool> AssignCyberekToUserAsync(string userName, int cyberekId);
        
        /// <summary>
        /// Runs the server-side draw for a user's cyberek (requires user to already have a cyberek).
        /// The target is chosen by the algorithm — the client does not pick it.
        /// </summary>
        /// <param name="userName">Username whose cyberek will give the gift</param>
        /// <returns>ID of the cyberek that was assigned as the gift target</returns>
        Task<int> AssignGiftAsync(string userName);

        /// <summary>
        /// Gets the cyberek that the specified user will give a gift to.
        /// Uses the user's GiftedCyberekId and returns the corresponding cyberek.
        /// </summary>
        /// <param name="userName">Username whose gifted cyberek should be returned</param>
        /// <returns>The cyberek that will receive a gift from this user</returns>
        Task<Cyberek> GetGiftedCyberekForUserAsync(string userName);
    }
}