namespace CyberLosowanie.Interfaces.Services
{
    /// <summary>
    /// Emails a participant's Santa about their letter. Both methods are best-effort
    /// and never throw: the action that triggered them (sending the letter, the draw
    /// commit) has already succeeded and must not fail because of email delivery.
    /// </summary>
    public interface ISantaNotificationService
    {
        /// <summary>
        /// The owner of <paramref name="cyberekId"/> sent (or updated) their letter.
        /// No-op when nobody has drawn them yet — the Santa is told at draw time instead.
        /// </summary>
        Task NotifyLetterSentAsync(int cyberekId, bool isUpdate, string? note);

        /// <summary>
        /// <paramref name="santaUserId"/> has just drawn <paramref name="giftedCyberekId"/>;
        /// if that person's letter is already sent, the Santa gets it right away.
        /// </summary>
        Task NotifyAfterDrawAsync(string santaUserId, int giftedCyberekId);
    }
}
