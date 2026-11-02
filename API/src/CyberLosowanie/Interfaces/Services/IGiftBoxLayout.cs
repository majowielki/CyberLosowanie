namespace CyberLosowanie.Interfaces.Services
{
    /// <summary>
    /// Which cyberek hides in which box of the draw. Boxes are numbered 1..N and the
    /// order is a secret permutation per user: the box number tells nothing about the
    /// cyberek inside (unlike the earlier "box k = cyberek k"), it never matches the
    /// order of the pick list, and two users comparing their screens cannot map boxes
    /// to each other. The same user always gets the same layout, so a page refresh
    /// keeps every box in place.
    /// </summary>
    public interface IGiftBoxLayout
    {
        /// <summary>
        /// Cyberek ids in box order for <paramref name="userId"/>: element 0 is in box 1.
        /// </summary>
        IReadOnlyList<int> Arrange(string userId, IEnumerable<int> cyberekIds);
    }
}
