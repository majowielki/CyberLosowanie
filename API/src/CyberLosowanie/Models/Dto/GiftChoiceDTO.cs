using CyberLosowanie.Constants;
using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>
    /// The box (cyberek id) the user chose to open in the draw. The server re-validates
    /// the choice under a serialized transaction and either commits it or rejects it
    /// with 409 when the box is no longer available.
    /// </summary>
    public class GiftChoiceDTO
    {
        [Range(CyberLosowanieConstants.MIN_CYBEREK_ID, CyberLosowanieConstants.MAX_CYBEREK_ID,
               ErrorMessage = "Cyberek ID must be between {1} and {2}")]
        public int GiftedCyberekId { get; set; }
    }
}
