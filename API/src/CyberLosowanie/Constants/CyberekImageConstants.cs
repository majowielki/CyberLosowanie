namespace CyberLosowanie.Constants
{
    /// <summary>
    /// Portraits of the cyberki. Every cyberek has one image per kind, stored in
    /// the private container as "{cyberekId}/{kind}.jpg" (".webp" for the sticker
    /// kinds) — the path follows from the id, so nothing about storage lives in the
    /// database (E6). Uploaded by API/scripts/Upload-CyberkiImages.ps1; the frontend
    /// mirrors the kinds in types/cyberekModel.ts.
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
        // Wishlist stickers ("my caricature", "me as a child"): the caricature and
        // child portraits cut out, with a white die-cut border, on transparency.
        public const string KIND_CARICATURE_STICKER = "caricature-sticker";
        public const string KIND_CHILD_STICKER = "child-sticker";

        public static readonly IReadOnlySet<string> KINDS = new HashSet<string>(StringComparer.Ordinal)
        {
            KIND_SANTA, KIND_CARICATURE, KIND_CHILD, KIND_CARICATURE_STICKER, KIND_CHILD_STICKER
        };

        private static readonly IReadOnlySet<string> STICKER_KINDS = new HashSet<string>(StringComparer.Ordinal)
        {
            KIND_CARICATURE_STICKER, KIND_CHILD_STICKER
        };

        public const string CONTENT_TYPE = "image/jpeg";
        public const string STICKER_CONTENT_TYPE = "image/webp";

        /// <summary>Photos are JPEG; the sticker kinds need transparency, so they are WebP.</summary>
        public static string ContentType(string kind) => STICKER_KINDS.Contains(kind) ? STICKER_CONTENT_TYPE : CONTENT_TYPE;

        public static string BlobPath(int cyberekId, string kind) =>
            $"{cyberekId}/{kind}.{(STICKER_KINDS.Contains(kind) ? "webp" : "jpg")}";

        // Error messages
        public static readonly string INVALID_IMAGE_KIND =
            $"Image kind must be one of: {string.Join(", ", KINDS)}.";
        public const string IMAGE_NOT_FOUND = "Cyberek image not found.";
    }
}
