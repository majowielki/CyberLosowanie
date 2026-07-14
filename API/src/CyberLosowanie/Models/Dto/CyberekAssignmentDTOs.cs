using CyberLosowanie.Constants;
using System.ComponentModel.DataAnnotations;

namespace CyberLosowanie.Models.Dto
{
    /// <summary>
    /// DTO for assigning a user to a cyberek (one-time setup)
    /// </summary>
    public class CyberekAssignmentDTO
    {
        [Range(CyberLosowanieConstants.MIN_CYBEREK_ID, CyberLosowanieConstants.MAX_CYBEREK_ID,
               ErrorMessage = "Cyberek ID must be between {1} and {2}")]
        public int CyberekId { get; set; }
    }
}