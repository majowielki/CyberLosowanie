namespace CyberLosowanie.Services.Email
{
    /// <summary>
    /// "Email" configuration section. The SMTP password is a secret: User Secrets
    /// locally, Key Vault in production — never appsettings.json.
    /// </summary>
    public class EmailOptions
    {
        public const string SectionName = "Email";

        public string FromAddress { get; set; } = string.Empty;
        public string FromName { get; set; } = "CyberLosowanie";
        public SmtpOptions Smtp { get; set; } = new();

        public bool IsSmtpConfigured => !string.IsNullOrWhiteSpace(Smtp.Host);
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
