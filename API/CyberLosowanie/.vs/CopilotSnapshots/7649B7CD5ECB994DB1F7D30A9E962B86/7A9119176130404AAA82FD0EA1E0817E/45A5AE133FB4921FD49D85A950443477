using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Exceptions;

namespace CyberLosowanie.Services
{
    public class GiftingService : IGiftingService
    {
        private readonly Random _random;

        public GiftingService()
        {
            _random = new Random();
        }

        public List<int> GetAvailableToBeGiftedCyberki(List<Cyberek> cyberki, List<int> bannedCyberki)
        {
            if (cyberki == null)
                return new List<int>();

            var availableTargets = cyberki.Select(c => c.Id).ToHashSet();

            // Remove targets already taken (those already gifted by someone)
            foreach (var cyberek in cyberki.Where(c => c.GiftedCyberekId != 0))
            {
                availableTargets.Remove(cyberek.GiftedCyberekId);
            }

            // Remove banned
            if (bannedCyberki != null)
            {
                foreach (var bannedId in bannedCyberki)
                {
                    availableTargets.Remove(bannedId);
                }
            }

            return availableTargets.ToList();
        }

        public int GetAvailableToBeGiftedCyberek(List<Cyberek> cyberki, Cyberek cyberek, int toBeGiftedCyberkId)
        {
            if (cyberki == null || !cyberki.Any())
                throw new ArgumentException("Cyberki list cannot be null or empty", nameof(cyberki));
            if (cyberek == null)
                throw new ArgumentNullException(nameof(cyberek));

            // Compute currently used targets from existing assignments
            var currentlyUsedTargets = cyberki
                .Where(c => c.GiftedCyberekId != 0)
                .Select(c => c.GiftedCyberekId)
                .ToHashSet();

            // Build candidate targets for the gift giver (exclude self, banned and already used targets)
            var candidateTargets = cyberki
                .Where(c => c.Id != cyberek.Id)
                .Where(c => cyberek.BannedCyberki?.Contains(c.Id) != true)
                .Where(c => !currentlyUsedTargets.Contains(c.Id))
                .Select(c => c.Id)
                .ToList();

            // If caller provided a preferred target, try it first if still in candidates
            if (candidateTargets.Contains(toBeGiftedCyberkId))
            {
                if (IsAssignmentGloballyValid(cyberek, toBeGiftedCyberkId, cyberki))
                {
                    return toBeGiftedCyberkId;
                }
            }

            // Deterministic backtracking over candidates (shuffle for fairness)
            var shuffledCandidates = candidateTargets.OrderBy(_ => _random.Next()).ToList();
            foreach (var candidate in shuffledCandidates)
            {
                if (IsAssignmentGloballyValid(cyberek, candidate, cyberki))
                {
                    return candidate;
                }
            }

            throw new InvalidGiftAssignmentException(cyberek.Id, toBeGiftedCyberkId,
                $"No valid gift targets available for cyberek {cyberek.Id}. Backtracking exhausted all {shuffledCandidates.Count} candidates.");
        }

        /// <summary>
        /// Validates that choosing targetId for giftGiver still allows a complete assignment for all remaining unassigned cyberki.
        /// Also ensures the chosen target isn't already taken in existing assignments.
        /// </summary>
        private bool IsAssignmentGloballyValid(Cyberek giftGiver, int targetId, List<Cyberek> allCyberki)
        {
            // Basic checks
            if (targetId == giftGiver.Id) return false; // cannot gift to self
            if (giftGiver.BannedCyberki?.Contains(targetId) == true) return false;
            if (!allCyberki.Any(c => c.Id == targetId)) return false;

            // Prevent using a target already taken in existing assignments
            var existingUsed = allCyberki
                .Where(c => c.GiftedCyberekId != 0 && c.Id != giftGiver.Id)
                .Select(c => c.GiftedCyberekId)
                .ToHashSet();
            if (existingUsed.Contains(targetId))
                return false;

            // Build current assignments map (gift giver proposed target overrides any existing value)
            var currentAssignments = new Dictionary<int, int>();
            foreach (var c in allCyberki.Where(c => c.GiftedCyberekId != 0 && c.Id != giftGiver.Id))
            {
                currentAssignments[c.Id] = c.GiftedCyberekId;
            }
            currentAssignments[giftGiver.Id] = targetId;

            var usedTargets = currentAssignments.Values.ToHashSet();

            // Remaining givers needing assignment
            var remaining = allCyberki
                .Where(c => c.GiftedCyberekId == 0 && c.Id != giftGiver.Id)
                .ToList();

            return BacktrackRemaining(allCyberki, remaining, currentAssignments, usedTargets);
        }

        private bool BacktrackRemaining(List<Cyberek> allCyberki, List<Cyberek> remaining, Dictionary<int, int> assignments, HashSet<int> usedTargets)
        {
            if (!remaining.Any())
                return true; // all assigned successfully

            // Heuristic: choose cyberek with fewest available targets to reduce branching
            var next = remaining
                .Select(c => new { Cyberek = c, Targets = GetValidTargetsForCyberek(allCyberki, c, usedTargets) })
                .OrderBy(x => x.Targets.Count)
                .First();

            if (!next.Targets.Any())
                return false; // dead end

            // Prepare remaining list for recursion
            var newRemaining = remaining.Where(r => r.Id != next.Cyberek.Id).ToList();

            foreach (var t in next.Targets)
            {
                assignments[next.Cyberek.Id] = t;
                usedTargets.Add(t);

                if (BacktrackRemaining(allCyberki, newRemaining, assignments, usedTargets))
                    return true;

                // backtrack
                usedTargets.Remove(t);
                assignments.Remove(next.Cyberek.Id);
            }

            return false;
        }

        private List<int> GetValidTargetsForCyberek(List<Cyberek> cyberki, Cyberek cyberek, HashSet<int> usedTargets)
        {
            return cyberki
                .Where(c => c.Id != cyberek.Id)
                .Where(c => cyberek.BannedCyberki?.Contains(c.Id) != true)
                .Where(c => !usedTargets.Contains(c.Id))
                .Select(c => c.Id)
                .ToList();
        }
    }
}
