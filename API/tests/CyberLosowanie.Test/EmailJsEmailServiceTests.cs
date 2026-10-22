using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Services.Email;
using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using System.Net;
using System.Text.Json;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// The EmailJS request must match the pass-through template (to_email, subject,
    /// html_body) and carry the private key; a rejection must surface as an exception
    /// so the callers' best-effort handling logs it.
    /// </summary>
    public class EmailJsEmailServiceTests
    {
        private static readonly EmailMessage Message =
            new("santa@example.com", "Letter to Santa", "<p>Hi</p>", "Hi");

        private sealed class RecordingHandler(HttpStatusCode status, string responseBody) : HttpMessageHandler
        {
            public HttpRequestMessage? Request { get; private set; }
            public string? Body { get; private set; }

            protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            {
                Request = request;
                Body = await request.Content!.ReadAsStringAsync(cancellationToken);
                return new HttpResponseMessage(status) { Content = new StringContent(responseBody) };
            }
        }

        private static EmailJsEmailService CreateService(RecordingHandler handler) => new(
            new HttpClient(handler) { BaseAddress = new Uri(EmailJsEmailService.BaseAddress) },
            Options.Create(new EmailOptions
            {
                EmailJs = new EmailJsOptions
                {
                    ServiceId = "service_x",
                    TemplateId = "template_y",
                    PublicKey = "public_z",
                    PrivateKey = "private_k"
                }
            }),
            NullLogger<EmailJsEmailService>.Instance);

        [Fact]
        public async Task SendAsync_PostsTemplateParamsAndKeysToSendEndpoint()
        {
            var handler = new RecordingHandler(HttpStatusCode.OK, "OK");

            await CreateService(handler).SendAsync(Message, TestContext.Current.CancellationToken);

            handler.Request!.Method.Should().Be(HttpMethod.Post);
            handler.Request.RequestUri!.ToString().Should().Be("https://api.emailjs.com/api/v1.0/email/send");

            using var json = JsonDocument.Parse(handler.Body!);
            var root = json.RootElement;
            root.GetProperty("service_id").GetString().Should().Be("service_x");
            root.GetProperty("template_id").GetString().Should().Be("template_y");
            root.GetProperty("user_id").GetString().Should().Be("public_z");
            root.GetProperty("accessToken").GetString().Should().Be("private_k");
            var templateParams = root.GetProperty("template_params");
            templateParams.GetProperty("to_email").GetString().Should().Be("santa@example.com");
            templateParams.GetProperty("subject").GetString().Should().Be("Letter to Santa");
            templateParams.GetProperty("html_body").GetString().Should().Be("<p>Hi</p>");
        }

        [Fact]
        public async Task SendAsync_Rejected_ThrowsWithEmailJsMessage()
        {
            var handler = new RecordingHandler(HttpStatusCode.Forbidden, "API calls are disabled for non-browser applications");

            var act = () => CreateService(handler).SendAsync(Message, TestContext.Current.CancellationToken);

            await act.Should().ThrowAsync<InvalidOperationException>()
                .WithMessage("*403*non-browser*");
        }

        [Fact]
        public void EmailJsOptions_IncompleteConfiguration_IsNotUsed()
        {
            new EmailJsOptions { ServiceId = "s", TemplateId = "t", PublicKey = "p" }.IsComplete.Should().BeFalse();
            new EmailJsOptions { ServiceId = "s", TemplateId = "t", PublicKey = "p", PrivateKey = "k" }.IsComplete.Should().BeTrue();
        }
    }
}
