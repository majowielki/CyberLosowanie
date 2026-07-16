using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Text.Json;

namespace CyberLosowanie.Middleware
{
    public class GlobalExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;
        private readonly IWebHostEnvironment _env;
        private readonly IServiceScopeFactory _scopeFactory;

        public GlobalExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<GlobalExceptionHandlingMiddleware> logger,
            IWebHostEnvironment env,
            IServiceScopeFactory scopeFactory)
        {
            _next = next;
            _logger = logger;
            _env = env;
            _scopeFactory = scopeFactory;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Enable buffering up-front so the request body can be re-read for auditing
            // if an exception occurs after model binding has consumed it.
            context.Request.EnableBuffering();

            try
            {
                await _next.Invoke(context);
            }
            catch (Exception ex)
            {
                var userId = context.User?.FindFirst("id")?.Value;
                var userName = context.User?.FindFirst("fullName")?.Value;

                // Log structured error with correlation ID
                _logger.LogError(ex,
                    "Unhandled exception occurred. CorrelationId: {CorrelationId}, UserId: {UserId}, Path: {Path}",
                    context.TraceIdentifier, userId, context.Request.Path);

                // Capture everything we need from the (still alive) request now, so the
                // background task never touches the disposed HttpContext or request scope.
                var auditContext = await CaptureAuditContextAsync(context, userId, userName);

                // Persist the audit entry on its OWN DI scope (fresh DbContext), so it is
                // not tied to the request scope that is about to be disposed (F1).
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using var scope = _scopeFactory.CreateScope();
                        var auditService = scope.ServiceProvider.GetRequiredService<IAuditService>();
                        await auditService.LogErrorAsync(ex, auditContext);
                    }
                    catch (Exception auditEx)
                    {
                        _logger.LogError(auditEx, "Failed to log exception to audit table");
                    }
                });

                await HandleExceptionAsync(context, ex, _env);
            }
        }

        private static async Task<AuditContext> CaptureAuditContextAsync(HttpContext context, string? userId, string? userName)
        {
            return new AuditContext
            {
                CorrelationId = context.TraceIdentifier,
                UserId = userId,
                UserName = userName,
                IpAddress = GetClientIpAddress(context),
                UserAgent = context.Request.Headers.UserAgent.ToString(),
                HttpMethod = context.Request.Method,
                RequestPath = context.Request.Path + context.Request.QueryString,
                ResponseStatusCode = context.Response.StatusCode,
                RequestBody = await ReadRequestBodyAsync(context)
            };
        }

        private static string GetClientIpAddress(HttpContext context)
        {
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

        private static async Task<string?> ReadRequestBodyAsync(HttpContext context)
        {
            if (!HttpMethods.IsPost(context.Request.Method) && !HttpMethods.IsPut(context.Request.Method))
            {
                return null;
            }

            // Never persist credentials: auth endpoints carry username/password (S7).
            if (context.Request.Path.StartsWithSegments("/api/auth", StringComparison.OrdinalIgnoreCase))
            {
                return "[AUTH_BODY_OMITTED]";
            }

            try
            {
                context.Request.Body.Position = 0;
                using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
                var body = await reader.ReadToEndAsync();
                context.Request.Body.Position = 0;

                // Defence-in-depth for any other path that may carry a secret.
                if (body.Contains("password", StringComparison.OrdinalIgnoreCase))
                {
                    return "[CONTAINS_SENSITIVE_DATA]";
                }

                return body.Length > 1000 ? body[..1000] + "..." : body;
            }
            catch
            {
                return "[UNABLE_TO_READ]";
            }
        }

        private static async Task HandleExceptionAsync(HttpContext context, Exception exception, IWebHostEnvironment env)
        {
            var response = context.Response;
            response.ContentType = "application/json";

            var (statusCode, message, errors) = exception switch
            {
                CyberekNotFoundException ex => (HttpStatusCode.NotFound, ex.Message, null as List<string>),
                UserNotFoundException ex => (HttpStatusCode.NotFound, ex.Message, null as List<string>),
                // Race outcome, not a client error: the box was valid when displayed but is
                // gone now — the client should refresh the list and let the user pick again.
                GiftTargetUnavailableException ex => (HttpStatusCode.Conflict, ex.Message, null as List<string>),
                // Wishlist operations require the corresponding draw step to be done
                // (cyberek selected / draw completed) — a state conflict, not a client bug.
                WishlistConflictException ex => (HttpStatusCode.Conflict, ex.Message, null as List<string>),
                ForbiddenAccessException ex => (HttpStatusCode.Forbidden, ex.Message, null as List<string>),
                InvalidGiftAssignmentException ex => (HttpStatusCode.BadRequest, ex.Message, null as List<string>),
                BusinessValidationException ex => (HttpStatusCode.BadRequest, "Validation failed", ex.ValidationErrors),
                ArgumentNullException ex => (HttpStatusCode.BadRequest, $"Required parameter is missing: {ex.ParamName}", null as List<string>),
                ArgumentException ex => (HttpStatusCode.BadRequest, ex.Message, null as List<string>),
                UnauthorizedAccessException ex => (HttpStatusCode.Unauthorized, ex.Message, null as List<string>),
                // Anything not matched above (DataAccessException, unexpected InvalidOperationException,
                // framework errors, ...) is an unexpected server error -> 500, never a client 4xx.
                _ => env.IsDevelopment()
                    ? (HttpStatusCode.InternalServerError, exception.Message, null as List<string>)
                    : (HttpStatusCode.InternalServerError, CyberLosowanieConstants.DEFAULT_ERROR_MESSAGE, null as List<string>)
            };

            response.StatusCode = (int)statusCode;

            var apiResponse = errors?.Any() == true 
                ? ApiResponse<object>.ValidationError(errors)
                : ApiResponse<object>.Error(message, statusCode);

            // Add correlation ID to response for tracking
            var responseObject = new
            {
                apiResponse.IsSuccess,
                apiResponse.Data,
                apiResponse.Message,
                apiResponse.Errors,
                apiResponse.StatusCode,
                CorrelationId = context.TraceIdentifier,
                Timestamp = DateTime.UtcNow
            };

            var jsonResponse = JsonSerializer.Serialize(responseObject, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            await response.WriteAsync(jsonResponse);
        }
    }
}