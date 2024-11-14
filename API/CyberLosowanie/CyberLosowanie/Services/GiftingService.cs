using CyberLosowanie.Models;
using System.Net;

namespace CyberLosowanie.Services
{
    public class GiftingService : IGiftingService
    {
        private static readonly Random random = new Random();

        public List<int> GetAvailableToBeGiftedCyberki(List<Cyberek> cyberki, List<int> bannedCyberki)
        {
            List<int> toBeGiftedCyberki = cyberki.AsEnumerable().Select(r => r.Id).ToList();
            foreach (var cyber in cyberki)
            {
                if (cyber.GiftedCyberekId != 0)
                {
                    toBeGiftedCyberki.Remove(cyber.GiftedCyberekId);
                }
            }

            foreach (var bannedCyberek in bannedCyberki)
            {
                if (toBeGiftedCyberki.Contains(bannedCyberek))
                {
                    toBeGiftedCyberki.Remove(bannedCyberek);
                }
            }

            return toBeGiftedCyberki;
        }

        public int GetAvailableToBeGiftedCyberek(List<Cyberek> cyberki, Cyberek cyberek, int toBeGiftedCyberkId)
        {
            var availableToBeGiftedCyberki = GetAvailableToBeGiftedCyberki(cyberki, new List<int>(toBeGiftedCyberkId));
            var availableToBeGiftedCyberkiCopy = availableToBeGiftedCyberki;
            availableToBeGiftedCyberkiCopy.Add(toBeGiftedCyberkId);
            try
            {
                foreach (var cyber in cyberki.Where(c => c.GiftedCyberekId == 0 && c.Id != cyberek.Id))
                {
                    var pickedCyberek = availableToBeGiftedCyberki.Where(c => !cyber.BannedCyberki.Contains(c)).First();
                    availableToBeGiftedCyberki.Remove(pickedCyberek);
                }
                return toBeGiftedCyberkId;
            }
            catch
            {

                foreach (var cyber in cyberki.Where(c => c.GiftedCyberekId == 0 && c.Id != cyberek.Id))
                {
                    var pickedCyberek = availableToBeGiftedCyberkiCopy.Where(c => !cyber.BannedCyberki.Contains(c)).First();
                    availableToBeGiftedCyberkiCopy.Remove(pickedCyberek);
                }
                return availableToBeGiftedCyberki[random.Next(availableToBeGiftedCyberki.Count)];
            }
        }
    }
}
