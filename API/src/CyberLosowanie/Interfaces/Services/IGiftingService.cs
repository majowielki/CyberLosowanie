using CyberLosowanie.Models;

namespace CyberLosowanie.Interfaces.Services
{
    /// <summary>
    /// Pure draw logic for the gift assignment. Generic over the number of participants
    /// and their ban lists — no seed constants leak in here. The invariant the service
    /// protects: after every committed choice, everyone who has not drawn yet can still
    /// be completed (a perfect matching exists on the remaining bipartite graph).
    /// </summary>
    public interface IGiftingService
    {
        /// <summary>
        /// True when every giver without an assignment can still be matched to a distinct
        /// free target under the rules (no self, no banned, target not taken).
        /// This is the Hall's-condition check ("nobody will ever be left without a choice"),
        /// which is strictly stronger than "everyone has at least one candidate".
        /// </summary>
        bool HasCompleteAssignment(IReadOnlyList<Cyberek> cyberki);

        /// <summary>
        /// Targets the giver may choose NOW without ever stranding another participant:
        /// free, not self, not banned, and committing the choice keeps a complete
        /// assignment reachable for everyone else. While the draw state is feasible and
        /// the giver has not drawn yet, this list is guaranteed to be non-empty.
        /// Returns an empty list for a giver who already drew.
        /// </summary>
        List<int> GetSafeTargets(IReadOnlyList<Cyberek> cyberki, Cyberek giver);

        /// <summary>
        /// Validates a single chosen target under exactly the same rules as
        /// <see cref="GetSafeTargets"/>. Used at commit time to re-check the user's
        /// choice against the current (possibly changed) state.
        /// </summary>
        bool IsChoiceSafe(IReadOnlyList<Cyberek> cyberki, Cyberek giver, int targetId);
    }
}
