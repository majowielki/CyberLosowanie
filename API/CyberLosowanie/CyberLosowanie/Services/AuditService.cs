using CyberLosowanie.Data;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using System.Text.Json;

namespace CyberLosowanie.Services
{
    public class AuditService : IAuditService
    {
        private readonly ApplicationDbContext _context;
        private readonly ILogger<AuditService> _logger;

        public AuditService(ApplicationDbContext context, ILogger<AuditService> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task LogErrorAsync(Exception exception, HttpContext context, string? userId = null, string? userName = null)
        {
            try
            {
                var auditLog = CreateBaseAuditLog("Error", context, userId, userName);
                auditLog.Message = exception.Message;
                auditLog.ExceptionDetails = exception.ToString();
                auditLog.StackTrace = exception.StackTrace;

                await SaveAuditLogAsync(auditLog);

                // Also log to standard logger for immediate visibility
                _logger.LogError(exception, "Error logged to audit table: {Message}", exception.Message);
            }
            catch (Exception ex)
            {
                // Fallback to standard logging if audit logging fails
                _logger.LogError(ex, "Failed to save audit log for exception: {OriginalException}", exception.Message);
            }
        }

        public async Task LogErrorAsync(Exception exception, AuditContext auditContext)
        {
            try
            {
                var auditLog = CreateBaseAuditLog("Error", auditContext);
                auditLog.Message = exception.Message;
                auditLog.ExceptionDetails = exception.ToString();
                auditLog.StackTrace = exception.StackTrace;

                await SaveAuditLogAsync(auditLog);
                _logger.LogError(exception, "Error logged to audit table: {Message}", exception.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save audit log for exception: {OriginalException}", exception.Message);
            }
        }

        public async Task LogInformationAsync(string message, HttpContext? context = null, string? userId = null, string? userName = null, object? additionalData = null)
        {
            try
            {
                var auditLog = CreateBaseAuditLog("Information", context, userId, userName);
                auditLog.Message = message;
                
                if (additionalData != null)
                {
                    auditLog.AdditionalData = JsonSerializer.Serialize(additionalData);
                }

                await SaveAuditLogAsync(auditLog);
                _logger.LogInformation("Audit log saved: {Message}", message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save information audit log: {Message}", message);
            }
        }

        public async Task LogWarningAsync(string message, HttpContext? context = null, string? userId = null, string? userName = null, object? additionalData = null)
        {
            try
            {
                var auditLog = CreateBaseAuditLog("Warning", context, userId, userName);
                auditLog.Message = message;
                
                if (additionalData != null)
                {
                    auditLog.AdditionalData = JsonSerializer.Serialize(additionalData);
                }

                await SaveAuditLogAsync(auditLog);
                _logger.LogWarning("Warning audit log saved: {Message}", message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save warning audit log: {Message}", message);
            }
        }

        private AuditLog CreateBaseAuditLog(string logLevel, HttpContext? context, string? userId, string? userName)
        {
            var correlationId = context?.TraceIdentifier ?? Guid.NewGuid().ToString();
            
            var auditLog = new AuditLog
            {
                CorrelationId = correlationId,
                Timestamp = DateTime.UtcNow,
                LogLevel = logLevel,
                Source = "CyberLosowanie.API",
                UserId = userId,
                UserName = userName
            };

            if (context != null)
            {
                auditLog.IpAddress = GetClientIpAddress(context);
                auditLog.UserAgent = context.Request.Headers.UserAgent.ToString();
                auditLog.HttpMethod = context.Request.Method;
                auditLog.RequestPath = context.Request.Path + context.Request.QueryString;
                auditLog.ResponseStatusCode = context.Response.StatusCode;

                // Request body (if any) is captured by the caller within the request
                // lifetime and passed via AuditContext — see the AuditContext overload.
            }

            return auditLog;
        }

        private static AuditLog CreateBaseAuditLog(string logLevel, AuditContext ctx)
        {
            return new AuditLog
            {
                CorrelationId = ctx.CorrelationId ?? Guid.NewGuid().ToString(),
                Timestamp = DateTime.UtcNow,
                LogLevel = logLevel,
                Source = "CyberLosowanie.API",
                UserId = ctx.UserId,
                UserName = ctx.UserName,
                IpAddress = ctx.IpAddress,
                UserAgent = ctx.UserAgent,
                HttpMethod = ctx.HttpMethod,
                RequestPath = ctx.RequestPath,
                ResponseStatusCode = ctx.ResponseStatusCode ?? 0,
                RequestBody = ctx.RequestBody
            };
        }

        private async Task SaveAuditLogAsync(AuditLog auditLog)
        {
            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }

        private static string GetClientIpAddress(HttpContext context)
        {
            // Check for forwarded IP first (in case of proxy/load balancer)
            var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
            {
                return forwardedFor.Split(',')[0].Trim();
            }

            var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(realIp))
            {
                return realIp;
            }

            return context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        }
    }
}