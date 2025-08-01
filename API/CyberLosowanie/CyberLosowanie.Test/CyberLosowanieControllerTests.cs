using CyberLosowanie.Controllers;
using CyberLosowanie.Interfaces.Services;
using CyberLosowanie.Models;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;

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
            okResult!.Value.Should().BeOfType<ApiResponse<IEnumerable<Cyberek>>>();
            
            var apiResponse = okResult.Value as ApiResponse<IEnumerable<Cyberek>>;
            apiResponse!.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().BeEquivalentTo(expectedCyberki);
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
            okResult!.Value.Should().BeOfType<ApiResponse<IEnumerable<Cyberek>>>();
            
            var apiResponse = okResult.Value as ApiResponse<IEnumerable<Cyberek>>;
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
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<Cyberek>>;
            
            apiResponse!.Data.Should().HaveCount(2);
            apiResponse.Data.Should().BeEquivalentTo(availableCyberki);
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
                    Name = "Micha�",
                    Surname = "Majewski",
                    ImageUrl = "https://randomuser.me/api/portraits/men/1.jpg",
                    GiftedCyberekId = 0,
                    BannedCyberki = new List<int> { 1, 2, 6 }
                },
                new Cyberek
                {
                    Id = 5,
                    Name = "Asia",
                    Surname = "Ma쿮k",
                    ImageUrl = "https://randomuser.me/api/portraits/women/5.jpg",
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
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<Cyberek>>;
            
            apiResponse!.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().HaveCount(2);
            
            var dataList = apiResponse.Data.ToList();
            dataList[0].Name.Should().Be("Micha�");
            dataList[0].Surname.Should().Be("Majewski");
            dataList[1].Name.Should().Be("Asia");
            dataList[1].Surname.Should().Be("Ma쿮k");
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
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<Cyberek>>;
            
            apiResponse!.IsSuccess.Should().BeTrue();
            apiResponse.Data.Should().HaveCount(5);
            apiResponse.Data.Should().BeEquivalentTo(expectedCyberki);
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
            var allResponse = (allResult as OkObjectResult)!.Value as ApiResponse<IEnumerable<Cyberek>>;
            var availableResponse = (availableResult as OkObjectResult)!.Value as ApiResponse<IEnumerable<Cyberek>>;

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
            var apiResponse = okResult!.Value as ApiResponse<IEnumerable<Cyberek>>;
            
            apiResponse!.Data.Should().HaveCount(100);
            apiResponse.IsSuccess.Should().BeTrue();
        }

        [Fact]
        public async Task GetAvailableToPickCyberki_WithNullFromService_ThrowsException()
        {
            // Arrange
            _cyberekServiceMock.Setup(x => x.GetAvailableToPickCyberkiAsync())
                .ReturnsAsync((IEnumerable<Cyberek>)null!);

            // Act & Assert
            await Assert.ThrowsAsync<ArgumentNullException>(() =>
                _controller.GetAvailableToPickCyberki());
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
                    ImageUrl = $"https://example.com/image{i}.jpg",
                    GiftedCyberekId = 0,
                    BannedCyberki = new List<int>()
                });
            }
            return cyberki;
        }

        #endregion
    }
}