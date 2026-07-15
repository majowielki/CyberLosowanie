namespace CyberLosowanie.Interfaces.Services
{
    /// <summary>
    /// Abstraction over a randomness source so the gifting algorithm is deterministic
    /// under test (seeded provider) while using a real random sequence in production (I7).
    /// </summary>
    public interface IRandomProvider
    {
        int Next();
        int Next(int maxValue);
    }
}
