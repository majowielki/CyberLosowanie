﻿using CyberLosowanie.Models;
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
            var availableToBeGiftedCyberki = GetAvailableToBeGiftedCyberki(cyberki, new List<int>());
            var availableToBeGiftedCyberkiCopy = new List<int>();
            availableToBeGiftedCyberkiCopy.AddRange(availableToBeGiftedCyberki);
            if (!availableToBeGiftedCyberki.Contains(toBeGiftedCyberkId))
            {
                foreach (var cyberUser in cyberki.Where(c => c.GiftedCyberekId == 0 && c.Id != cyberek.Id))
                {
                    var pickedCyberekId = availableToBeGiftedCyberki.Where(c => !cyberUser.BannedCyberki.Contains(c)).FirstOrDefault();
                    if (pickedCyberekId == 0)
                    {
                        throw new Exception("Fatal Error");
                    }
                    availableToBeGiftedCyberki.Remove(pickedCyberekId);
                }
                var result = availableToBeGiftedCyberki.Where(c => !cyberek.BannedCyberki.Contains(c)).ElementAt(random.Next(availableToBeGiftedCyberki.Count));
                return result;
            }
            else
            {
                availableToBeGiftedCyberki.Remove(toBeGiftedCyberkId);
            }
            foreach (var cyber in cyberki.Where(c => c.GiftedCyberekId == 0 && c.Id != cyberek.Id))
            {
                var pickedCyberek = availableToBeGiftedCyberki.Where(c => !cyber.BannedCyberki.Contains(c)).FirstOrDefault();
                if (pickedCyberek == 0)
                {
                    foreach (var cyberUser in cyberki.Where(c => c.GiftedCyberekId == 0 && c.Id != cyberek.Id))
                    {
                        var pickedCyberekId = availableToBeGiftedCyberkiCopy.Where(c => !cyberUser.BannedCyberki.Contains(c)).FirstOrDefault();
                        if (pickedCyberekId == 0)
                        {
                            throw new Exception("Fatal Error");
                        }
                        availableToBeGiftedCyberkiCopy.Remove(pickedCyberekId);
                    }
                    var result = availableToBeGiftedCyberkiCopy.Where(c => !cyberek.BannedCyberki.Contains(c)).ElementAt(random.Next(availableToBeGiftedCyberkiCopy.Count));
                    if (result == 0)
                    {
                        throw new Exception("Fatal Error");
                    }
                    return result;
                }
                else
                {
                    availableToBeGiftedCyberki.Remove(pickedCyberek);
                }
            }
            return toBeGiftedCyberkId;
        }
    }
}
