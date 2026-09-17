using FluentAssertions;
using LabTracker.Application.Modules.Organization;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;

namespace LabTracker.UnitTests.Organization;

public class PrincipalInvestigatorServiceTests
{
    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, PrincipalInvestigatorService Sut) BuildSut()
    {
        var db = TestDbContextFactory.Create();
        var hasher = new PasswordHasher<User>();
        return (db, new PrincipalInvestigatorService(db, new UpsertPrincipalInvestigatorRequestValidator(db), hasher));
    }

    [Fact]
    public async Task CreateAsync_WithoutPassword_DoesNotProvisionALogin()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();

        var result = await sut.CreateAsync(new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "a.okafor@labtracker.local",
            DepartmentId = department.Id,
        });

        result.HasLogin.Should().BeFalse();
        result.UserId.Should().BeNull();
        db.Users.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateAsync_WithPassword_ProvisionsALinkedLoginWithPrincipalInvestigatorRole()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();

        var result = await sut.CreateAsync(new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "a.okafor@labtracker.local",
            DepartmentId = department.Id,
            Password = "SecurePass123!",
        });

        result.HasLogin.Should().BeTrue();
        result.UserId.Should().NotBeNull();
        var user = db.Users.Single(u => u.Id == result.UserId);
        user.Email.Should().Be("a.okafor@labtracker.local");
        user.Role.Should().Be(Role.PrincipalInvestigator);
    }

    [Fact]
    public async Task CreateAsync_WithPassword_RejectsEmailAlreadyUsedByAnotherUser()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        db.AddUser("taken@labtracker.local", Role.Researcher);

        var request = new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "taken@labtracker.local",
            DepartmentId = department.Id,
            Password = "SecurePass123!",
        };

        var act = () => sut.CreateAsync(request);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_RejectsShortPassword()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();

        var request = new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "a.okafor@labtracker.local",
            DepartmentId = department.Id,
            Password = "short",
        };

        var act = () => sut.CreateAsync(request);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task GetByIdAsync_ThrowsNotFound_ForUnknownId()
    {
        var (_, sut) = BuildSut();

        var act = () => sut.GetByIdAsync(999);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateAsync_WhenPiHasALogin_KeepsTheLoginEmailInSyncWithTheProfileEmail()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var created = await sut.CreateAsync(new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "a.okafor@labtracker.local",
            DepartmentId = department.Id,
            Password = "SecurePass123!",
        });

        var updated = await sut.UpdateAsync(created.Id, new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "a.okafor-new@labtracker.local",
            DepartmentId = department.Id,
        });

        updated.Email.Should().Be("a.okafor-new@labtracker.local");
        var user = db.Users.Single(u => u.Id == updated.UserId);
        user.Email.Should().Be("a.okafor-new@labtracker.local");
    }

    [Fact]
    public async Task UpdateAsync_WhenPiHasALogin_RejectsEmailAlreadyUsedByAnotherUser()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        db.AddUser("taken@labtracker.local", Role.Researcher);
        var created = await sut.CreateAsync(new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "a.okafor@labtracker.local",
            DepartmentId = department.Id,
            Password = "SecurePass123!",
        });

        var act = () => sut.UpdateAsync(created.Id, new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "taken@labtracker.local",
            DepartmentId = department.Id,
        });

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task UpdateAsync_WhenPiHasNoLogin_DoesNotRequireEmailUniqueness()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        db.AddUser("taken@labtracker.local", Role.Researcher);
        var created = await sut.CreateAsync(new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "a.okafor@labtracker.local",
            DepartmentId = department.Id,
        });

        var updated = await sut.UpdateAsync(created.Id, new UpsertPrincipalInvestigatorRequest
        {
            FullName = "Dr. Amara Okafor",
            Email = "taken@labtracker.local",
            DepartmentId = department.Id,
        });

        updated.Email.Should().Be("taken@labtracker.local");
    }
}
