namespace CyberLosowanie.Models
{
    /// <summary>
    /// Immutable snapshot of the request data needed for auditing. It is captured
    /// while the HttpContext is still alive, so the audit entry can be persisted
    /// later on a background DI scope without touching the (already disposed)
    /// request scope or HttpContext.
    /// </summary>
    public sealed record AuditContext
    {
        public string? CorrelationId { get; init; }
        public string? UserId { get; init; }
        public string? UserName { get; init; }
        public string? IpAddress { get; init; }
        public string? UserAgent { get; init; }
        public string? HttpMethod { get; init; }
        public string? RequestPath { get; init; }
        public int? ResponseStatusCode { get; init; }
        public string? RequestBody { get; init; }
    }
}
