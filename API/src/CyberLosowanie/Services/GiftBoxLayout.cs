using CyberLosowanie.Interfaces.Services;
using System.Security.Cryptography;
using System.Text;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Keyed shuffle: every cyberek gets the sort key HMAC(key, userId/cyberekId) and
    /// the boxes follow that order. Without the key the order looks random and cannot
    /// be predicted; with it, it is reproducible — no per-user state to store.
    /// The key is derived from the server secret with a purpose label, so it is never
    /// the JWT signing key itself.
    /// </summary>
    public class GiftBoxLayout : IGiftBoxLayout
    {
        private const string KeyPurpose = "CyberLosowanie.GiftBoxLayout.v1";

        private readonly byte[] _key;

        public GiftBoxLayout(string serverSecret)
        {
            if (string.IsNullOrWhiteSpace(serverSecret))
                throw new ArgumentException("A server secret is required.", nameof(serverSecret));

            _key = HMACSHA256.HashData(Encoding.UTF8.GetBytes(serverSecret), Encoding.UTF8.GetBytes(KeyPurpose));
        }

        public IReadOnlyList<int> Arrange(string userId, IEnumerable<int> cyberekIds)
        {
            ArgumentException.ThrowIfNullOrWhiteSpace(userId);
            ArgumentNullException.ThrowIfNull(cyberekIds);

            return cyberekIds
                .Distinct()
                .OrderBy(id => SortKey(userId, id), StringComparer.Ordinal)
                .ToList();
        }

        private string SortKey(string userId, int cyberekId) =>
            Convert.ToHexString(HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes($"{userId}/{cyberekId}")));
    }
}
