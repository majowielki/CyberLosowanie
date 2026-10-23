using CyberLosowanie.Data;
using CyberLosowanie.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
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

        /// <summary>
        /// A real UserManager over <paramref name="context"/> with the app's lockout
        /// settings (5 failures → 15 minutes), for tests of genuine Identity behaviour.
        /// Dispose the provider with the test.
        /// </summary>
        public static ServiceProvider RealUserManagerServices(ApplicationDbContext context)
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton(context);
            services.AddIdentityCore<ApplicationUser>(options =>
                {
                    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
                    options.Lockout.MaxFailedAccessAttempts = 5;
                    options.Lockout.AllowedForNewUsers = true;
                })
                .AddEntityFrameworkStores<ApplicationDbContext>();
            return services.BuildServiceProvider();
        }

        public static Mock<RoleManager<IdentityRole>> MockRoleManager()
        {
            var store = new Mock<IRoleStore<IdentityRole>>();
            return new Mock<RoleManager<IdentityRole>>(
                store.Object, null!, null!, null!, null!);
        }
    }
}
