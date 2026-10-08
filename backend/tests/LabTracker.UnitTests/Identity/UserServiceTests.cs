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
        var sut = new UserService(db, new PasswordHasher<User>(), new CreateUserRequestValidator(db));

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
}
