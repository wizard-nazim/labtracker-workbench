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
        var created = await Sut(db).CreateAsync(new CreateUserRequest { Email = " New.Person@LabTracker.local ", Password = "Password123!", Role = Role.Researcher });

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
        => new(db, new PasswordHasher<User>(), new CreateUserRequestValidator(db), new CreateAccountRequestValidator(db), new UpdateUserLoginRequestValidator());

    private const int AdminId = 999;

    [Fact]
    public async Task UpdateLoginAsync_ChangesEmailAndPassword()
    {
        using var db = TestDbContextFactory.Create();
        var user = db.AddUser("so1@mcb.placeholder.invalid", Role.ScienceOfficer, isActive: false);

        var updated = await Sut(db).UpdateLoginAsync(user.Id, new UpdateUserLoginRequest { Email = " Real.SO@Uni.ac.za ", Password = "NewPassword1!" }, AdminId);

        updated.Email.Should().Be("real.so@uni.ac.za");
        updated.MustChangePassword.Should().BeTrue();
        user.SecurityVersion.Should().Be(1);
        new PasswordHasher<User>().VerifyHashedPassword(user, user.PasswordHash, "NewPassword1!")
            .Should().Be(PasswordVerificationResult.Success);
    }

    [Fact]
    public async Task UpdateLoginAsync_WithoutPassword_KeepsTheExistingOne()
    {
        using var db = TestDbContextFactory.Create();
        var user = db.AddUser("so1@mcb.placeholder.invalid", Role.ScienceOfficer);
        var hashBefore = user.PasswordHash;

        await Sut(db).UpdateLoginAsync(user.Id, new UpdateUserLoginRequest { Email = "real.so@uni.ac.za" }, AdminId);

        user.PasswordHash.Should().Be(hashBefore);
        user.MustChangePassword.Should().BeFalse();
    }

    [Fact]
    public async Task UpdateLoginAsync_OnOwnLogin_DoesNotForceAChange()
    {
        using var db = TestDbContextFactory.Create();
        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);

        await Sut(db).UpdateLoginAsync(admin.Id, new UpdateUserLoginRequest { Email = admin.Email, Password = "NewPassword1!" }, admin.Id);

        admin.MustChangePassword.Should().BeFalse();
    }

    [Fact]
    public async Task CreateAsync_RequiresAPasswordChangeAtFirstSignIn()
    {
        using var db = TestDbContextFactory.Create();

        var created = await Sut(db).CreateAsync(new CreateUserRequest { Email = "a@labtracker.local", Password = "Password123!", Role = Role.ScienceOfficer });

        created.MustChangePassword.Should().BeTrue();
    }

    [Fact]
    public async Task CreateAccountAsync_Student_CreatesLoginAndLinkedProfile()
    {
        using var db = TestDbContextFactory.Create();
        var dept = db.AddDepartment();
        var lab = db.AddResearchGroup(dept, db.AddPrincipalInvestigator(dept));

        var created = await Sut(db).CreateAccountAsync(new CreateAccountRequest
        {
            Email = " New.Student@Uni.ac.za ", Password = "Password123!", Role = Role.Researcher,
            FullName = " Thandi Mokoena ", StudentNumber = "MKNTHA001", FieldOfStudy = FieldOfStudy.PhD, ResearchGroupIds = [lab.Id],
        });

        created.Email.Should().Be("new.student@uni.ac.za");
        created.MustChangePassword.Should().BeTrue();
        var profile = db.Researchers.Single(r => r.UserId == created.Id);
        profile.FullName.Should().Be("Thandi Mokoena");
        profile.StudentNumber.Should().Be("MKNTHA001");
        profile.ResearchGroups.Should().ContainSingle(g => g.Id == lab.Id);
    }

    [Fact]
    public async Task CreateAccountAsync_ScienceOfficer_NeedsOnlyAName()
    {
        using var db = TestDbContextFactory.Create();

        var created = await Sut(db).CreateAccountAsync(new CreateAccountRequest
        {
            Email = "so2@uni.ac.za", Password = "Password123!", Role = Role.ScienceOfficer, FullName = "Pat Officer",
        });

        created.Role.Should().Be(Role.ScienceOfficer);
        db.Researchers.Single(r => r.UserId == created.Id).StudentNumber.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateAccountAsync_StudentWithoutLab_CreatesNothing()
    {
        using var db = TestDbContextFactory.Create();

        var act = () => Sut(db).CreateAccountAsync(new CreateAccountRequest
        {
            Email = "s@uni.ac.za", Password = "Password123!", Role = Role.Researcher, FullName = "No Lab", StudentNumber = "X1",
        });

        await act.Should().ThrowAsync<ValidationException>();
        db.Users.Should().BeEmpty();
        db.Researchers.Should().BeEmpty();
    }

    [Theory]
    [InlineData(Role.SuperAdmin)]
    [InlineData(Role.PrincipalInvestigator)]
    public async Task CreateAccountRequestValidator_RejectsRolesWithoutAResearcherProfile(Role role)
    {
        using var db = TestDbContextFactory.Create();

        var result = await new CreateAccountRequestValidator(db).ValidateAsync(new CreateAccountRequest
        {
            Email = "x@uni.ac.za", Password = "Password123!", Role = role, FullName = "Someone",
        });

        result.Errors.Should().Contain(e => e.PropertyName == nameof(CreateAccountRequest.Role));
    }

    [Fact]
    public async Task UpdateLoginAsync_ToAnotherUsersEmail_IsAConflict()
    {
        using var db = TestDbContextFactory.Create();
        db.AddUser("taken@labtracker.local", Role.Researcher);
        var user = db.AddUser("so1@mcb.placeholder.invalid", Role.ScienceOfficer);

        var act = () => Sut(db).UpdateLoginAsync(user.Id, new UpdateUserLoginRequest { Email = "Taken@LabTracker.local" }, AdminId);

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
