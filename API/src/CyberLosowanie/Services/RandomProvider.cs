using CyberLosowanie.Interfaces.Services;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Production randomness source. Backed by <see cref="Random.Shared"/>, which is
    /// thread-safe, so a single singleton registration is safe (I7).
    /// </summary>
    public class RandomProvider : IRandomProvider
    {
        public int Next() => Random.Shared.Next();

        public int Next(int maxValue) => Random.Shared.Next(maxValue);
    }
}
