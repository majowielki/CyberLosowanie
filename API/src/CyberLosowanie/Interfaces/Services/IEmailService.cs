namespace CyberLosowanie.Interfaces.Services
{
    /// <summary>
    /// Sends one email. Implementations: SMTP (any provider — Azure Communication
    /// Services, Brevo, …) or, in local development without SMTP configured, a
    /// sender that only writes the message to the log.
    /// </summary>
    public interface IEmailService
    {
        Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default);
    }

    /// <summary>A ready-to-send email: both an HTML and a plain-text body.</summary>
    public record EmailMessage(string To, string Subject, string HtmlBody, string TextBody);
}
