using CyberLosowanie.Interfaces.Services;

namespace CyberLosowanie.Services.Email
{
    /// <summary>
    /// Development fallback when no SMTP server is configured: the message (with its
    /// links) goes to the log instead of a mailbox. Never registered in production.
    /// </summary>
    public class LoggingEmailService : IEmailService
    {
        private readonly ILogger<LoggingEmailService> _logger;

        public LoggingEmailService(ILogger<LoggingEmailService> logger)
        {
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            _logger.LogInformation(
                "[DEV EMAIL] To: {To}\nSubject: {Subject}\n\n{Body}",
                message.To, message.Subject, message.TextBody);
            return Task.CompletedTask;
        }
    }
}
