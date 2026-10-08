using FluentAssertions;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;
using LabTracker.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;

namespace LabTracker.UnitTests.Identity;

public class InitialAdminSeedTests
{
    [Fact]
    public async Task SeedInitialAdminAsync_OnEmptyDatabase_CreatesNormalisedSuperAdmin_ThatCanSignIn()
    {
        using var db = TestDbContextFactory.Create();
        var hasher = new PasswordHasher<User>();

        var created = await DbSeeder.SeedInitialAdminAsync(db, hasher, " Owner@Lab.example ", "a-long-password");

        created.Should().BeTrue();
        var admin = db.Users.Single();
        admin.Email.Should().Be("owner@lab.example");
        admin.Role.Should().Be(Role.SuperAdmin);
        hasher.VerifyHashedPassword(admin, admin.PasswordHash, "a-long-password").Should().NotBe(PasswordVerificationResult.Failed);
    }

    [Fact]
    public async Task SeedInitialAdminAsync_DoesNothing_OnceAnyUserExists()
    {
        using var db = TestDbContextFactory.Create();
        db.AddUser("existing@labtracker.local", Role.Researcher);

        var created = await DbSeeder.SeedInitialAdminAsync(db, new PasswordHasher<User>(), "owner@lab.example", "a-long-password");

        created.Should().BeFalse();
        db.Users.Select(u => u.Email).Should().Equal("existing@labtracker.local");
    }
}
