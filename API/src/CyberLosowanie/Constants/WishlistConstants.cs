namespace CyberLosowanie.Constants
{
    /// <summary>
    /// Limits and settings for the wishlist canvas feature. Server-side source of
    /// truth (section 3.4 of Docs/lista-zyczen-projekt.md); the frontend mirrors
    /// these values in features/wishlist/canvas/canvasConstants.ts.
    /// </summary>
    public static class WishlistConstants
    {
        // Canvas document schema. The document is a list of pages (a carousel),
        // each with its own background, strokes and items.
        public const int CANVAS_DOCUMENT_VERSION = 2;
        public const int CANVAS_WIDTH = 1080;
        public const int CANVAS_HEIGHT = 1528;

        // Document limits (validated before anything reaches the database)
        public const int MAX_CANVAS_JSON_BYTES = 512 * 1024;
        public const int MAX_PAGES = 10;
        // Strokes and items are counted per page; the total document size is
        // additionally bounded by MAX_CANVAS_JSON_BYTES.
        public const int MAX_STROKES_PER_PAGE = 4_000;
        // Also the budget for all rings of one area fill together.
        public const int MAX_POINTS_PER_STROKE = 20_000;
        public const int MAX_FILL_RINGS = 256;
        public const int MAX_ITEMS_PER_PAGE = 120;
        // Images are capped across the whole document (each one is a stored blob).
        public const int MAX_IMAGE_ITEMS = 10;
        public const int MAX_TEXT_LENGTH = 500;
        public const int MIN_STROKE_WIDTH = 1;
        public const int MAX_STROKE_WIDTH = 64;
        public const int MIN_FONT_SIZE = 8;
        public const int MAX_FONT_SIZE = 200;

        // Document vocabulary (mirrored by the frontend document types)
        public const string TOOL_PEN = "pen";
        public const string TOOL_ERASER = "eraser";
        // Area fill on the drawing layer: polygons ("rings") instead of a path.
        public const string TOOL_FILL = "fill";
        // Pen styles (stroke "kind"): only meaningful for TOOL_PEN. A pen stroke
        // without a kind is a plain pen — documents saved before styles existed.
        public const string STROKE_KIND_PEN = "pen";
        public static readonly IReadOnlySet<string> STROKE_KINDS = new HashSet<string>(StringComparer.Ordinal)
        {
            STROKE_KIND_PEN, "marker", "highlighter", "crayon", "glossy", "neon", "glitter"
        };
        // Page background patterns (page "pattern"); absent = plain colour.
        public static readonly IReadOnlySet<string> PAGE_PATTERNS = new HashSet<string>(StringComparer.Ordinal)
        {
            "dots", "grid", "lines", "stripes", "checker", "snowflakes", "stars", "satin", "glossy", "paper"
        };
        public const string ITEM_TYPE_TEXT = "text";
        // Text fonts (item "fontFamily"); absent = the default sans-serif (texts
        // saved before fonts existed). The font files ship with the frontend; ids
        // live in saved wishlists, so they are only ever added.
        public static readonly IReadOnlySet<string> FONT_FAMILIES = new HashSet<string>(StringComparer.Ordinal)
        {
            "caveat", "patrick-hand", "berkshire-swash", "lobster", "great-vibes", "kaushan-script", "rubik-wet-paint"
        };
        public const string ITEM_TYPE_IMAGE = "image";
        public const string ITEM_TYPE_SHAPE = "shape";
        // Shape items (item "shape"); outline colour + width like a pen stroke, optional fill.
        public static readonly IReadOnlySet<string> SHAPE_KINDS = new HashSet<string>(StringComparer.Ordinal)
        {
            "rect", "ellipse", "triangle", "diamond", "star", "heart", "arrow"
        };
        // Built-in sticker library (item "stickerId"). The artwork ships with the
        // frontend (src/assets/stickers); the document stores only the id. Ids live
        // in saved wishlists, so they are only ever added — never renamed or removed.
        public const string ITEM_TYPE_STICKER = "sticker";
        public static readonly IReadOnlySet<string> STICKER_IDS = new HashSet<string>(StringComparer.Ordinal)
        {
            "drogi-mikolaju", "choinka", "prezent",
            "moja-lista-zyczen", "bylem-grzeczny", "bylam-grzeczna", "ho-ho-ho",
            "top-1", "top-2", "top-3", "hit", "strzalka",
            "metka", "wstega", "karteczka", "tasma-czerwona", "tasma-zielona",
            "mikolaj", "renifer", "balwan", "piernikowy-ludzik",
            "skarpeta", "bombka", "laska-cukrowa",
            "elf", "pingwin", "kot-w-czapce", "mis",
            "dzwonek", "jemiola", "gwiazda-betlejemska", "swieca", "sniezynka", "gwiazdka", "lampki", "sanie", "kakao",
            "koperta", "znaczek", "ramka-polaroid", "wianek",
            "pierniki", "karp", "pierogi",
            "wesolych-swiat", "dziekuje", "zaskocz-mnie", "bardzo-prosze",
            "pixel-prezent", "pixel-choinka", "robot-elf", "mikolaj-vr"
        };

        // Image upload / storage
        public const long MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
        public const string IMAGES_CONTAINER_NAME = "wishlist-images";

        // Letter to Santa: optional note quoted in the email.
        public const int MAX_SANTA_NOTE_LENGTH = 300;

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
        public const string WISHLIST_NOT_SAVED =
            "Save your wishlist before sending it to Santa.";
        public const string NO_CHANGES_SINCE_NOTIFICATION =
            "Nothing has changed since Santa was last notified.";
    }
}
