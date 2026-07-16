using CyberLosowanie.Constants;
using CyberLosowanie.Models.Dto;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Parses and validates a wishlist canvas document against the limits from
    /// section 3.4 of Docs/lista-zyczen-projekt.md. The document is deserialized
    /// into the typed model, checked, and re-serialized to a canonical form —
    /// raw client JSON never reaches the database.
    /// </summary>
    public static class CanvasDocumentValidator
    {
        // Web defaults: camelCase names, case-insensitive matching — the same shape
        // the frontend produces. Null members are dropped on re-serialization so a
        // text item never carries image-only fields (and vice versa).
        private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
        {
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        private static readonly Regex HexColorRegex =
            new(@"^#[0-9a-fA-F]{6}$", RegexOptions.Compiled);

        // Blob path format produced by the upload endpoint: {cyberekId}/{guid:N}.{ext}
        private static readonly Regex ImagePathRegex =
            new(@"^(?<cyberekId>\d{1,9})/[0-9a-fA-F]{32}\.(jpg|png|webp)$", RegexOptions.Compiled);

        /// <summary>File-name part of an image path (used by the image proxy endpoint).</summary>
        public static readonly Regex ImageFileNameRegex =
            new(@"^[0-9a-fA-F]{32}\.(jpg|png|webp)$", RegexOptions.Compiled);

        /// <summary>
        /// Validates <paramref name="canvasJson"/> for the given author. On success
        /// returns the typed document and an empty error list; on failure the document
        /// is null and the errors describe every violated rule.
        /// </summary>
        public static (CanvasDocument? Document, List<string> Errors) Parse(string canvasJson, int authorCyberekId)
        {
            var errors = new List<string>();

            if (string.IsNullOrWhiteSpace(canvasJson))
            {
                errors.Add("Canvas document must not be empty.");
                return (null, errors);
            }

            if (Encoding.UTF8.GetByteCount(canvasJson) > WishlistConstants.MAX_CANVAS_JSON_BYTES)
            {
                errors.Add($"Canvas document must not exceed {WishlistConstants.MAX_CANVAS_JSON_BYTES / 1024} KB.");
                return (null, errors);
            }

            CanvasDocument? document;
            try
            {
                document = JsonSerializer.Deserialize<CanvasDocument>(canvasJson, SerializerOptions);
            }
            catch (JsonException)
            {
                errors.Add("Canvas document is not valid JSON.");
                return (null, errors);
            }

            if (document == null)
            {
                errors.Add("Canvas document must not be null.");
                return (null, errors);
            }

            ValidateSchema(document, authorCyberekId, errors);
            return errors.Count == 0 ? (document, errors) : (null, errors);
        }

        /// <summary>Serializes a validated document to its canonical stored form.</summary>
        public static string ToCanonicalJson(CanvasDocument document) =>
            JsonSerializer.Serialize(document, SerializerOptions);

        /// <summary>Blob paths of all image items — used for orphaned blob cleanup.</summary>
        public static HashSet<string> GetReferencedImagePaths(CanvasDocument document) =>
            (document.Items ?? [])
                .Where(i => i.Type == WishlistConstants.ITEM_TYPE_IMAGE && !string.IsNullOrEmpty(i.Path))
                .Select(i => i.Path!)
                .ToHashSet(StringComparer.OrdinalIgnoreCase);

        private static void ValidateSchema(CanvasDocument document, int authorCyberekId, List<string> errors)
        {
            if (document.Version != WishlistConstants.CANVAS_DOCUMENT_VERSION)
            {
                errors.Add($"Canvas document version must be {WishlistConstants.CANVAS_DOCUMENT_VERSION}.");
            }

            ValidateCanvasSettings(document.Canvas, errors);
            ValidateStrokes(document.Strokes, errors);
            ValidateItems(document.Items, authorCyberekId, errors);
        }

        private static void ValidateCanvasSettings(CanvasSettings? canvas, List<string> errors)
        {
            if (canvas == null)
            {
                errors.Add("Canvas settings are required.");
                return;
            }

            if (canvas.Width != WishlistConstants.CANVAS_WIDTH || canvas.Height != WishlistConstants.CANVAS_HEIGHT)
            {
                errors.Add($"Canvas size must be {WishlistConstants.CANVAS_WIDTH}x{WishlistConstants.CANVAS_HEIGHT}.");
            }

            if (canvas.Background == null || !HexColorRegex.IsMatch(canvas.Background))
            {
                errors.Add("Canvas background must be a #rrggbb color.");
            }
        }

        private static void ValidateStrokes(List<CanvasStroke>? strokes, List<string> errors)
        {
            if (strokes == null)
            {
                errors.Add("Strokes collection is required (may be empty).");
                return;
            }

            if (strokes.Count > WishlistConstants.MAX_STROKES)
            {
                errors.Add($"Document must not contain more than {WishlistConstants.MAX_STROKES} strokes.");
                return;
            }

            for (var i = 0; i < strokes.Count; i++)
            {
                var stroke = strokes[i];
                var label = $"Stroke {i}";

                if (string.IsNullOrWhiteSpace(stroke.Id))
                {
                    errors.Add($"{label}: id is required.");
                }

                if (stroke.Tool != WishlistConstants.TOOL_PEN && stroke.Tool != WishlistConstants.TOOL_ERASER)
                {
                    errors.Add($"{label}: tool must be '{WishlistConstants.TOOL_PEN}' or '{WishlistConstants.TOOL_ERASER}'.");
                }

                if (stroke.Color == null || !HexColorRegex.IsMatch(stroke.Color))
                {
                    errors.Add($"{label}: color must be a #rrggbb color.");
                }

                if (stroke.Width is < WishlistConstants.MIN_STROKE_WIDTH or > WishlistConstants.MAX_STROKE_WIDTH)
                {
                    errors.Add($"{label}: width must be between {WishlistConstants.MIN_STROKE_WIDTH} and {WishlistConstants.MAX_STROKE_WIDTH}.");
                }

                if (stroke.Points == null || stroke.Points.Count == 0)
                {
                    errors.Add($"{label}: points are required.");
                }
                else if (stroke.Points.Count > WishlistConstants.MAX_POINTS_PER_STROKE)
                {
                    errors.Add($"{label}: a stroke must not contain more than {WishlistConstants.MAX_POINTS_PER_STROKE} points.");
                }
                else if (stroke.Points.Count % 2 != 0)
                {
                    errors.Add($"{label}: points must be a flat list of x,y pairs (even count).");
                }
            }
        }

        private static void ValidateItems(List<CanvasItem>? items, int authorCyberekId, List<string> errors)
        {
            if (items == null)
            {
                errors.Add("Items collection is required (may be empty).");
                return;
            }

            if (items.Count > WishlistConstants.MAX_ITEMS)
            {
                errors.Add($"Document must not contain more than {WishlistConstants.MAX_ITEMS} items.");
                return;
            }

            var imageCount = items.Count(i => i.Type == WishlistConstants.ITEM_TYPE_IMAGE);
            if (imageCount > WishlistConstants.MAX_IMAGE_ITEMS)
            {
                errors.Add($"Document must not contain more than {WishlistConstants.MAX_IMAGE_ITEMS} images.");
            }

            for (var i = 0; i < items.Count; i++)
            {
                var item = items[i];
                var label = $"Item {i}";

                if (string.IsNullOrWhiteSpace(item.Id))
                {
                    errors.Add($"{label}: id is required.");
                }

                switch (item.Type)
                {
                    case WishlistConstants.ITEM_TYPE_TEXT:
                        ValidateTextItem(item, label, errors);
                        break;
                    case WishlistConstants.ITEM_TYPE_IMAGE:
                        ValidateImageItem(item, authorCyberekId, label, errors);
                        break;
                    default:
                        errors.Add($"{label}: type must be '{WishlistConstants.ITEM_TYPE_TEXT}' or '{WishlistConstants.ITEM_TYPE_IMAGE}'.");
                        break;
                }
            }
        }

        private static void ValidateTextItem(CanvasItem item, string label, List<string> errors)
        {
            if (string.IsNullOrEmpty(item.Text))
            {
                errors.Add($"{label}: text is required.");
            }
            else if (item.Text.Length > WishlistConstants.MAX_TEXT_LENGTH)
            {
                errors.Add($"{label}: text must not exceed {WishlistConstants.MAX_TEXT_LENGTH} characters.");
            }

            if (item.FontSize is null or < WishlistConstants.MIN_FONT_SIZE or > WishlistConstants.MAX_FONT_SIZE)
            {
                errors.Add($"{label}: fontSize must be between {WishlistConstants.MIN_FONT_SIZE} and {WishlistConstants.MAX_FONT_SIZE}.");
            }

            if (item.Fill == null || !HexColorRegex.IsMatch(item.Fill))
            {
                errors.Add($"{label}: fill must be a #rrggbb color.");
            }

            if (item.Width is null or <= 0)
            {
                errors.Add($"{label}: width must be a positive number.");
            }
        }

        private static void ValidateImageItem(CanvasItem item, int authorCyberekId, string label, List<string> errors)
        {
            // Ownership is part of the format: the path must live under the author's
            // prefix, so nobody can reference another participant's image.
            var match = item.Path == null ? null : ImagePathRegex.Match(item.Path);
            if (match is not { Success: true }
                || !int.TryParse(match.Groups["cyberekId"].Value, out var pathCyberekId)
                || pathCyberekId != authorCyberekId)
            {
                errors.Add($"{label}: path must match '{authorCyberekId}/{{guid}}.(jpg|png|webp)' and belong to the author.");
            }

            if (item.Width is null or <= 0 || item.Height is null or <= 0)
            {
                errors.Add($"{label}: width and height must be positive numbers.");
            }
        }
    }
}
