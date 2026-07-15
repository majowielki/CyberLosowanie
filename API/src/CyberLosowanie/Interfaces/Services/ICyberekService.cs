using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;

namespace CyberLosowanie.Interfaces.Services
{
    public interface ICyberekService
    {
        Task<IEnumerable<Cyberek>> GetAllCyberkiAsync();
        Task<IEnumerable<Cyberek>> GetAvailableToPickCyberkiAsync();
        Task<Cyberek> GetCyberekByIdAsync(int id);

        /// <summary>
        /// Boxes the user's cyberek may still safely open: free, not self, not banned,
        /// and guaranteed not to strand any other participant. If the user already drew,
        /// returns a single element — their own target.
        /// </summary>
        /// <param name="userName">Authenticated user the targets are computed for</param>
        Task<List<int>> GetAvailableGiftTargetsForUserAsync(string userName);

        /// <summary>
        /// Assigns a cyberek to a user (one-time setup operation)
        /// </summary>
        /// <param name="userName">Username to assign cyberek to</param>
        /// <param name="cyberekId">ID of the cyberek to assign</param>
        /// <returns>True if assignment was successful, False if user already has a cyberek</returns>
        Task<bool> AssignCyberekToUserAsync(string userName, int cyberekId);

        /// <summary>
        /// Commits the user's chosen gift target (the box they opened). Validated under
        /// a serialized transaction: target free, not self, not banned, and committing it
        /// keeps the draw completable for everyone who has not drawn yet. A no-longer-available
        /// target raises <see cref="Exceptions.GiftTargetUnavailableException"/> (409).
        /// </summary>
        /// <param name="userName">Username whose cyberek gives the gift</param>
        /// <param name="chosenTargetId">The box (cyberek id) the user chose</param>
        /// <returns>ID of the committed gift target (echoes the accepted choice)</returns>
        Task<int> AssignGiftAsync(string userName, int chosenTargetId);

        /// <summary>
        /// Gets the cyberek that the specified user will give a gift to.
        /// Uses the user's GiftedCyberekId and returns the corresponding cyberek.
        /// </summary>
        /// <param name="userName">Username whose gifted cyberek should be returned</param>
        /// <returns>The cyberek that will receive a gift from this user</returns>
        Task<Cyberek> GetGiftedCyberekForUserAsync(string userName);
    }
}