using CyberLosowanie.Services;
using FluentAssertions;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// The secret box order of the draw. What must hold: every layout is a full
    /// permutation (nobody missing, nobody twice), it is stable for one user, it differs
    /// between users and between server secrets, and box numbers carry no information
    /// about the cyberek inside — in particular box k is not cyberek k.
    /// </summary>
    public class GiftBoxLayoutTests
    {
        private const string Secret = "test-secret-for-the-gift-box-layout-0123456789";
        private static readonly int[] Twelve = Enumerable.Range(1, 12).ToArray();

        private static IReadOnlyList<int> Layout(string userId, string secret = Secret) =>
            new GiftBoxLayout(secret).Arrange(userId, Twelve);

        [Fact]
        public void Arrange_ReturnsEveryCyberekExactlyOnce()
        {
            var layout = Layout("user-a");

            layout.Should().HaveCount(12);
            layout.Should().BeEquivalentTo(Twelve);
            layout.Should().OnlyHaveUniqueItems();
        }

        [Fact]
        public void Arrange_IsStableForTheSameUser_AcrossInstancesAndCalls()
        {
            // A refresh, another request or an app restart must not move the boxes.
            var first = Layout("user-a");

            Layout("user-a").Should().Equal(first);
            new GiftBoxLayout(Secret).Arrange("user-a", Twelve).Should().Equal(first);
        }

        [Fact]
        public void Arrange_DoesNotDependOnTheInputOrder()
        {
            var layout = new GiftBoxLayout(Secret);
            var reversed = Twelve.Reverse().ToArray();
            var shuffled = new[] { 7, 2, 11, 5, 1, 12, 9, 3, 8, 10, 4, 6 };

            layout.Arrange("user-a", reversed).Should().Equal(layout.Arrange("user-a", Twelve));
            layout.Arrange("user-a", shuffled).Should().Equal(layout.Arrange("user-a", Twelve));
        }

        [Fact]
        public void Arrange_IgnoresDuplicateIds()
        {
            new GiftBoxLayout(Secret).Arrange("user-a", Twelve.Concat(Twelve))
                .Should().Equal(Layout("user-a"));
        }

        [Fact]
        public void Arrange_GivesDifferentUsersDifferentLayouts()
        {
            // Two people comparing screens cannot map their boxes onto each other.
            var layouts = Enumerable.Range(1, 200)
                .Select(i => string.Join(",", Layout($"user-{i}")))
                .ToList();

            // 12! orders: a repeat among 200 users is practically impossible.
            layouts.Should().OnlyHaveUniqueItems();
        }

        [Fact]
        public void Arrange_ChangesCompletelyWithTheServerSecret()
        {
            // Knowing the algorithm and a user id is not enough without the key.
            Layout("user-a", "another-secret-entirely-different-9876543210")
                .Should().NotEqual(Layout("user-a"));
        }

        [Fact]
        public void Arrange_NeverRevealsTheCyberekByTheBoxNumber()
        {
            // The old leak: box k held cyberek k, the same order as the pick list.
            // Over many users every cyberek must turn up in every box about equally
            // often, and no user may get the id order back.
            const int users = 2400;
            var counts = new int[13, 13]; // [box, cyberek]
            var identityLayouts = 0;
            for (var u = 0; u < users; u++)
            {
                var layout = Layout($"00000000-0000-0000-0000-{u:D12}");
                if (layout.SequenceEqual(Twelve)) identityLayouts++;
                for (var box = 1; box <= 12; box++)
                {
                    counts[box, layout[box - 1]]++;
                }
            }

            identityLayouts.Should().Be(0);
            // Expected 200 per (box, cyberek) pair, sd ≈ 13.5: bounds of ±6 sd. The data
            // is deterministic (fixed secret and ids), so this never flakes.
            for (var box = 1; box <= 12; box++)
            {
                for (var cyberek = 1; cyberek <= 12; cyberek++)
                {
                    counts[box, cyberek].Should().BeInRange(120, 280,
                        $"box {box} should not favour or avoid cyberek {cyberek}");
                }
            }
        }

        [Fact]
        public void Arrange_ByBoxLookupRoundTrips()
        {
            // What the service relies on: box b holds layout[b - 1], and every cyberek
            // is found in exactly one box.
            var layout = Layout("user-a");
            foreach (var cyberek in Twelve)
            {
                var box = layout.ToList().IndexOf(cyberek) + 1;
                box.Should().BeInRange(1, 12);
                layout[box - 1].Should().Be(cyberek);
            }
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        [InlineData(null)]
        public void Constructor_WithoutASecret_Throws(string? secret)
        {
            Assert.ThrowsAny<ArgumentException>(() => new GiftBoxLayout(secret!));
        }

        [Theory]
        [InlineData("")]
        [InlineData(null)]
        public void Arrange_WithoutAUserId_Throws(string? userId)
        {
            Assert.ThrowsAny<ArgumentException>(() => new GiftBoxLayout(Secret).Arrange(userId!, Twelve));
        }
    }
}
