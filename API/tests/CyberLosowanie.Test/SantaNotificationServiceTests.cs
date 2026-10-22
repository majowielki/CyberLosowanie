using CyberLosowanie.Interfaces.Repositories;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Services;
using CyberLosowanie.Services.Email;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Who gets the "letter to Santa" email and when — and that delivery problems
    /// never surface to the caller (the triggering action already succeeded).
    /// </summary>
    public class SantaNotificationServiceTests
    {
        private const int GiftedCyberekId = 7;

        private readonly Mock<IApplicationUserRepository> _userRepo = new();
        private readonly Mock<ICyberekRepository> _cyberekRepo = new();
        private readonly Mock<IWishlistRepository> _wishlistRepo = new();
        private readonly Mock<IEmailService> _email = new();
        private readonly List<EmailMessage> _sent = [];

        private static readonly ApplicationUser Santa = new()
        {
            Id = "santa",
            Email = "santa@example.com",
            EmailConfirmed = true,
            PreferredLanguage = "pl",
            GiftedCyberekId = GiftedCyberekId
        };

        public SantaNotificationServiceTests()
        {
            _cyberekRepo.Setup(r => r.GetByIdAsync(GiftedCyberekId))
                .ReturnsAsync(new Cyberek { Id = GiftedCyberekId, Name = "Ola", Surname = "Nowak" });
            _email.Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
                .Callback<EmailMessage, CancellationToken>((m, _) => _sent.Add(m))
                .Returns(Task.CompletedTask);
        }

        private SantaNotificationService CreateService() => new(
            _userRepo.Object,
            _cyberekRepo.Object,
            _wishlistRepo.Object,
            _email.Object,
            new AppLinks("https://app.test/"),
            NullLogger<SantaNotificationService>.Instance);

        [Fact]
        public async Task NotifyLetterSentAsync_NobodyDrewThemYet_SendsNothing()
        {
            _userRepo.Setup(r => r.GetSantaOfCyberekAsync(GiftedCyberekId)).ReturnsAsync((ApplicationUser?)null);

            await CreateService().NotifyLetterSentAsync(GiftedCyberekId, isUpdate: false, note: null);

            _sent.Should().BeEmpty();
        }

        [Fact]
        public async Task NotifyLetterSentAsync_FirstSend_EmailsSantaWithLinkAndName()
        {
            _userRepo.Setup(r => r.GetSantaOfCyberekAsync(GiftedCyberekId)).ReturnsAsync(Santa);

            await CreateService().NotifyLetterSentAsync(GiftedCyberekId, isUpdate: false, note: null);

            _sent.Should().ContainSingle();
            _sent[0].To.Should().Be("santa@example.com");
            _sent[0].Subject.Should().Contain("Ola Nowak");
            _sent[0].TextBody.Should().Contain("https://app.test/wishlist/gifted");
        }

        [Fact]
        public async Task NotifyLetterSentAsync_Update_UsesUpdateTemplateAndQuotesNote()
        {
            _userRepo.Setup(r => r.GetSantaOfCyberekAsync(GiftedCyberekId)).ReturnsAsync(Santa);

            await CreateService().NotifyLetterSentAsync(GiftedCyberekId, isUpdate: true, note: "Dopisałam rower");

            _sent.Should().ContainSingle();
            _sent[0].Subject.Should().StartWith("Zmiany w liście");
            _sent[0].TextBody.Should().Contain("Dopisałam rower");
        }

        [Fact]
        public async Task NotifyLetterSentAsync_SantaEmailNotConfirmed_SendsNothing()
        {
            _userRepo.Setup(r => r.GetSantaOfCyberekAsync(GiftedCyberekId))
                .ReturnsAsync(new ApplicationUser { Id = "s", Email = "s@example.com", EmailConfirmed = false });

            await CreateService().NotifyLetterSentAsync(GiftedCyberekId, isUpdate: false, note: null);

            _sent.Should().BeEmpty();
        }

        [Fact]
        public async Task NotifyLetterSentAsync_DeliveryFails_DoesNotThrow()
        {
            _userRepo.Setup(r => r.GetSantaOfCyberekAsync(GiftedCyberekId)).ReturnsAsync(Santa);
            _email.Setup(e => e.SendAsync(It.IsAny<EmailMessage>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new InvalidOperationException("SMTP down"));

            var act = () => CreateService().NotifyLetterSentAsync(GiftedCyberekId, isUpdate: false, note: null);

            await act.Should().NotThrowAsync();
        }

        [Fact]
        public async Task NotifyAfterDrawAsync_LetterAlreadySent_EmailsTheNewSanta()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(GiftedCyberekId))
                .ReturnsAsync(new Wishlist { CyberekId = GiftedCyberekId, SentAtUtc = DateTime.UtcNow });
            _userRepo.Setup(r => r.GetByIdAsync("santa")).ReturnsAsync(Santa);

            await CreateService().NotifyAfterDrawAsync("santa", GiftedCyberekId);

            _sent.Should().ContainSingle(m => m.To == "santa@example.com");
        }

        [Fact]
        public async Task NotifyAfterDrawAsync_OnlyDraft_SendsNothing()
        {
            _wishlistRepo.Setup(r => r.GetByCyberekIdAsync(GiftedCyberekId))
                .ReturnsAsync(new Wishlist { CyberekId = GiftedCyberekId });

            await CreateService().NotifyAfterDrawAsync("santa", GiftedCyberekId);

            _sent.Should().BeEmpty();
        }

        [Fact]
        public void EmailTemplates_EncodeUserContentInHtml()
        {
            var message = EmailTemplates.LetterUpdated(
                "santa@example.com", "en", "<b>Ola</b>", "https://app.test/x?a=1&b=2", "<script>alert(1)</script>");

            message.HtmlBody.Should().NotContain("<script>");
            message.HtmlBody.Should().Contain("&lt;script&gt;");
            message.HtmlBody.Should().NotContain("<b>Ola</b>");
            message.HtmlBody.Should().Contain("a=1&amp;b=2");
        }
    }
}
