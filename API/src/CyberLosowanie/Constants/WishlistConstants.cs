namespace CyberLosowanie.Constants
{
    /// <summary>
    /// Limits and settings for the wishlist canvas feature. Server-side source of
    /// truth (section 3.4 of Docs/lista-zyczen-projekt.md); the frontend mirrors
    /// these values in features/wishlist/canvas/canvasConstants.ts.
    /// </summary>
    public static class WishlistConstants
    {
        // Canvas document schema
        public const int CANVAS_DOCUMENT_VERSION = 1;
        public const int CANVAS_WIDTH = 1080;
        public const int CANVAS_HEIGHT = 1528;

        // Document limits (validated before anything reaches the database)
        public const int MAX_CANVAS_JSON_BYTES = 512 * 1024;
        public const int MAX_STROKES = 4_000;
        public const int MAX_POINTS_PER_STROKE = 20_000;
        public const int MAX_ITEMS = 120;
        public const int MAX_IMAGE_ITEMS = 10;
        public const int MAX_TEXT_LENGTH = 500;
        public const int MIN_STROKE_WIDTH = 1;
        public const int MAX_STROKE_WIDTH = 64;
        public const int MIN_FONT_SIZE = 8;
        public const int MAX_FONT_SIZE = 200;

        // Document vocabulary (mirrored by the frontend document types)
        public const string TOOL_PEN = "pen";
        public const string TOOL_ERASER = "eraser";
        public const string ITEM_TYPE_TEXT = "text";
        public const string ITEM_TYPE_IMAGE = "image";

        // Image upload / storage
        public const long MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
        public const string IMAGES_CONTAINER_NAME = "wishlist-images";

        // Error messages
        public const string CYBEREK_NOT_SELECTED =
            "You must select your cyberek before using the wishlist.";
        public const string DRAW_NOT_COMPLETED =
            "You have not completed the draw yet, so there is no gifted person's wishlist to show.";
        public const string IMAGE_ACCESS_DENIED =
            "You may only view images belonging to your own wishlist or your gifted person's wishlist.";
        public const string INVALID_IMAGE_FILE =
            "Uploaded file must be a JPEG, PNG or WebP image.";
        public static readonly string IMAGE_TOO_LARGE =
            $"Uploaded image must not exceed {MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024)} MB.";
    }
}
