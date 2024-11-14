using CyberLosowanie.Models;

namespace CyberLosowanie.Services
{
    public interface IGiftingService
    {
        List<int> GetAvailableToBeGiftedCyberki(List<Cyberek> cyberki, List<int> bannedCyberki);
        int GetAvailableToBeGiftedCyberek(List<Cyberek> cyberki, Cyberek cyberek, int toBeGiftedCyberkId);
    }
}
