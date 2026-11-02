using CyberLosowanie.Constants;
using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>
    /// The box the user chose to open in the draw — a box number in the user's own
    /// secret box order, never a cyberek id. The server maps it to the cyberek inside,
    /// re-validates the choice under a serialized transaction and either commits it or
    /// rejects it with 409 when the box is no longer available.
    /// </summary>
    public class GiftChoiceDTO
    {
        [Range(1, CyberLosowanieConstants.TOTAL_CYBERKI_COUNT,
               ErrorMessage = "Box number must be between {1} and {2}")]
        public int BoxNumber { get; set; }
    }
}
