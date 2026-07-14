namespace CyberLosowanie.Models.Dto.Responses
{
    /// <summary>
    /// Public projection of a <see cref="Cyberek"/> returned by the API.
    /// Deliberately omits <c>GiftedCyberekId</c> and <c>BannedCyberki</c> so the
    /// draw result and internal constraints never leak to other users (S5/G1).
    /// </summary>
    public sealed record CyberekResponse
    {
        public int Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Surname { get; init; } = string.Empty;
        public string ImageUrl { get; init; } = string.Empty;
    }
}
