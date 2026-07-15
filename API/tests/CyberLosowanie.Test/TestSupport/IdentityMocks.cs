using CyberLosowanie.Models;
using Microsoft.AspNetCore.Identity;
using Moq;

namespace CyberLosowanie.Test.TestSupport
{
    /// <summary>
    /// Builders for the notoriously verbose <see cref="UserManager{T}"/> /
    /// <see cref="RoleManager{T}"/> mocks (they have no parameterless constructor).
    /// </summary>
    public static class IdentityMocks
    {
        public static Mock<UserManager<ApplicationUser>> MockUserManager()
        {
            var store = new Mock<IUserStore<ApplicationUser>>();
            return new Mock<UserManager<ApplicationUser>>(
                store.Object, null!, null!, null!, null!, null!, null!, null!, null!);
        }

        public static Mock<RoleManager<IdentityRole>> MockRoleManager()
        {
            var store = new Mock<IRoleStore<IdentityRole>>();
            return new Mock<RoleManager<IdentityRole>>(
                store.Object, null!, null!, null!, null!);
        }
    }
}
