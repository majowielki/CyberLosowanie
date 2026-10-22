using CyberLosowanie.Interfaces.Services;
using System.Net;

namespace CyberLosowanie.Services.Email
{
    /// <summary>
    /// Every email the app sends, in both UI languages. Texts are kept here (not in
    /// the frontend i18n catalog) because the recipient is often not the person who
    /// triggered the email — the recipient's own language is used.
    /// Emails never contain wishlist content, only a link into the app.
    /// </summary>
    public static class EmailTemplates
    {
        public static EmailMessage ConfirmEmail(string to, string language, string userName, string link)
        {
            var pl = language == "pl";
            var heading = pl ? $"Cześć {userName}!" : $"Hi {userName}!";
            var body = pl
                ? "Dziękujemy za rejestrację w CyberLosowaniu. Potwierdź swój adres e-mail, aby się zalogować."
                : "Thanks for signing up for CyberLosowanie. Confirm your email address to sign in.";
            var button = pl ? "Potwierdź e-mail" : "Confirm email";
            var footer = pl
                ? "Jeśli to nie Ty zakładałeś konto, zignoruj tę wiadomość."
                : "If you did not create an account, you can ignore this email.";

            return Build(to, pl ? "Potwierdź adres e-mail" : "Confirm your email address",
                heading, [body], button, link, footer);
        }

        /// <summary>The Santa's giftee sent their letter (first time, or Santa drew them after it was sent).</summary>
        public static EmailMessage LetterReceived(string to, string language, string giftedFullName, string link, string? note)
        {
            var pl = language == "pl";
            var heading = pl ? "Masz list do Mikołaja! 🎅" : "You've got a letter to Santa! 🎅";
            var body = pl
                ? $"{giftedFullName} wysyła Ci swoją listę życzeń. Zajrzyj, co chciałby lub chciałaby dostać."
                : $"{giftedFullName} sent you their wishlist. Take a look at what they would like to get.";
            var button = pl ? "Otwórz list" : "Open the letter";

            return Build(to, pl ? $"List do Mikołaja od: {giftedFullName}" : $"Letter to Santa from {giftedFullName}",
                heading, WithNote([body], note, pl), button, link, Footer(pl));
        }

        /// <summary>The giftee changed an already sent letter and asked to let their Santa know.</summary>
        public static EmailMessage LetterUpdated(string to, string language, string giftedFullName, string link, string? note)
        {
            var pl = language == "pl";
            var heading = pl ? "List do Mikołaja się zmienił ✏️" : "The letter to Santa has changed ✏️";
            var body = pl
                ? $"{giftedFullName} wprowadza zmiany w swojej liście życzeń i prosi, żebyś zerknął lub zerknęła na nią jeszcze raz."
                : $"{giftedFullName} updated their wishlist and asks you to have another look.";
            var button = pl ? "Zobacz zmiany" : "See the changes";

            return Build(to, pl ? $"Zmiany w liście od: {giftedFullName}" : $"{giftedFullName} updated their letter",
                heading, WithNote([body], note, pl), button, link, Footer(pl));
        }

        private static string Footer(bool pl) => pl
            ? "Losowanie jest tajne — tę wiadomość dostajesz tylko Ty."
            : "The draw is secret — only you receive this message.";

        private static IReadOnlyList<string> WithNote(IReadOnlyList<string> paragraphs, string? note, bool pl)
        {
            if (string.IsNullOrWhiteSpace(note))
            {
                return paragraphs;
            }
            var quoted = pl ? $"„{note.Trim()}”" : $"“{note.Trim()}”";
            return [.. paragraphs, (pl ? "Dopisek: " : "Note: ") + quoted];
        }

        /// <summary>
        /// Wraps the texts into a minimal table-based HTML layout (inline styles only —
        /// email clients ignore stylesheets) plus the plain-text alternative. All
        /// dynamic values are HTML-encoded here.
        /// </summary>
        private static EmailMessage Build(
            string to, string subject, string heading, IReadOnlyList<string> paragraphs,
            string buttonText, string link, string footer)
        {
            var encodedLink = WebUtility.HtmlEncode(link);
            var paragraphHtml = string.Concat(paragraphs.Select(p =>
                $"<p style=\"margin:0 0 16px;font-size:16px;line-height:1.5;color:#1f2937\">{WebUtility.HtmlEncode(p)}</p>"));

            var html = $"""
                <!doctype html>
                <html>
                <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Segoe UI,Arial,sans-serif">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    <tr><td align="center">
                      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px" cellspacing="0" cellpadding="0">
                        <tr><td>
                          <h1 style="margin:0 0 20px;font-size:24px;color:#b91c1c">{WebUtility.HtmlEncode(heading)}</h1>
                          {paragraphHtml}
                          <p style="margin:24px 0">
                            <a href="{encodedLink}" style="display:inline-block;background:#b91c1c;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px">{WebUtility.HtmlEncode(buttonText)}</a>
                          </p>
                          <p style="margin:0 0 8px;font-size:13px;color:#6b7280;word-break:break-all">{encodedLink}</p>
                          <p style="margin:16px 0 0;font-size:13px;color:#6b7280">{WebUtility.HtmlEncode(footer)}</p>
                        </td></tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """;

            var text = $"{heading}\n\n{string.Join("\n\n", paragraphs)}\n\n{buttonText}: {link}\n\n{footer}";

            return new EmailMessage(to, subject, html, text);
        }
    }
}
