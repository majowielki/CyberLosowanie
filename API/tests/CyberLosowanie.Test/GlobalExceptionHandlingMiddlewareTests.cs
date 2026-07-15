using CyberLosowanie.Constants;
using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Middleware;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Text.Json;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Tests the global exception handler's exception-to-status mapping. The 500 cases
    /// lock in F3: an unexpected exception must never leak out as a client-side 4xx.
    /// </summary>
    public class GlobalExceptionHandlingMiddlewareTests
    {
        private static async Task<(int StatusCode, string Message, List<string> Errors)> InvokeWithException(
            Exception exception, bool isDevelopment = false)
        {
            var context = new DefaultHttpContext();
            context.Request.Method = "GET";
            context.Request.Path = "/api/CyberLosowanie";
            var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            RequestDelegate next = _ => throw exception;

            var env = new Mock<IWebHostEnvironment>();
            env.SetupGet(e => e.EnvironmentName).Returns(isDevelopment ? "Development" : "Production");

            // Fire-and-forget audit runs on its own scope — a loose mock is enough.
            var audit = new Mock<IAuditService>();
            var provider = new Mock<IServiceProvider>();
            provider.Setup(p => p.GetService(typeof(IAuditService))).Returns(audit.Object);
            var scope = new Mock<IServiceScope>();
            scope.SetupGet(s => s.ServiceProvider).Returns(provider.Object);
            var scopeFactory = new Mock<IServiceScopeFactory>();
            scopeFactory.Setup(f => f.CreateScope()).Returns(scope.Object);

            var middleware = new GlobalExceptionHandlingMiddleware(
                next, NullLogger<GlobalExceptionHandlingMiddleware>.Instance, env.Object, scopeFactory.Object);

            await middleware.InvokeAsync(context);

            responseBody.Position = 0;
            using var doc = await JsonDocument.ParseAsync(responseBody);
            var root = doc.RootElement;
            var message = root.GetProperty("message").GetString() ?? string.Empty;
            var errors = root.TryGetProperty("errors", out var errorsEl) && errorsEl.ValueKind == JsonValueKind.Array
                ? errorsEl.EnumerateArray().Select(e => e.GetString() ?? string.Empty).ToList()
                : new List<string>();

            return (context.Response.StatusCode, message, errors);
        }

        [Fact]
        public async Task CyberekNotFoundException_MapsTo404()
        {
            var (status, _, _) = await InvokeWithException(new CyberekNotFoundException(5));
            status.Should().Be(404);
        }

        [Fact]
        public async Task UserNotFoundException_MapsTo404()
        {
            var (status, _, _) = await InvokeWithException(new UserNotFoundException("john"));
            status.Should().Be(404);
        }

        [Fact]
        public async Task InvalidGiftAssignmentException_MapsTo400()
        {
            var (status, _, _) = await InvokeWithException(new InvalidGiftAssignmentException(1, 2, "no target"));
            status.Should().Be(400);
        }

        [Fact]
        public async Task GiftTargetUnavailableException_MapsTo409()
        {
            // Race outcome (box taken / would strand someone) — client refreshes and retries.
            var (status, _, _) = await InvokeWithException(new GiftTargetUnavailableException(1, 5, "box taken"));
            status.Should().Be(409);
        }

        [Fact]
        public async Task BusinessValidationException_MapsTo400WithErrors()
        {
            var errors = new List<string> { "field a invalid", "field b invalid" };
            var (status, _, returnedErrors) = await InvokeWithException(new BusinessValidationException(errors));

            status.Should().Be(400);
            returnedErrors.Should().BeEquivalentTo(errors);
        }

        [Fact]
        public async Task ArgumentException_MapsTo400()
        {
            var (status, _, _) = await InvokeWithException(new ArgumentException("bad arg"));
            status.Should().Be(400);
        }

        [Fact]
        public async Task UnauthorizedAccessException_MapsTo401()
        {
            var (status, _, _) = await InvokeWithException(new UnauthorizedAccessException("nope"));
            status.Should().Be(401);
        }

        [Fact]
        public async Task DataAccessException_MapsTo500_AndHidesDetailsInProduction()
        {
            var (status, message, _) = await InvokeWithException(new DataAccessException("connection string leaked here"));

            status.Should().Be(500);
            message.Should().Be(CyberLosowanieConstants.DEFAULT_ERROR_MESSAGE);
            message.Should().NotContain("leaked");
        }

        [Fact]
        public async Task DataAccessException_MapsTo500_AndSurfacesDetailsInDevelopment()
        {
            var (status, message, _) = await InvokeWithException(
                new DataAccessException("detailed dev error"), isDevelopment: true);

            status.Should().Be(500);
            message.Should().Be("detailed dev error");
        }

        [Fact]
        public async Task UnexpectedInvalidOperationException_MapsTo500_NotClientError()
        {
            // F3 regression guard: a generic framework exception must be a server error.
            var (status, _, _) = await InvokeWithException(new InvalidOperationException("something odd"));
            status.Should().Be(500);
        }
    }
}
