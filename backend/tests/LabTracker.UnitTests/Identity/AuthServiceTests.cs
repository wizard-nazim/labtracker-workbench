using FluentAssertions;
using LabTracker.Application.Modules.Identity;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;

namespace LabTracker.UnitTests.Identity;

public class AuthServiceTests
{
    private const string Password = "CorrectHorseBattery1!";

    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, AuthService Sut, User User) BuildSutWithUser(bool isActive = true)
    {
        var db = TestDbContextFactory.Create();
        var hasher = new PasswordHasher<User>();
        var user = new User { Email = "nadia@labtracker.local", Role = Role.Researcher, IsActive = isActive, CreatedAt = DateTime.UtcNow };
        user.PasswordHash = hasher.HashPassword(user, Password);
        db.Users.Add(user);
        db.SaveChanges();

        var sut = new AuthService(db, hasher, new StubJwtTokenGenerator(), new StubGoogleTokenValidator(), new LoginAttemptThrottle(TimeProvider.System));
        return (db, sut, user);
    }

    [Fact]
    public async Task LoginAsync_WithCorrectCredentials_ReturnsTokenAndRole()
    {
        var (_, sut, user) = BuildSutWithUser();

        var result = await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = Password });

        result.Should().NotBeNull();
        result!.Email.Should().Be(user.Email);
        result.Role.Should().Be(nameof(Role.Researcher));
        result.Token.Should().Be(StubJwtTokenGenerator.FixedToken);
    }

    [Fact]
    public async Task LoginAsync_WithWrongPassword_ReturnsNull()
    {
        var (_, sut, user) = BuildSutWithUser();

        var result = await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "WrongPassword1!" });

        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_ForInactiveUser_ReturnsNullEvenWithCorrectPassword()
    {
        var (_, sut, user) = BuildSutWithUser(isActive: false);

        var result = await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = Password });

        result.Should().BeNull();
    }

    [Theory]
    [InlineData("Nadia@LabTracker.local")]
    [InlineData("  nadia@labtracker.local ")]
    public async Task LoginAsync_IgnoresEmailCaseAndSurroundingWhitespace(string typed)
    {
        var (_, sut, _) = BuildSutWithUser();

        var result = await sut.LoginAsync(new LoginRequest { Email = typed, Password = Password });

        result.Should().NotBeNull();
    }

    [Fact]
    public async Task LoginAsync_ForUnknownEmail_ReturnsNull()
    {
        var (_, sut, _) = BuildSutWithUser();

        var result = await sut.LoginAsync(new LoginRequest { Email = "unknown@labtracker.local", Password = Password });

        result.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_AfterTooManyFailures_RejectsEvenTheRightPassword()
    {
        var (_, sut, user) = BuildSutWithUser();
        for (var i = 0; i < LoginAttemptThrottle.MaxFailures; i++)
        {
            (await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "WrongPassword1!" })).Should().BeNull();
        }

        var act = () => sut.LoginAsync(new LoginRequest { Email = "Nadia@LabTracker.local", Password = Password });

        await act.Should().ThrowAsync<TooManyRequestsException>();
    }

    [Fact]
    public async Task LoginAsync_Success_ClearsEarlierFailures()
    {
        var (_, sut, user) = BuildSutWithUser();
        for (var i = 0; i < LoginAttemptThrottle.MaxFailures - 1; i++)
        {
            await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "WrongPassword1!" });
        }
        (await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = Password })).Should().NotBeNull();

        await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "WrongPassword1!" });

        (await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = Password })).Should().NotBeNull();
    }

    [Fact]
    public async Task GoogleLoginAsync_StillWorksWhilePasswordSignInIsLocked()
    {
        var (_, sut, user) = BuildSutWithUser();
        for (var i = 0; i < LoginAttemptThrottle.MaxFailures; i++)
        {
            await sut.LoginAsync(new LoginRequest { Email = user.Email, Password = "WrongPassword1!" });
        }

        var result = await sut.GoogleLoginAsync(new GoogleLoginRequest { Credential = StubGoogleTokenValidator.For(user.Email) });

        result.Should().NotBeNull();
    }

    [Theory]
    [InlineData("nadia@labtracker.local")]
    [InlineData("Nadia@LabTracker.local")]
    public async Task GoogleLoginAsync_ForAnActiveUsersVerifiedEmail_ReturnsToken(string googleEmail)
    {
        var (_, sut, user) = BuildSutWithUser();

        var result = await sut.GoogleLoginAsync(new GoogleLoginRequest { Credential = StubGoogleTokenValidator.For(googleEmail) });

        result.Should().NotBeNull();
        result!.Email.Should().Be(user.Email);
        result.Token.Should().Be(StubJwtTokenGenerator.FixedToken);
    }

    [Fact]
    public async Task GoogleLoginAsync_ForAnEmailWithNoAccount_ReturnsNull()
    {
        var (_, sut, _) = BuildSutWithUser();

        var result = await sut.GoogleLoginAsync(new GoogleLoginRequest { Credential = StubGoogleTokenValidator.For("stranger@gmail.com") });

        result.Should().BeNull();
    }

    [Fact]
    public async Task GoogleLoginAsync_ForAnInactiveUser_ReturnsNull()
    {
        var (_, sut, user) = BuildSutWithUser(isActive: false);

        var result = await sut.GoogleLoginAsync(new GoogleLoginRequest { Credential = StubGoogleTokenValidator.For(user.Email) });

        result.Should().BeNull();
    }

    [Fact]
    public async Task GoogleLoginAsync_WhenTheTokenIsRejected_ReturnsNull()
    {
        var (_, sut, _) = BuildSutWithUser();

        var result = await sut.GoogleLoginAsync(new GoogleLoginRequest { Credential = "forged-token" });

        result.Should().BeNull();
    }

    private class StubJwtTokenGenerator : IJwtTokenGenerator
    {
        public const string FixedToken = "stub-token";
        public string GenerateToken(User user) => FixedToken;
    }

    // "valid:<email>" stands for a verified Google token for that email.
    private class StubGoogleTokenValidator : IGoogleTokenValidator
    {
        private const string Prefix = "valid:";
        public static string For(string email) => Prefix + email;
        public bool IsEnabled => true;
        public Task<string?> ValidateAsync(string credential, CancellationToken cancellationToken = default)
            => Task.FromResult(credential.StartsWith(Prefix, StringComparison.Ordinal) ? credential[Prefix.Length..] : null);
    }
}
