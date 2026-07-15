using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;

namespace CyberLosowanie.Services
{
    /// <summary>
    /// Matching-based implementation of the draw rules. The feasibility question
    /// ("can everyone still complete the draw?") is answered with a maximum bipartite
    /// matching (Kuhn's augmenting paths, O(V·E), deterministic) instead of the previous
    /// exponential backtracking. Givers are cyberki with GiftedCyberekId == 0; targets
    /// are cyberki nobody gifts yet; an edge exists when target != giver and the target
    /// is not on the giver's ban list.
    /// </summary>
    public class GiftingService : IGiftingService
    {
        public bool HasCompleteAssignment(IReadOnlyList<Cyberek> cyberki)
        {
            ArgumentNullException.ThrowIfNull(cyberki);

            return RemainderHasCompleteAssignment(cyberki, pickedGiverId: null, pickedTargetId: null);
        }

        public List<int> GetSafeTargets(IReadOnlyList<Cyberek> cyberki, Cyberek giver)
        {
            ArgumentNullException.ThrowIfNull(cyberki);
            ArgumentNullException.ThrowIfNull(giver);

            if (giver.GiftedCyberekId != 0)
            {
                return new List<int>(); // already drew — no further choices
            }

            var takenTargets = GetTakenTargets(cyberki);

            return cyberki
                .Select(c => c.Id)
                .Where(id => IsEdgeAllowed(giver, id) && !takenTargets.Contains(id))
                .Where(id => RemainderHasCompleteAssignment(cyberki, giver.Id, id))
                .ToList();
        }

        public bool IsChoiceSafe(IReadOnlyList<Cyberek> cyberki, Cyberek giver, int targetId)
        {
            ArgumentNullException.ThrowIfNull(cyberki);
            ArgumentNullException.ThrowIfNull(giver);

            if (giver.GiftedCyberekId != 0) return false;
            if (!IsEdgeAllowed(giver, targetId)) return false;
            if (cyberki.All(c => c.Id != targetId)) return false;
            if (GetTakenTargets(cyberki).Contains(targetId)) return false;

            return RemainderHasCompleteAssignment(cyberki, giver.Id, targetId);
        }

        private static bool IsEdgeAllowed(Cyberek giver, int targetId)
        {
            return targetId != giver.Id
                   && giver.BannedCyberki?.Contains(targetId) != true;
        }

        private static HashSet<int> GetTakenTargets(IReadOnlyList<Cyberek> cyberki)
        {
            return cyberki
                .Where(c => c.GiftedCyberekId != 0)
                .Select(c => c.GiftedCyberekId)
                .ToHashSet();
        }

        /// <summary>
        /// Does a perfect matching exist for all still-unassigned givers, optionally
        /// treating (pickedGiverId → pickedTargetId) as already committed?
        /// </summary>
        private static bool RemainderHasCompleteAssignment(
            IReadOnlyList<Cyberek> cyberki, int? pickedGiverId, int? pickedTargetId)
        {
            var givers = cyberki
                .Where(c => c.GiftedCyberekId == 0 && c.Id != pickedGiverId)
                .ToList();
            if (givers.Count == 0)
            {
                return true;
            }

            var takenTargets = GetTakenTargets(cyberki);
            if (pickedTargetId.HasValue)
            {
                takenTargets.Add(pickedTargetId.Value);
            }

            var freeTargets = cyberki
                .Select(c => c.Id)
                .Where(id => !takenTargets.Contains(id))
                .ToList();
            if (freeTargets.Count < givers.Count)
            {
                return false;
            }

            var targetIndexById = new Dictionary<int, int>(freeTargets.Count);
            for (var i = 0; i < freeTargets.Count; i++)
            {
                targetIndexById[freeTargets[i]] = i;
            }

            var adjacency = new List<int>[givers.Count];
            for (var g = 0; g < givers.Count; g++)
            {
                adjacency[g] = new List<int>();
                foreach (var targetId in freeTargets)
                {
                    if (IsEdgeAllowed(givers[g], targetId))
                    {
                        adjacency[g].Add(targetIndexById[targetId]);
                    }
                }

                if (adjacency[g].Count == 0)
                {
                    return false; // someone already has no candidate at all
                }
            }

            // Kuhn's maximum matching: every giver must admit an augmenting path.
            var giverMatchedToTarget = new int[freeTargets.Count];
            Array.Fill(giverMatchedToTarget, -1);
            for (var g = 0; g < givers.Count; g++)
            {
                var visitedTargets = new bool[freeTargets.Count];
                if (!TryAugment(g, adjacency, visitedTargets, giverMatchedToTarget))
                {
                    return false;
                }
            }

            return true;
        }

        private static bool TryAugment(
            int giver, List<int>[] adjacency, bool[] visitedTargets, int[] giverMatchedToTarget)
        {
            foreach (var target in adjacency[giver])
            {
                if (visitedTargets[target])
                {
                    continue;
                }
                visitedTargets[target] = true;

                if (giverMatchedToTarget[target] == -1
                    || TryAugment(giverMatchedToTarget[target], adjacency, visitedTargets, giverMatchedToTarget))
                {
                    giverMatchedToTarget[target] = giver;
                    return true;
                }
            }

            return false;
        }
    }
}
