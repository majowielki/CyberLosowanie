using CyberLosowanie.Constants;
using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>
    /// DTO for assigning a gift target to a user's cyberek (requires user to already have a cyberek)
    /// </summary>
    public class GiftedCyberekAssignmentDTO
    {
        /// <summary>
        /// ID of the cyberek that will receive the gift
        /// </summary>
        [Range(CyberLosowanieConstants.MIN_CYBEREK_ID, CyberLosowanieConstants.MAX_CYBEREK_ID, 
               ErrorMessage = CyberLosowanieConstants.INVALID_CYBEREK_ID)]
        public int GiftedCyberekId { get; set; }
    }
}
