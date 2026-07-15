using CyberLosowanie.Models;
using CyberLosowanie.Services;
using CyberLosowanie.Test.TestSupport;
using FluentAssertions;

namespace CyberLosowanie.Test
{
    /// <summary>
    /// Verifies that the gifting algorithm's randomness is injectable and therefore
    /// reproducible under test, while the parameterless constructor still works for
    /// callers that don't need a seeded sequence (I7).
    /// </summary>
    public class GiftingServiceRandomnessTests
    {
        [Fact]
        public void ParameterlessConstructor_StillCreatesUsableInstance()
        {
            var service = new GiftingService();

            var result = service.GetAvailableToBeGiftedCyberek(CreateCyberki(4), CreateCyberki(4)[0], 999);

            result.Should().BeInRange(2, 4); // any valid, non-self target
        }

        [Fact]
        public void Constructor_WithNullRandomProvider_ThrowsArgumentNullException()
        {
            var ex = Assert.Throws<ArgumentNullException>(() => new GiftingService(null!));
            ex.ParamName.Should().Be("random");
        }

        [Fact]
        public void GetAvailableToBeGiftedCyberek_WithSameSeed_ProducesIdenticalSequence()
        {
            // Two services seeded identically must walk the shuffled candidates in the
            // same order, so the same inputs yield the same results every time.
            var serviceA = new GiftingService(new SeededRandomProvider(1234));
            var serviceB = new GiftingService(new SeededRandomProvider(1234));

            var resultsA = RunSequence(serviceA);
            var resultsB = RunSequence(serviceB);

            resultsA.Should().Equal(resultsB);
            resultsA.Should().OnlyContain(id => id >= 2 && id <= 5); // valid, non-self
        }

        [Fact]
        public void GetAvailableToBeGiftedCyberek_WithDifferentSeeds_CanDiverge()
        {
            // Not a strict guarantee for every seed pair, but these two are chosen to
            // exercise different shuffle orders — documents that the seed actually drives it.
            var withSeedA = RunSequence(new GiftingService(new SeededRandomProvider(1)));
            var withSeedB = RunSequence(new GiftingService(new SeededRandomProvider(99999)));

            withSeedA.Should().NotEqual(withSeedB);
        }

        private static List<int> RunSequence(GiftingService service)
        {
            var results = new List<int>();
            for (var i = 0; i < 25; i++)
            {
                // Invalid requested target forces the shuffle/backtracking path.
                results.Add(service.GetAvailableToBeGiftedCyberek(CreateCyberki(5), CreateCyberki(5)[0], 999));
            }
            return results;
        }

        private static List<Cyberek> CreateCyberki(int count)
        {
            var cyberki = new List<Cyberek>();
            for (var i = 1; i <= count; i++)
            {
                cyberki.Add(new Cyberek
                {
                    Id = i,
                    Name = $"Cyberek{i}",
                    Surname = $"Surname{i}",
                    ImageUrl = $"https://example.com/{i}.jpg",
                    GiftedCyberekId = 0,
                    BannedCyberki = new List<int>()
                });
            }
            return cyberki;
        }
    }
}
