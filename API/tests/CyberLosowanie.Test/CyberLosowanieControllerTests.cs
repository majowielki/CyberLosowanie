using CyberLosowanie.Constants;
using CyberLosowanie.Controllers;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using CyberLosowanie.Models.Dto;
using CyberLosowanie.Models.Dto.Responses;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;
using Moq;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace CyberLosowanie.Test
{
    public class CyberLosowanieControllerTests
    {
        private readonly Mock<ICyberekService> _cyberekServiceMock;
        private readonly CyberLosowanieController _controller;

        public CyberLosowanieControllerTests()
        {
            _cyberekServiceMock = new Mock<ICyberekService>();
            _controller = new CyberLosowanieController(_cyberekServiceMock.Object);
        }

        #region Constructor Tests

        [Fact]
        public void Constructor_WithNullCyberekService_ThrowsArgumentNullException()
        {
            // Act & Assert
            var exception = Assert.Throws<ArgumentNullException>(() =>
                new CyberLosowanieController(null!));

            exception.ParamName.Should().Be("cyberekService");
        }

        [Fact]
        public void Constructor_WithValidCyberekService_CreatesInstance()
        {
            // Act
            var controller = new CyberLosowanieController(_cyberekServiceMock.Object);

            // Assert
            controller.Should().NotBeNull();
        }

        #endregion

        #region GetAvailableToPickCyberki Tests

        [Fact]
        public async Task GetAvailableToPickCyberki_WhenServiceReturnsData_ReturnsOkWithCyberki()
        {
            // Arrange
            var expectedCyberki = CreateTestCyberki(3);
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(expectedCyberki);

            // Act
            var result = await _controller.GetAvailableToPickCyberki();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            okResult!.Value.Should().BeOfType<ApiResponse<IEnumerable<CyberekResponse>>>();
            
            var apiResponse = okResult.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            apiResponse!.IsSuccess.Should().BeTrue();
            // Subject is CyberekResponse (no GiftedCyberekId/BannedCyberki) — compare shared fields only.
            apiResponse.Data.Should().BeEquivalentTo(expectedCyberki, options => options.ExcludingMissingMembers());
            apiResponse.Message.Should().NotBeNull();
            apiResponse.Errors.Should().NotBeNull();
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_WhenServiceReturnsEmptyList_ReturnsOkWithEmptyList()
        {
            // Arrange
            var emptyCyberki = new List<Cyberek>();
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(emptyCyberki);

            // Act
            var result = await _controller.GetAvailableToPickCyberki();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            okResult!.Value.Should().BeOfType<ApiResponse<IEnumerable<CyberekResponse>>>();
            
            var apiResponse = okResult.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            apiResponse!.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().BeEmpty();
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_WhenServiceReturnsOnlyUnassignedCyberki_ReturnsCorrectData()
        {
            // Arrange
            var allCyberki = CreateTestCyberki(5);
            var availableCyberki = allCyberki.Take(2).ToList(); // Simulate only first 2 are available
            
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(availableCyberki);

            // Act
            var result = await _controller.GetAvailableToPickCyberki();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            
            apiResponse!.Data.Should().HaveCount(2);
            apiResponse.Data.Should().BeEquivalentTo(availableCyberki, options => options.ExcludingMissingMembers());
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_WhenServiceThrowsException_PropagatesException()
        {
            // Arrange
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ThrowsAsync(new InvalidOperationException("Database connection failed"));

            // Act & Assert
            await Assert.ThrowsAsync<InvalidOperationException>(() =>
                _controller.GetAvailableToPickCyberki());
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_CallsServiceMethod_ExactlyOnce()
        {
            // Arrange
            var testCyberki = CreateTestCyberki(1);
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(testCyberki);

            // Act
            await _controller.GetAvailableToPickCyberki();

            // Assert
            _cyberekServiceMock.Verify(x => x.GetAvailableToPickCyberkiAsync(), Times.Once);
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_WithRealisticScenario_ReturnsCorrectStructure()
        {
            // Arrange - Simulate a realistic scenario where some cyberki are taken
            var availableCyberki = new List<Cyberek>
            {
                new Cyberek
                {
                    Id = 1,
                    Name = "Michał",
                    Surname = "Majewski",
                    GiftedCyberekId = 0,
                    BannedCyberki = new List<int> { 1, 2, 6 }
                },
                new Cyberek
                {
                    Id = 5,
                    Name = "Asia",
                    Surname = "Małek",
                    GiftedCyberekId = 0,
                    BannedCyberki = new List<int> { 5, 7, 8 }
                }
            };

            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(availableCyberki);

            // Act
            var result = await _controller.GetAvailableToPickCyberki();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            
            apiResponse!.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().HaveCount(2);
            
            var dataList = apiResponse.Data.ToList();
            dataList[0].Name.Should().Be("Michał");
            dataList[0].Surname.Should().Be("Majewski");
            dataList[1].Name.Should().Be("Asia");
            dataList[1].Surname.Should().Be("Małek");
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_MultipleConsecutiveCalls_EachCallsService()
        {
            // Arrange
            var testCyberki = CreateTestCyberki(2);
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(testCyberki);

            // Act
            await _controller.GetAvailableToPickCyberki();
            await _controller.GetAvailableToPickCyberki();
            await _controller.GetAvailableToPickCyberki();

            // Assert
            _cyberekServiceMock.Verify(x => x.GetAvailableToPickCyberkiAsync(), Times.Exactly(3));
        }

        #endregion

        #region GetCyberki Tests (for comparison and completeness)

        [Fact]
        public async Task GetCyberki_WhenServiceReturnsData_ReturnsOkWithAllCyberki()
        {
            // Arrange
            var expectedCyberki = CreateTestCyberki(5);
            _cyberekServiceMock.Setup(x => x.GetAllCyberkiAsync())
                .ReturnsAsync(expectedCyberki);

            // Act
            var result = await _controller.GetCyberki();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            
            apiResponse!.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().HaveCount(5);
            apiResponse.Data.Should().BeEquivalentTo(expectedCyberki, options => options.ExcludingMissingMembers());
        }

        #endregion

        #region Integration and Edge Case Tests

        [Fact]
        public async Task GetAvailableToPickCyberki_VersusGetCyberki_BehaviorComparison()
        {
            // Arrange
            var allCyberki = CreateTestCyberki(5);
            var availableCyberki = allCyberki.Take(3).ToList(); // Only 3 are available to pick

            _cyberekServiceMock.Setup(x => x.GetAllCyberkiAsync())
                .ReturnsAsync(allCyberki);
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(availableCyberki);

            // Act
            var allResult = await _controller.GetCyberki();
            var availableResult = await _controller.GetAvailableToPickCyberki();

            // Assert
            var allResponse = (allResult as OkObjectResult)!.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            var availableResponse = (availableResult as OkObjectResult)!.Value as ApiResponse<IEnumerable<CyberekResponse>>;

            allResponse!.Data.Should().HaveCount(5);
            availableResponse!.Data.Should().HaveCount(3);
            availableResponse.Data.Should().BeSubsetOf(allResponse.Data);
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_WithLargeCyberekCollection_HandlesCorrectly()
        {
            // Arrange
            var largeCyberekCollection = CreateTestCyberki(100);
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync(largeCyberekCollection);

            // Act
            var result = await _controller.GetAvailableToPickCyberki();

            // Assert
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            
            apiResponse!.Data.Should().HaveCount(100);
            apiResponse.IsSuccess.Should().BeTrue();
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_WithNullFromService_ReturnsOkWithEmptyList()
        {
            // Arrange
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync((IEnumerable<Cyberek>)null!);

            // Act
            var result = await _controller.GetAvailableToPickCyberki();

            // Assert - contract: a collection endpoint returns 200 with an empty list
            result.Should().BeOfType<OkObjectResult>();
            var okResult = result as OkObjectResult;
            okResult!.Value.Should().BeOfType<ApiResponse<IEnumerable<CyberekResponse>>>();

            var apiResponse = okResult.Value as ApiResponse<IEnumerable<CyberekResponse>>;
            apiResponse!.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().BeEmpty();
        }

        #endregion

        #region Draw boxes (box numbers only)

        private void SignIn(string userName) =>
            _controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity(new[] { new Claim("fullName", userName) }, "test")),
                },
            };

        [Fact]
        public async Task GetMyAvailableGiftBoxes_ReturnsBoxNumbersFromTheBoxOrder()
        {
            SignIn("john");
            _cyberekServiceMock.Setup(s => s.GetAvailableGiftBoxesForUserAsync("john")).ReturnsAsync(new List<int> { 2, 7 });

            var result = await _controller.GetMyAvailableGiftBoxes();

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeOfType<ApiResponse<List<int>>>().Which.Data.Should().Equal(2, 7);
            // The cyberek-id view of the same choices never reaches the client.
            _cyberekServiceMock.Verify(s => s.GetAvailableGiftTargetsForUserAsync(It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task GetMyAvailableGiftBoxes_NoBoxLeft_Returns409()
        {
            SignIn("john");
            _cyberekServiceMock.Setup(s => s.GetAvailableGiftBoxesForUserAsync("john")).ReturnsAsync(new List<int>());

            var result = await _controller.GetMyAvailableGiftBoxes();

            result.Should().BeOfType<ConflictObjectResult>();
        }

        [Fact]
        public async Task GetMyAvailableGiftBoxes_WithoutIdentity_Returns401()
        {
            SignIn("");

            var result = await _controller.GetMyAvailableGiftBoxes();

            result.Should().BeOfType<UnauthorizedObjectResult>();
            _cyberekServiceMock.VerifyNoOtherCalls();
        }

        [Fact]
        public async Task AssignGift_OpensTheChosenBoxAndReturnsTheDrawnCyberek()
        {
            SignIn("john");
            _cyberekServiceMock.Setup(s => s.AssignGiftByBoxAsync("john", 4)).ReturnsAsync(11);

            var result = await _controller.AssignGift(new GiftChoiceDTO { BoxNumber = 4 });

            var ok = result.Should().BeOfType<OkObjectResult>().Subject;
            ok.Value.Should().BeOfType<ApiResponse<int>>().Which.Data.Should().Be(11);
            // The box number is never taken as a cyberek id.
            _cyberekServiceMock.Verify(s => s.AssignGiftAsync(It.IsAny<string>(), It.IsAny<int>()), Times.Never);
        }

        [Theory]
        [InlineData(0, false)]
        [InlineData(1, true)]
        [InlineData(CyberLosowanieConstants.TOTAL_CYBERKI_COUNT, true)]
        [InlineData(CyberLosowanieConstants.TOTAL_CYBERKI_COUNT + 1, false)]
        public void GiftChoice_BoxNumberMustBeOnTheBoard(int boxNumber, bool valid)
        {
            var choice = new GiftChoiceDTO { BoxNumber = boxNumber };

            Validator.TryValidateObject(choice, new ValidationContext(choice), null, validateAllProperties: true)
                .Should().Be(valid);
        }

        [Fact]
        public void DrawApi_ExposesNoCyberekIdsForTheBoxes()
        {
            // Guards the contract itself: the request carries only a box number, and no
            // route lists the available targets as cyberek ids (that would map the boxes).
            typeof(GiftChoiceDTO).GetProperties().Select(p => p.Name).Should().Equal(nameof(GiftChoiceDTO.BoxNumber));

            var routes = typeof(CyberLosowanieController).GetMethods()
                .SelectMany(m => m.GetCustomAttributes(typeof(HttpMethodAttribute), false).Cast<HttpMethodAttribute>())
                .Select(a => a.Template)
                .ToList();
            routes.Should().Contain("my-available-boxes");
            routes.Should().NotContain(r => r != null && r.Contains("target", StringComparison.OrdinalIgnoreCase));
        }

        #endregion

        #region Helper Methods

        private List<Cyberek> CreateTestCyberki(int count)
        {
            var cyberki = new List<Cyberek>();
            for (int i = 1; i <= count; i++)
            {
                cyberki.Add(new Cyberek
                {
                    Id = i,
                    Name = $"TestName{i}",
                    Surname = $"TestSurname{i}",
                    GiftedCyberekId = 0,
                    BannedCyberki = new List<int>()
                });
            }
            return cyberki;
        }

        #endregion
    }
}