namespace CyberLosowanie.Services.Email
{
    /// <summary>
    /// "Email" configuration section. The SMTP password and the EmailJS private key
    /// are secrets: User Secrets locally, Key Vault in production — never
    /// appsettings.json.
    /// </summary>
    public class EmailOptions
    {
        public const string SectionName = "Email";

        public string FromAddress { get; set; } = string.Empty;
        public string FromName { get; set; } = "CyberLosowanie";
        public SmtpOptions Smtp { get; set; } = new();
        public EmailJsOptions EmailJs { get; set; } = new();

        public bool IsSmtpConfigured => !string.IsNullOrWhiteSpace(Smtp.Host);
        public bool IsEmailJsConfigured => EmailJs.IsComplete;
    }

    /// <summary>
    /// EmailJS REST API. The template is a pass-through — To = {{to_email}},
    /// Subject = {{subject}}, Content = {{{html_body}}} — so the emails themselves
    /// stay in <see cref="EmailTemplates"/>; sender name and address come from the
    /// template and the EmailJS service, not from <see cref="EmailOptions.FromAddress"/>.
    /// </summary>
    public class EmailJsOptions
    {
        public string ServiceId { get; set; } = string.Empty;
        public string TemplateId { get; set; } = string.Empty;
        public string PublicKey { get; set; } = string.Empty;
        /// <summary>Required: authorizes server-side calls ("accessToken" in the API).</summary>
        public string PrivateKey { get; set; } = string.Empty;

        public bool IsComplete =>
            !string.IsNullOrWhiteSpace(ServiceId) && !string.IsNullOrWhiteSpace(TemplateId)
            && !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey);
    }

    public class SmtpOptions
    {
        public string Host { get; set; } = string.Empty;
        public int Port { get; set; } = 587;
        public string UserName { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        /// <summary>False only for a local catch-all server (e.g. smtp4dev) without TLS.</summary>
        public bool UseTls { get; set; } = true;
    }
}
