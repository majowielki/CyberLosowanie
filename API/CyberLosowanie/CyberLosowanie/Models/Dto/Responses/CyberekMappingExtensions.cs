namespace CyberLosowanie.Models.Dto.Responses
{
    /// <summary>
    /// Maps <see cref="Cyberek"/> entities to their public response projection.
    /// This is the single place the API decides which fields are exposed.
    /// </summary>
    public static class CyberekMappingExtensions
    {
        public static CyberekResponse ToResponse(this Cyberek cyberek) => new()
        {
            Id = cyberek.Id,
            Name = cyberek.Name,
            Surname = cyberek.Surname,
            ImageUrl = cyberek.ImageUrl
        };

        public static IEnumerable<CyberekResponse> ToResponse(this IEnumerable<Cyberek> cyberki)
            => cyberki.Select(c => c.ToResponse());
    }
}
