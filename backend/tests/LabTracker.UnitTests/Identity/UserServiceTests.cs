using FluentAssertions;
using FluentValidation;
using LabTracker.Application.Modules.Identity;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using LabTracker.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;

namespace LabTracker.UnitTests.Identity;

public class UserServiceTests
{
    [Fact]
    public async Task CreateAsync_StoresEmailLowercasedAndTrimmed()
    {
        using var db = TestDbContextFactory.Create();
        var sut = new UserService(db, new PasswordHasher<User>(), new CreateUserRequestValidator(db), new UpdateUserLoginRequestValidator());

        var created = await sut.CreateAsync(new CreateUserRequest { Email = " New.Person@LabTracker.local ", Password = "Password123!", Role = Role.Researcher });

        created.Email.Should().Be("new.person@labtracker.local");
        db.Users.Single().Email.Should().Be("new.person@labtracker.local");
    }

    [Fact]
    public async Task CreateUserRequestValidator_RejectsEmailThatDiffersOnlyByCase()
    {
        using var db = TestDbContextFactory.Create();
        db.AddUser("taken@labtracker.local", Role.Researcher);

        var result = await new CreateUserRequestValidator(db).ValidateAsync(
            new CreateUserRequest { Email = "Taken@LabTracker.local", Password = "Password123!", Role = Role.Researcher });

        result.Errors.Should().ContainSingle(e => e.ErrorMessage == "A user with this email already exists.");
    }

    private static UserService Sut(LabTracker.Infrastructure.Persistence.LabTrackerDbContext db)
        => new(db, new PasswordHasher<User>(), new CreateUserRequestValidator(db), new UpdateUserLoginRequestValidator());

    [Fact]
    public async Task UpdateLoginAsync_ChangesEmailAndPassword()
    {
        using var db = TestDbContextFactory.Create();
        var user = db.AddUser("so1@mcb.placeholder.invalid", Role.ScienceOfficer, isActive: false);

        var updated = await Sut(db).UpdateLoginAsync(user.Id, new UpdateUserLoginRequest { Email = " Real.SO@Uni.ac.za ", Password = "NewPassword1!" });

        updated.Email.Should().Be("real.so@uni.ac.za");
        new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash, "NewPassword1!")
            .Should().Be(PasswordVerificationResult.Success);
    }

    [Fact]
    public async Task UpdateLoginAsync_WithoutPassword_KeepsTheExistingOne()
    {
        using var db = TestDbContextFactory.Create();
        var user = db.AddUser("so1@mcb.placeholder.invalid", Role.ScienceOfficer);
        var hashBefore = user.PasswordHash;

        await Sut(db).UpdateLoginAsync(user.Id, new UpdateUserLoginRequest { Email = "real.so@uni.ac.za" });

        user.PasswordHash.Should().Be(hashBefore);
    }

    [Fact]
    public async Task UpdateLoginAsync_ToAnotherUsersEmail_IsAConflict()
    {
        using var db = TestDbContextFactory.Create();
        db.AddUser("taken@labtracker.local", Role.Researcher);
        var user = db.AddUser("so1@mcb.placeholder.invalid", Role.ScienceOfficer);

        var act = () => Sut(db).UpdateLoginAsync(user.Id, new UpdateUserLoginRequest { Email = "Taken@LabTracker.local" });

        await act.Should().ThrowAsync<LabTracker.Shared.Exceptions.ConflictException>();
    }

    [Fact]
    public async Task UpdateLoginRequestValidator_RejectsShortPassword()
    {
        var result = await new UpdateUserLoginRequestValidator().ValidateAsync(
            new UpdateUserLoginRequest { Email = "a@b.co", Password = "short" });

        result.IsValid.Should().BeFalse();
    }
}
