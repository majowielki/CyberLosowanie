using CyberLosowanie.Interfaces.Services;

namespace CyberLosowanie.Test.TestSupport
{
    /// <summary>
    /// Deterministic <see cref="IRandomProvider"/> backed by a seeded <see cref="Random"/>.
    /// Lets the gifting algorithm produce a reproducible sequence under test (I7).
    /// </summary>
    public class SeededRandomProvider : IRandomProvider
    {
        private readonly Random _random;

        public SeededRandomProvider(int seed) => _random = new Random(seed);

        public int Next() => _random.Next();

        public int Next(int maxValue) => _random.Next(maxValue);
    }
}
