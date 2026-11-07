using FluentAssertions;
using FluentValidation;
using LabTracker.Application.Modules.Identity;
using LabTracker.Application.Modules.Notifications;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.UnitTests.Identity;

public class PasswordServiceTests
{
    private const string Password = "CurrentPass1!";
    private readonly PasswordHasher<User> hasher = new();

    private (LabTrackerDbContext Db, PasswordService Sut) Build()
    {
        var db = TestDbContextFactory.Create();
        var sut = new PasswordService(
            db, hasher, new StubJwtTokenGenerator(), new LoginAttemptThrottle(TimeProvider.System),
            new NotificationService(db), new ChangePasswordRequestValidator(), new AssignPasswordRequestValidator());
        return (db, sut);
    }

    private User AddUser(LabTrackerDbContext db, string email, Role role, bool mustChange = false, bool isActive = true)
    {
        var user = new User { Email = email, Role = role, IsActive = isActive, CreatedAt = DateTime.UtcNow, MustChangePassword = mustChange };
        user.PasswordHash = hasher.HashPassword(user, Password);
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task ChangeOwnPassword_WithWrongCurrentPassword_IsRejected()
    {
        var (db, sut) = Build();
        var user = AddUser(db, "nadia@labtracker.local", Role.Researcher);

        var act = () => sut.ChangeOwnPasswordAsync(user.Id, new ChangePasswordRequest { CurrentPassword = "Nope12345!", NewPassword = "BrandNew123!" });

        await act.Should().ThrowAsync<ValidationException>().WithMessage("*current password is incorrect*");
        hasher.VerifyHashedPassword(user, user.PasswordHash, Password).Should().NotBe(PasswordVerificationResult.Failed);
    }

    [Fact]
    public async Task ChangeOwnPassword_SetsNewPassword_BumpsVersion_AndNotifiesOtherAdmins()
    {
        var (db, sut) = Build();
        var admin = AddUser(db, "admin@labtracker.local", Role.SuperAdmin);
        AddUser(db, "gone@labtracker.local", Role.SuperAdmin, isActive: false);
        var user = AddUser(db, "nadia@labtracker.local", Role.Researcher);

        var result = await sut.ChangeOwnPasswordAsync(user.Id, new ChangePasswordRequest { CurrentPassword = Password, NewPassword = "BrandNew123!" });

        result.Token.Should().Be(StubJwtTokenGenerator.FixedToken);
        result.MustChangePassword.Should().BeFalse();
        hasher.VerifyHashedPassword(user, user.PasswordHash, "BrandNew123!").Should().NotBe(PasswordVerificationResult.Failed);
        user.SecurityVersion.Should().Be(1);
        user.PasswordChangedAt.Should().NotBeNull();

        var notifications = await db.Notifications.ToListAsync();
        notifications.Should().ContainSingle().Which.UserId.Should().Be(admin.Id);
        notifications[0].Type.Should().Be(NotificationType.PasswordChanged);
        notifications[0].Body.Should().Contain("nadia@labtracker.local").And.NotContain("BrandNew123!");
    }

    [Fact]
    public async Task ChangeOwnPassword_ReplacingATemporaryPassword_ClearsFlag_WithoutNotifying()
    {
        var (db, sut) = Build();
        AddUser(db, "admin@labtracker.local", Role.SuperAdmin);
        var user = AddUser(db, "nadia@labtracker.local", Role.Researcher, mustChange: true);

        await sut.ChangeOwnPasswordAsync(user.Id, new ChangePasswordRequest { CurrentPassword = Password, NewPassword = "BrandNew123!" });

        user.MustChangePassword.Should().BeFalse();
        (await db.Notifications.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task ChangeOwnPassword_ToTheSamePassword_IsRejected()
    {
        var (db, sut) = Build();
        var user = AddUser(db, "nadia@labtracker.local", Role.Researcher);

        var act = () => sut.ChangeOwnPasswordAsync(user.Id, new ChangePasswordRequest { CurrentPassword = Password, NewPassword = Password });

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task ChangeOwnPassword_AfterTooManyWrongAttempts_IsThrottled()
    {
        var (db, sut) = Build();
        var user = AddUser(db, "nadia@labtracker.local", Role.Researcher);
        var wrong = new ChangePasswordRequest { CurrentPassword = "Wrong12345!", NewPassword = "BrandNew123!" };
        for (var i = 0; i < LoginAttemptThrottle.MaxAttempts; i++)
        {
            await FluentActions.Awaiting(() => sut.ChangeOwnPasswordAsync(user.Id, wrong)).Should().ThrowAsync<ValidationException>();
        }

        await FluentActions.Awaiting(() => sut.ChangeOwnPasswordAsync(user.Id, wrong)).Should().ThrowAsync<TooManyRequestsException>();
    }

    [Fact]
    public async Task RequestReset_ForUnknownOrInactiveEmail_CreatesNothing()
    {
        var (db, sut) = Build();
        AddUser(db, "gone@labtracker.local", Role.Researcher, isActive: false);

        await sut.RequestResetAsync(new ForgotPasswordRequest { Email = "nobody@labtracker.local" });
        await sut.RequestResetAsync(new ForgotPasswordRequest { Email = "gone@labtracker.local" });

        (await db.PasswordResetRequests.AnyAsync()).Should().BeFalse();
        (await db.Notifications.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task RequestReset_CreatesOnePendingRequest_AndNotifiesAdmins()
    {
        var (db, sut) = Build();
        var admin = AddUser(db, "admin@labtracker.local", Role.SuperAdmin);
        AddUser(db, "nadia@labtracker.local", Role.Researcher);

        await sut.RequestResetAsync(new ForgotPasswordRequest { Email = " Nadia@LabTracker.local " });
        await sut.RequestResetAsync(new ForgotPasswordRequest { Email = "nadia@labtracker.local" });

        (await db.PasswordResetRequests.CountAsync()).Should().Be(1);
        var notification = await db.Notifications.SingleAsync();
        notification.UserId.Should().Be(admin.Id);
        notification.Type.Should().Be(NotificationType.PasswordResetRequested);
    }

    [Fact]
    public async Task Resolve_SetsATemporaryPassword_AndClosesTheRequest()
    {
        var (db, sut) = Build();
        var admin = AddUser(db, "admin@labtracker.local", Role.SuperAdmin);
        var user = AddUser(db, "nadia@labtracker.local", Role.Researcher);
        await sut.RequestResetAsync(new ForgotPasswordRequest { Email = user.Email });
        var request = await db.PasswordResetRequests.SingleAsync();

        await sut.ResolveAsync(request.Id, new AssignPasswordRequest { NewPassword = "Temporary123!" }, admin.Id);

        hasher.VerifyHashedPassword(user, user.PasswordHash, "Temporary123!").Should().NotBe(PasswordVerificationResult.Failed);
        user.MustChangePassword.Should().BeTrue();
        user.SecurityVersion.Should().Be(1);
        request.Status.Should().Be(PasswordResetStatus.Completed);
        request.ResolvedByUserId.Should().Be(admin.Id);

        var history = await sut.GetRequestsAsync(status: null);
        history.Should().ContainSingle().Which.ResolvedByEmail.Should().Be(admin.Email);
        (await sut.CountPendingAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Dismiss_ThenResolve_IsRejected()
    {
        var (db, sut) = Build();
        var admin = AddUser(db, "admin@labtracker.local", Role.SuperAdmin);
        var user = AddUser(db, "nadia@labtracker.local", Role.Researcher);
        await sut.RequestResetAsync(new ForgotPasswordRequest { Email = user.Email });
        var request = await db.PasswordResetRequests.SingleAsync();

        await sut.DismissAsync(request.Id, admin.Id);
        var act = () => sut.ResolveAsync(request.Id, new AssignPasswordRequest { NewPassword = "Temporary123!" }, admin.Id);

        await act.Should().ThrowAsync<ValidationException>();
        user.MustChangePassword.Should().BeFalse();
    }

    private class StubJwtTokenGenerator : IJwtTokenGenerator
    {
        public const string FixedToken = "stub-token";
        public string GenerateToken(User user) => FixedToken;
    }
}
