using CyberLosowanie.Models;
using CyberLosowanie.Repositories;
using CyberLosowanie.Services;
using CyberLosowanie.Test.TestSupport;
using FluentAssertions;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Tests for the matching-based draw logic. The product guarantee under test:
    /// every box offered to a user keeps the draw completable for all remaining
    /// participants — nobody is ever stranded without a valid choice, regardless
    /// of group size, ban lists or the order in which people draw.
    /// </summary>
    public class GiftingServiceTests
    {
        private readonly GiftingService _service = new();

        private static Cyberek C(int id, int gifted = 0, params int[] banned) => new()
        {
            Id = id,
            Name = $"Name{id}",
            Surname = $"Surname{id}",
            ImageUrl = $"https://example.com/{id}.jpg",
            GiftedCyberekId = gifted,
            BannedCyberki = banned.ToList()
        };

        private static List<Cyberek> Group(int n) => Enumerable.Range(1, n).Select(i => C(i)).ToList();

        #region HasCompleteAssignment

        [Fact]
        public void HasCompleteAssignment_NullList_ThrowsArgumentNullException()
        {
            Assert.Throws<ArgumentNullException>(() => _service.HasCompleteAssignment(null!));
        }

        [Fact]
        public void HasCompleteAssignment_EmptyGroup_IsTrue()
        {
            _service.HasCompleteAssignment(new List<Cyberek>()).Should().BeTrue();
        }

        [Fact]
        public void HasCompleteAssignment_SinglePerson_IsFalse()
        {
            // The only candidate is themselves — no valid draw exists.
            _service.HasCompleteAssignment(Group(1)).Should().BeFalse();
        }

        [Fact]
        public void HasCompleteAssignment_TwoPeopleNoBans_IsTrue()
        {
            _service.HasCompleteAssignment(Group(2)).Should().BeTrue();
        }

        [Fact]
        public void HasCompleteAssignment_FullyAssignedGroup_IsTrue()
        {
            var cyberki = new List<Cyberek> { C(1, gifted: 2), C(2, gifted: 3), C(3, gifted: 1) };

            _service.HasCompleteAssignment(cyberki).Should().BeTrue();
        }

        [Fact]
        public void HasCompleteAssignment_GiverWithNoCandidateAtAll_IsFalse()
        {
            // Giver 1 bans everyone else; self is excluded by the rules.
            var cyberki = new List<Cyberek> { C(1, 0, 2, 3), C(2), C(3) };

            _service.HasCompleteAssignment(cyberki).Should().BeFalse();
        }

        [Fact]
        public void HasCompleteAssignment_HallViolation_TwoGiversShareOneTarget_IsFalse()
        {
            // Givers 2 and 3 each still have a candidate (1) — the naive "everyone has
            // at least one option" check would pass — but they cannot BOTH gift 1.
            // This is exactly the case that requires the matching check.
            var cyberki = new List<Cyberek>
            {
                C(1, gifted: 2), // target 2 already taken
                C(2, 0, 3),      // 2 may only gift 1
                C(3, 0, 2),      // 3 may only gift 1
            };

            _service.HasCompleteAssignment(cyberki).Should().BeFalse();
        }

        [Fact]
        public void HasCompleteAssignment_TwelvePeopleWithFourBansEach_IsTrue()
        {
            // Worst realistic case for the crew: 12 people, 4 bans each. Every giver
            // still has 12 - 1 (self) - 4 = 7 > 12/2 candidates, so by Hall's theorem
            // a complete draw always exists.
            var cyberki = Group(12);
            foreach (var cyberek in cyberki)
            {
                cyberek.BannedCyberki = Enumerable.Range(1, 4)
                    .Select(k => ((cyberek.Id - 1 + k) % 12) + 1)
                    .ToList();
            }

            _service.HasCompleteAssignment(cyberki).Should().BeTrue();
        }

        #endregion

        #region GetSafeTargets

        [Fact]
        public void GetSafeTargets_NullArguments_ThrowArgumentNullException()
        {
            Assert.Throws<ArgumentNullException>(() => _service.GetSafeTargets(null!, C(1)));
            Assert.Throws<ArgumentNullException>(() => _service.GetSafeTargets(Group(3), null!));
        }

        [Fact]
        public void GetSafeTargets_ExcludesSelfBannedAndTakenTargets()
        {
            var cyberki = new List<Cyberek>
            {
                C(1, 0, 4),      // giver: bans 4
                C(2, gifted: 3), // target 3 already taken
                C(3),
                C(4),
                C(5),
            };

            var safe = _service.GetSafeTargets(cyberki, cyberki[0]);

            // 1 = self, 3 = taken, 4 = banned → only 2 and 5 remain (both safe here).
            safe.Should().BeEquivalentTo(new[] { 2, 5 });
        }

        [Fact]
        public void GetSafeTargets_ExcludesChoicesThatWouldStrandAnotherParticipant()
        {
            // 4 people; givers 3 and 4 can only gift 1 or 2 (they ban each other, and
            // self is excluded by the rules). If giver 1 took target 2, both 3 and 4
            // would be left fighting over target 1 — so 2 must NOT be offered, even
            // though it is free, not banned and not self.
            var cyberki = new List<Cyberek>
            {
                C(1),
                C(2),
                C(3, 0, 4),
                C(4, 0, 3),
            };

            var safe = _service.GetSafeTargets(cyberki, cyberki[0]);

            safe.Should().BeEquivalentTo(new[] { 3, 4 });
        }

        [Fact]
        public void GetSafeTargets_GiverWhoAlreadyDrew_ReturnsEmpty()
        {
            var cyberki = new List<Cyberek> { C(1, gifted: 2), C(2), C(3) };

            _service.GetSafeTargets(cyberki, cyberki[0]).Should().BeEmpty();
        }

        [Fact]
        public void GetSafeTargets_LastGiver_GetsExactlyTheRemainingFreeTarget()
        {
            var cyberki = new List<Cyberek>
            {
                C(1, gifted: 2),
                C(2, gifted: 3),
                C(3), // last one drawing; the only free target left is 1
            };

            _service.GetSafeTargets(cyberki, cyberki[2]).Should().BeEquivalentTo(new[] { 1 });
        }

        [Fact]
        public void GetSafeTargets_LargeGroupWithHeavyBans_ComputesQuickly()
        {
            // Genericity sanity check: 100 participants, 10 bans each — computing the
            // full safe-target list for one giver stays interactive.
            const int n = 100;
            var cyberki = Group(n);
            foreach (var cyberek in cyberki)
            {
                cyberek.BannedCyberki = Enumerable.Range(1, 10)
                    .Select(k => ((cyberek.Id - 1 + k) % n) + 1)
                    .ToList();
            }

            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            var safe = _service.GetSafeTargets(cyberki, cyberki[0]);
            stopwatch.Stop();

            // With this ban density every candidate is provably safe (min degree > n/2).
            safe.Should().HaveCount(n - 1 - 10);
            stopwatch.ElapsedMilliseconds.Should().BeLessThan(2000);
        }

        #endregion

        #region IsChoiceSafe

        [Fact]
        public void IsChoiceSafe_SelfBannedTakenOrUnknownTarget_IsFalse()
        {
            var cyberki = new List<Cyberek>
            {
                C(1, 0, 4),
                C(2, gifted: 3),
                C(3),
                C(4),
                C(5),
            };
            var giver = cyberki[0];

            _service.IsChoiceSafe(cyberki, giver, 1).Should().BeFalse();  // self
            _service.IsChoiceSafe(cyberki, giver, 4).Should().BeFalse();  // banned
            _service.IsChoiceSafe(cyberki, giver, 3).Should().BeFalse();  // taken
            _service.IsChoiceSafe(cyberki, giver, 99).Should().BeFalse(); // unknown id
        }

        [Fact]
        public void IsChoiceSafe_GiverWhoAlreadyDrew_IsFalse()
        {
            var cyberki = new List<Cyberek> { C(1, gifted: 2), C(2), C(3) };

            _service.IsChoiceSafe(cyberki, cyberki[0], 3).Should().BeFalse();
        }

        [Fact]
        public void IsChoiceSafe_MatchesGetSafeTargetsVerdicts()
        {
            var cyberki = new List<Cyberek>
            {
                C(1),
                C(2),
                C(3, 0, 4),
                C(4, 0, 3),
            };
            var giver = cyberki[0];

            _service.IsChoiceSafe(cyberki, giver, 2).Should().BeFalse(); // would strand 3 and 4
            _service.IsChoiceSafe(cyberki, giver, 3).Should().BeTrue();
            _service.IsChoiceSafe(cyberki, giver, 4).Should().BeTrue();
        }

        #endregion

        #region Full-draw simulations (property tests)

        [Fact]
        public void FullDraw_RandomFeasibleConfigurations_AlwaysCompleteWithoutViolations()
        {
            // Simulate the whole party for many random group sizes, ban sets and drawing
            // orders: every participant, in random order, opens a random SAFE box. The
            // draw must always finish with a valid assignment — no self-gifting, no
            // banned pairs, every target unique, and nobody ever stuck.
            for (var seed = 0; seed < 60; seed++)
            {
                var rng = new Random(seed);
                var n = rng.Next(2, 16);
                var cyberki = Group(n);

                // Random bans, each kept only while the configuration stays solvable —
                // mirrors how the organizer must set up a real edition.
                foreach (var cyberek in cyberki)
                {
                    var candidates = cyberki.Select(c => c.Id)
                        .Where(id => id != cyberek.Id)
                        .OrderBy(_ => rng.Next())
                        .Take(rng.Next(0, n))
                        .ToList();
                    foreach (var banned in candidates)
                    {
                        cyberek.BannedCyberki.Add(banned);
                        if (!_service.HasCompleteAssignment(cyberki))
                        {
                            cyberek.BannedCyberki.Remove(banned);
                        }
                    }
                }

                var drawOrder = cyberki.OrderBy(_ => rng.Next()).ToList();
                foreach (var giver in drawOrder)
                {
                    var safe = _service.GetSafeTargets(cyberki, giver);

                    // The core guarantee: whoever draws next always has a box to open.
                    safe.Should().NotBeEmpty($"seed {seed}: giver {giver.Id} must have a safe choice");

                    var pick = safe[rng.Next(safe.Count)];
                    _service.IsChoiceSafe(cyberki, giver, pick).Should().BeTrue();
                    giver.GiftedCyberekId = pick;
                }

                cyberki.Should().OnlyContain(c => c.GiftedCyberekId != 0);
                cyberki.Select(c => c.GiftedCyberekId).Should().OnlyHaveUniqueItems();
                cyberki.Should().OnlyContain(c => c.GiftedCyberekId != c.Id);
                cyberki.Should().OnlyContain(c => !c.BannedCyberki.Contains(c.GiftedCyberekId));
            }
        }

        [Fact]
        public void FullDraw_ConcurrentRaceScenario_SecondChoiceFailsRecheckAfterFirstCommit()
        {
            // The race the draw lock exists for: G1 and G2 both validate against the same
            // snapshot and each choice ALONE is safe — but together they strand G6, whose
            // only allowed targets are 4 and 5. With commits serialized, G2's re-check
            // runs after G1's commit and must reject the now-unsafe choice.
            var cyberki = new List<Cyberek>
            {
                C(1),
                C(2),
                C(3, 0, 4, 5, 6), // 3 may gift only 1 or 2
                C(4, 0, 3, 5, 6), // 4 may gift only 1 or 2
                C(5),
                C(6, 0, 1, 2, 3), // 6 may gift only 4 or 5
            };

            _service.HasCompleteAssignment(cyberki).Should().BeTrue();

            // Both validate against the SAME state — both pass in isolation:
            _service.IsChoiceSafe(cyberki, cyberki[0], 4).Should().BeTrue(); // G1 wants 4
            _service.IsChoiceSafe(cyberki, cyberki[1], 5).Should().BeTrue(); // G2 wants 5

            // G1 commits first (serialized section).
            cyberki[0].GiftedCyberekId = 4;

            // G2's re-check inside its own serialized section must now fail: taking 5
            // would leave G6 with no target at all.
            _service.IsChoiceSafe(cyberki, cyberki[1], 5).Should().BeFalse();
        }

        #endregion

        #region Seeded configuration

        [Fact]
        public async Task SeededConfiguration_AdmitsACompleteDraw()
        {
            // The actual seed (including the current ban lists) must allow everyone to
            // finish the draw — the same check the app runs at startup, so a bad ban
            // configuration surfaces before the party, not during it.
            using var db = new SqliteTestDatabase();
            var repository = new CyberekRepository(db.Context);

            var cyberki = (await repository.GetAllAsync()).ToList();

            cyberki.Should().NotBeEmpty();
            _service.HasCompleteAssignment(cyberki).Should().BeTrue();
        }

        #endregion
    }
}
