using Microsoft.AspNetCore.WebUtilities;

namespace CyberLosowanie.Services.Email
{
    /// <summary>
    /// Absolute links into the frontend for emails. The base URL comes from
    /// "App:PublicBaseUrl" (the SPA origin — in development the Vite server,
    /// in production the App Service host that serves wwwroot).
    /// </summary>
    public class AppLinks
    {
        public const string ConfigurationKey = "App:PublicBaseUrl";

        private readonly string _baseUrl;

        public AppLinks(string baseUrl)
        {
            if (string.IsNullOrWhiteSpace(baseUrl))
                throw new ArgumentException("Public base URL must be set.", nameof(baseUrl));
            _baseUrl = baseUrl.TrimEnd('/');
        }

        public string Build(string path, IDictionary<string, string?>? query = null)
        {
            var url = $"{_baseUrl}/{path.TrimStart('/')}";
            return query == null ? url : QueryHelpers.AddQueryString(url, query);
        }
    }
}
