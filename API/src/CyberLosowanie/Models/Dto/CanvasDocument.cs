namespace CyberLosowanie.Models.Dto
{
    /// <summary>
    /// Typed server-side model of the wishlist canvas document stored in
    /// <see cref="Models.Wishlist.CanvasJson"/>. Incoming JSON is deserialized into
    /// this model, validated (Services/CanvasDocumentValidator) and re-serialized,
    /// so unknown fields are dropped and only checked data reaches the database.
    /// </summary>
    public class CanvasDocument
    {
        public int Version { get; set; }
        public CanvasSettings? Canvas { get; set; }
        public List<CanvasStroke>? Strokes { get; set; }
        public List<CanvasItem>? Items { get; set; }
    }

    /// <summary>Logical workspace of the document — fixed 1080x1528 (decision D5).</summary>
    public class CanvasSettings
    {
        public int Width { get; set; }
        public int Height { get; set; }
        public string? Background { get; set; }
    }

    /// <summary>
    /// A freehand stroke. Rendered on a layer below the items, because the eraser
    /// works via destination-out compositing and may only affect the drawing layer.
    /// </summary>
    public class CanvasStroke
    {
        public string? Id { get; set; }
        public string? Tool { get; set; }
        public string? Color { get; set; }
        public double Width { get; set; }
        public List<double>? Points { get; set; }
    }

    /// <summary>
    /// A transformable element (text or image). One class for both types keeps
    /// (de)serialization simple; per-type required fields are enforced by the
    /// validator. Order in the list is the z-order.
    /// </summary>
    public class CanvasItem
    {
        public string? Id { get; set; }
        public string? Type { get; set; }
        public double X { get; set; }
        public double Y { get; set; }
        public double Rotation { get; set; }

        // Text fields
        public string? Text { get; set; }
        public double? FontSize { get; set; }
        public string? Fill { get; set; }

        // Shared (text wrap width / image size)
        public double? Width { get; set; }

        // Image fields
        public double? Height { get; set; }

        /// <summary>Blob path "{cyberekId}/{guid}.{ext}" — must belong to the author.</summary>
        public string? Path { get; set; }
    }
}
