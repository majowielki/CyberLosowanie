using CyberLosowanie.Models;

namespace CyberLosowanie.Interfaces.Services
{
    public interface IAuditService
    {
        Task LogErrorAsync(Exception exception, HttpContext context, string? userId = null, string? userName = null);
        // Persists an error from a pre-captured request snapshot (used by the global
        // exception handler so auditing can run on its own background DI scope).
        Task LogErrorAsync(Exception exception, AuditContext auditContext);
        Task LogInformationAsync(string message, HttpContext? context = null, string? userId = null, string? userName = null, object? additionalData = null);
        Task LogWarningAsync(string message, HttpContext? context = null, string? userId = null, string? userName = null, object? additionalData = null);
        Task LogCriticalAsync(string message, Exception? exception = null, HttpContext? context = null, string? userId = null, string? userName = null);
    }
}