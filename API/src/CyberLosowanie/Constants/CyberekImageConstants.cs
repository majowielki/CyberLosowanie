namespace CyberLosowanie.Constants
{
    /// <summary>
    /// Portraits of the cyberki. Every cyberek has one image per kind, stored in
    /// the private container as "{cyberekId}/{kind}.jpg" — the path follows from
    /// the id, so nothing about storage lives in the database (E6). Uploaded by
    /// API/scripts/Upload-CyberkiImages.ps1; the frontend mirrors the kinds in
    /// types/cyberekModel.ts.
    /// </summary>
    public static class CyberekImageConstants
    {
        public const string CONTAINER_NAME = "cyberki-images";

        // Picking yourself: you are the Santa.
        public const string KIND_SANTA = "santa";
        // The draw reveal: easy to recognise at a glance.
        public const string KIND_CARICATURE = "caricature";
        // The wishlist: a child writing a letter to Santa.
        public const string KIND_CHILD = "child";

        public static readonly IReadOnlySet<string> KINDS = new HashSet<string>(StringComparer.Ordinal)
        {
            KIND_SANTA, KIND_CARICATURE, KIND_CHILD
        };

        public const string CONTENT_TYPE = "image/jpeg";

        public static string BlobPath(int cyberekId, string kind) => $"{cyberekId}/{kind}.jpg";

        // Error messages
        public static readonly string INVALID_IMAGE_KIND =
            $"Image kind must be one of: {string.Join(", ", KINDS)}.";
        public const string IMAGE_NOT_FOUND = "Cyberek image not found.";
    }
}
