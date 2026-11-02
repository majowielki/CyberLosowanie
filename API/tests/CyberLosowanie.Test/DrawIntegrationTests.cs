using CyberLosowanie.Exceptions;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Repositories;
using CyberLosowanie.Services;
using CyberLosowanie.Test.TestSupport;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Numerics;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// The draw as the API runs it: CyberekService over the real repositories, the
    /// real seed (ban lists) and a relational engine — not the engine alone. Every
    /// participant asks for their boxes and opens one, in many orders, and the
    /// persisted result must be a complete, legal draw.
    /// </summary>
    public class DrawIntegrationTests
    {
        private sealed class Party : IDisposable
        {
            private readonly ServiceProvider _identity;

            public SqliteTestDatabase Db { get; } = new();
            public CyberekService Service { get; }
            public GiftBoxLayout BoxLayout { get; } = new("integration-test-server-secret-0123456789abcdef");
            public List<string> UserNames { get; } = new();

            public Party()
            {
                // One participant per seeded cyberek, each already past step 1.
                foreach (var cyberek in Db.Context.Cyberki.AsNoTracking().OrderBy(c => c.Id).ToList())
                {
                    var userName = $"user{cyberek.Id}";
                    Db.Context.Users.Add(new ApplicationUser
                    {
                        UserName = userName,
                        NormalizedUserName = userName.ToUpperInvariant(),
                        CyberekId = cyberek.Id,
                    });
                    UserNames.Add(userName);
                }
                Db.Context.SaveChanges();

                _identity = IdentityMocks.RealUserManagerServices(Db.Context);
                var userManager = _identity.GetRequiredService<UserManager<ApplicationUser>>();
                Service = new CyberekService(
                    new CyberekRepository(Db.Context),
                    new ApplicationUserRepository(Db.Context, userManager),
                    new GiftingService(),
                    new MemoryCache(new MemoryCacheOptions()),
                    NullLogger<CyberekService>.Instance,
                    new AuditService(Db.Context, NullLogger<AuditService>.Instance),
                    Mock.Of<ISantaNotificationService>(),
                    BoxLayout);
            }

            public string UserId(string userName) =>
                Db.NewContext().Users.AsNoTracking().Single(u => u.UserName == userName).Id;

            public void Dispose()
            {
                _identity.Dispose();
                Db.Dispose();
            }
        }

        private static void ShouldBeCompleteLegalDraw(SqliteTestDatabase db)
        {
            using var verify = db.NewContext();
            var cyberki = verify.Cyberki.AsNoTracking().ToList();
            var users = verify.Users.AsNoTracking().ToList();

            cyberki.Should().OnlyContain(c => c.GiftedCyberekId != 0);
            cyberki.Select(c => c.GiftedCyberekId).Should().OnlyHaveUniqueItems();
            cyberki.Should().OnlyContain(c => c.GiftedCyberekId != c.Id);
            cyberki.Should().OnlyContain(c => !c.BannedCyberki.Contains(c.GiftedCyberekId));
            // The user row mirrors their cyberek's draw.
            users.Should().OnlyContain(u => u.GiftedCyberekId == cyberki.Single(c => c.Id == u.CyberekId).GiftedCyberekId);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(2)]
        [InlineData(3)]
        [InlineData(4)]
        [InlineData(5)]
        [InlineData(6)]
        [InlineData(7)]
        public async Task FullDraw_ThroughTheService_AlwaysOffersABoxAndEndsLegal(int seed)
        {
            using var party = new Party();
            var rng = new Random(seed);

            foreach (var userName in party.UserNames.OrderBy(_ => rng.Next()))
            {
                var boxes = await party.Service.GetAvailableGiftTargetsForUserAsync(userName);
                boxes.Should().NotBeEmpty($"seed {seed}: {userName} must always have a box to open");

                var pick = boxes[rng.Next(boxes.Count)];
                (await party.Service.AssignGiftAsync(userName, pick)).Should().Be(pick);
            }

            ShouldBeCompleteLegalDraw(party.Db);
        }

        [Theory]
        [InlineData(0)]
        [InlineData(1)]
        [InlineData(2)]
        [InlineData(3)]
        [InlineData(4)]
        [InlineData(5)]
        [InlineData(6)]
        [InlineData(7)]
        public async Task FullDraw_ByBoxNumbers_AsTheApiRunsIt_EndsLegalAndOpensExactlyTheChosenBox(int seed)
        {
            // The client only ever sees and sends box numbers. Every box offered must hide
            // a safe target, opening it must commit exactly the cyberek in that box of the
            // user's own order, and the whole party must still end in a legal draw.
            using var party = new Party();
            var rng = new Random(seed);
            var cyberekIds = party.Db.Context.Cyberki.AsNoTracking().Select(c => c.Id).ToList();

            foreach (var userName in party.UserNames.OrderBy(_ => rng.Next()))
            {
                var layout = party.BoxLayout.Arrange(party.UserId(userName), cyberekIds);
                var targets = await party.Service.GetAvailableGiftTargetsForUserAsync(userName);
                var boxes = await party.Service.GetAvailableGiftBoxesForUserAsync(userName);

                boxes.Should().NotBeEmpty($"seed {seed}: {userName} must always have a box to open");
                boxes.Should().BeInAscendingOrder().And.OnlyHaveUniqueItems();
                boxes.Should().OnlyContain(box => box >= 1 && box <= cyberekIds.Count);
                // Same choices as the engine offers — just under box numbers.
                boxes.Select(box => layout[box - 1]).Should().BeEquivalentTo(targets);

                var box = boxes[rng.Next(boxes.Count)];
                var drawn = await party.Service.AssignGiftByBoxAsync(userName, box);
                drawn.Should().Be(layout[box - 1], $"box {box} of {userName}'s order holds cyberek {layout[box - 1]}");
            }

            ShouldBeCompleteLegalDraw(party.Db);
        }

        [Fact]
        public async Task BoxOrder_IsPrivatePerUser_AndNeverTheIdOrderOfThePickList()
        {
            using var party = new Party();
            var cyberekIds = party.Db.Context.Cyberki.AsNoTracking().OrderBy(c => c.Id).Select(c => c.Id).ToList();

            var layouts = party.UserNames
                .Select(userName => party.BoxLayout.Arrange(party.UserId(userName), cyberekIds))
                .ToList();

            layouts.Should().OnlyContain(layout => layout.OrderBy(id => id).SequenceEqual(cyberekIds));
            layouts.Should().NotContain(layout => layout.SequenceEqual(cyberekIds));
            layouts.Select(layout => string.Join(",", layout)).Should().OnlyHaveUniqueItems();

            // Stable: asking again (e.g. after a refresh) gives every user the same boxes.
            var userName = party.UserNames[0];
            var before = await party.Service.GetAvailableGiftBoxesForUserAsync(userName);
            (await party.Service.GetAvailableGiftBoxesForUserAsync(userName)).Should().Equal(before);
        }

        [Fact]
        public async Task AssignGiftByBox_ABoxThatHidesAStrandingChoice_IsRejectedAndNothingIsSaved()
        {
            // Hidden boxes are not just hidden: sending one anyway must fail at commit.
            for (var seed = 0; seed < 50; seed++)
            {
                using var party = new Party();
                var rng = new Random(seed);
                var cyberekIds = party.Db.Context.Cyberki.AsNoTracking().Select(c => c.Id).ToList();

                foreach (var userName in party.UserNames.OrderBy(_ => rng.Next()))
                {
                    var layout = party.BoxLayout.Arrange(party.UserId(userName), cyberekIds);
                    var boxes = await party.Service.GetAvailableGiftBoxesForUserAsync(userName);
                    var trap = await FindStrandingChoiceAsync(party.Db, userName,
                        boxes.Select(box => layout[box - 1]).ToList());
                    if (trap is { } deadEnd)
                    {
                        var trapBox = layout.ToList().IndexOf(deadEnd) + 1;
                        await Assert.ThrowsAsync<GiftTargetUnavailableException>(
                            () => party.Service.AssignGiftByBoxAsync(userName, trapBox));

                        using var verify = party.Db.NewContext();
                        verify.Users.AsNoTracking().Single(u => u.UserName == userName).GiftedCyberekId.Should().Be(0);
                        verify.Cyberki.AsNoTracking().Should().NotContain(c => c.GiftedCyberekId == deadEnd);
                        return;
                    }

                    await party.Service.AssignGiftByBoxAsync(userName, boxes[rng.Next(boxes.Count)]);
                }
            }

            Assert.Fail("No stranding box found — the scenario this test guards was not exercised.");
        }

        [Fact]
        public async Task AssignGift_AllowedButStrandingChoice_IsRejectedAndTheDrawStillCompletes()
        {
            // A client that skips the offered list and sends a box that is free and not
            // banned, but would leave someone later with no legal box, must be refused
            // at commit time — and nothing may be saved.
            for (var seed = 0; seed < 50; seed++)
            {
                using var party = new Party();
                var rng = new Random(seed);
                var order = party.UserNames.OrderBy(_ => rng.Next()).ToList();

                for (var i = 0; i < order.Count; i++)
                {
                    var userName = order[i];
                    var boxes = await party.Service.GetAvailableGiftTargetsForUserAsync(userName);
                    var trap = await FindStrandingChoiceAsync(party.Db, userName, boxes);
                    if (trap is { } deadEnd)
                    {
                        await Assert.ThrowsAsync<GiftTargetUnavailableException>(
                            () => party.Service.AssignGiftAsync(userName, deadEnd));

                        using (var verify = party.Db.NewContext())
                        {
                            verify.Users.AsNoTracking().Single(u => u.UserName == userName)
                                .GiftedCyberekId.Should().Be(0);
                            verify.Cyberki.AsNoTracking().Should().NotContain(c => c.GiftedCyberekId == deadEnd);
                        }

                        // The refusal leaves the party on track: everyone still finishes.
                        foreach (var rest in order.Skip(i))
                        {
                            var left = await party.Service.GetAvailableGiftTargetsForUserAsync(rest);
                            left.Should().NotBeEmpty();
                            await party.Service.AssignGiftAsync(rest, left[rng.Next(left.Count)]);
                        }
                        ShouldBeCompleteLegalDraw(party.Db);
                        return;
                    }

                    await party.Service.AssignGiftAsync(userName, boxes[rng.Next(boxes.Count)]);
                }
            }

            Assert.Fail("No stranding choice found — the scenario this test guards was not exercised.");
        }

        // A box that is free, not self and not banned for the user, yet missing from the
        // offered list — i.e. one the engine hid because it would strand someone.
        private static async Task<int?> FindStrandingChoiceAsync(SqliteTestDatabase db, string userName, List<int> offered)
        {
            using var read = db.NewContext();
            var user = await read.Users.AsNoTracking().SingleAsync(u => u.UserName == userName);
            var cyberki = await read.Cyberki.AsNoTracking().ToListAsync();
            var giver = cyberki.Single(c => c.Id == user.CyberekId);
            var taken = cyberki.Where(c => c.GiftedCyberekId != 0).Select(c => c.GiftedCyberekId).ToHashSet();

            return cyberki
                .Select(c => (int?)c.Id)
                .FirstOrDefault(id => id != giver.Id
                                      && !giver.BannedCyberki.Contains(id!.Value)
                                      && !taken.Contains(id.Value)
                                      && !offered.Contains(id.Value));
        }

        /// <summary>
        /// Exhaustive proof for the current seed (~6 min, so run on demand:
        /// <c>dotnet test -- --explicit only</c>). A draw state is (who still draws,
        /// which boxes are still free); the engine's answers depend on nothing else.
        /// Every state reachable through offered choices is visited, and for every
        /// giver in it the engine's offered list must equal a brute-force "this box
        /// still leaves a complete legal draw" — and must never be empty.
        /// </summary>
        [Fact(Explicit = true)]
        public async Task SeededConfiguration_EveryReachableDrawState_MatchesBruteForceAndNeverStrandsAnyone()
        {
            using var db = new SqliteTestDatabase();
            var seed = (await new CyberekRepository(db.Context).GetAllAsync()).OrderBy(c => c.Id).ToList();
            var n = seed.Count;
            var engine = new GiftingService();

            var allowed = new int[n];
            for (var g = 0; g < n; g++)
                for (var t = 0; t < n; t++)
                    if (t != g && !seed[g].BannedCyberki.Contains(seed[t].Id)) allowed[g] |= 1 << t;

            // Plain recursive search with memo — deliberately no matching theory.
            var memo = new sbyte[1 << (2 * n)];
            bool Completable(int r, int f)
            {
                if (r == 0) return true;
                var key = (r << n) | f;
                if (memo[key] != 0) return memo[key] > 0;
                var g = BitOperations.TrailingZeroCount(r);
                var ok = false;
                for (var options = allowed[g] & f; options != 0 && !ok; options &= options - 1)
                    ok = Completable(r & ~(1 << g), f & ~(1 << BitOperations.TrailingZeroCount(options)));
                memo[key] = (sbyte)(ok ? 1 : -1);
                return ok;
            }

            // Engine input for (r, f): finished givers hold any distinct taken box.
            List<Cyberek> Build(int r, int f)
            {
                var taken = Enumerable.Range(0, n).Where(t => (f & (1 << t)) == 0).ToList();
                var next = 0;
                return Enumerable.Range(0, n).Select(g => new Cyberek
                {
                    Id = seed[g].Id,
                    Name = seed[g].Name,
                    Surname = seed[g].Surname,
                    BannedCyberki = seed[g].BannedCyberki,
                    GiftedCyberekId = (r & (1 << g)) != 0 ? 0 : seed[taken[next++]].Id,
                }).ToList();
            }

            var full = (1 << n) - 1;
            Completable(full, full).Should().BeTrue("the seed must admit at least one legal draw");
            engine.HasCompleteAssignment(Build(full, full)).Should().BeTrue();

            var visited = new bool[1 << (2 * n)];
            var queue = new Queue<(int R, int F)>();
            queue.Enqueue((full, full));
            visited[(full << n) | full] = true;
            var states = 0;
            while (queue.Count > 0)
            {
                var (r, f) = queue.Dequeue();
                states++;
                var cyberki = Build(r, f);
                for (var g = 0; g < n; g++)
                {
                    if ((r & (1 << g)) == 0) continue;
                    var expected = Enumerable.Range(0, n)
                        .Where(t => (allowed[g] & f & (1 << t)) != 0 && Completable(r & ~(1 << g), f & ~(1 << t)))
                        .ToList();
                    var offered = engine.GetSafeTargets(cyberki, cyberki[g]).Select(id => id - 1).ToList();

                    // Plain checks: ~15 million of them, assertion libraries are too slow here.
                    if (offered.Count == 0 || !offered.ToHashSet().SetEquals(expected))
                    {
                        Assert.Fail($"Giver {seed[g].Id} in state r={r:B}, f={f:B}: offered [{string.Join(",", offered.Select(t => t + 1))}], " +
                                    $"legal [{string.Join(",", expected.Select(t => t + 1))}].");
                    }
                    foreach (var t in Enumerable.Range(0, n).Where(t => (allowed[g] & f & (1 << t)) != 0))
                    {
                        if (engine.IsChoiceSafe(cyberki, cyberki[g], seed[t].Id) != expected.Contains(t))
                        {
                            Assert.Fail($"IsChoiceSafe disagrees for giver {seed[g].Id} → {seed[t].Id} in state r={r:B}, f={f:B}.");
                        }
                    }

                    foreach (var t in offered)
                    {
                        var key = ((r & ~(1 << g)) << n) | (f & ~(1 << t));
                        if (!visited[key])
                        {
                            visited[key] = true;
                            queue.Enqueue((r & ~(1 << g), f & ~(1 << t)));
                        }
                    }
                }
            }

            states.Should().BeGreaterThan(1);
        }
    }
}
