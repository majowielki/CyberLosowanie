using CyberLosowanie.Interfaces.Services;
using Microsoft.Extensions.Options;
using System.Text.Json.Serialization;

namespace CyberLosowanie.Services.Email
{
    /// <summary>
    /// Sends through the EmailJS REST API (server side, authorized with the private
    /// key — the account must allow API calls from non-browser applications).
    /// EmailJS delivers only the HTML body; the plain-text alternative is dropped.
    /// </summary>
    public class EmailJsEmailService : IEmailService
    {
        public const string BaseAddress = "https://api.emailjs.com/";
        private const string SendPath = "api/v1.0/email/send";

        private readonly HttpClient _httpClient;
        private readonly EmailJsOptions _options;
        private readonly ILogger<EmailJsEmailService> _logger;

        public EmailJsEmailService(HttpClient httpClient, IOptions<EmailOptions> options, ILogger<EmailJsEmailService> logger)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _options = options?.Value?.EmailJs ?? throw new ArgumentNullException(nameof(options));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            var request = new SendRequest(
                _options.ServiceId,
                _options.TemplateId,
                _options.PublicKey,
                _options.PrivateKey,
                new TemplateParams(message.To, message.Subject, message.HtmlBody));

            using var response = await _httpClient.PostAsJsonAsync(SendPath, request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                // EmailJS answers errors in plain text ("The Public Key is invalid", …).
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new InvalidOperationException(
                    $"EmailJS rejected the email ({(int)response.StatusCode}): {error}");
            }

            _logger.LogInformation("Email '{Subject}' sent via EmailJS", message.Subject);
        }

        private record SendRequest(
            [property: JsonPropertyName("service_id")] string ServiceId,
            [property: JsonPropertyName("template_id")] string TemplateId,
            [property: JsonPropertyName("user_id")] string PublicKey,
            [property: JsonPropertyName("accessToken")] string PrivateKey,
            [property: JsonPropertyName("template_params")] TemplateParams TemplateParams);

        // Names match the placeholders of the pass-through template.
        private record TemplateParams(
            [property: JsonPropertyName("to_email")] string ToEmail,
            [property: JsonPropertyName("subject")] string Subject,
            [property: JsonPropertyName("html_body")] string HtmlBody);
    }
}
