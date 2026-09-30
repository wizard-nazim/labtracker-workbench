using FluentAssertions;
using LabTracker.Application.Modules.Identity;
using LabTracker.Application.Modules.Organization;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using Microsoft.AspNetCore.Identity;

namespace LabTracker.UnitTests.Identity;

public class AccountServiceTests
{
    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, AccountService Sut) BuildSut()
    {
        var db = TestDbContextFactory.Create();
        var researcherService = new ResearcherService(db, new UpsertResearcherRequestValidator(db));
        var piService = new PrincipalInvestigatorService(db, new UpsertPrincipalInvestigatorRequestValidator(db), new PasswordHasher<User>());
        return (db, new AccountService(db, researcherService, piService, new UpdateMeRequestValidator()));
    }

    [Fact]
    public async Task GetMeAsync_ForSuperAdminWithNoResearcherOrPiProfile_ReturnsNullProfiles()
    {
        var (db, sut) = BuildSut();
        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);

        var result = await sut.GetMeAsync(admin.Id);

        result.ResearcherProfile.Should().BeNull();
        result.PrincipalInvestigatorProfile.Should().BeNull();
        result.Role.Should().Be(nameof(Role.SuperAdmin));
    }

    [Fact]
    public async Task GetMeAsync_ForResearcher_AttachesResearcherProfile()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var user = db.AddUser("nadia@labtracker.local", Role.Researcher);
        db.AddResearcher(group, "Nadia Petrov", "STU1001", user.Id);

        var result = await sut.GetMeAsync(user.Id);

        result.ResearcherProfile.Should().NotBeNull();
        result.ResearcherProfile!.FullName.Should().Be("Nadia Petrov");
        result.PrincipalInvestigatorProfile.Should().BeNull();
    }

    [Fact]
    public async Task GetMeAsync_ForPrincipalInvestigatorWithNoResearcherProfile_AttachesOnlyPiProfile()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var piUser = db.AddUser("pi@labtracker.local", Role.PrincipalInvestigator);
        db.AddPrincipalInvestigator(department, "Dr. Amara Okafor", piUser.Id);

        var result = await sut.GetMeAsync(piUser.Id);

        result.PrincipalInvestigatorProfile.Should().NotBeNull();
        result.PrincipalInvestigatorProfile!.FullName.Should().Be("Dr. Amara Okafor");
        result.ResearcherProfile.Should().BeNull();
    }

    [Fact]
    public async Task GetMeAsync_ThrowsNotFound_ForUnknownUserId()
    {
        var (_, sut) = BuildSut();

        var act = () => sut.GetMeAsync(999);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task CompleteOnboardingAsync_SetsFlag()
    {
        var (db, sut) = BuildSut();
        var user = db.AddUser("nadia@labtracker.local", Role.Researcher);

        await sut.CompleteOnboardingAsync(user.Id);

        (await sut.GetMeAsync(user.Id)).HasCompletedOnboarding.Should().BeTrue();
    }

    [Fact]
    public async Task CompleteAdminTourAsync_SetsFlag()
    {
        var (db, sut) = BuildSut();
        var user = db.AddUser("admin@labtracker.local", Role.SuperAdmin);

        await sut.CompleteAdminTourAsync(user.Id);

        (await sut.GetMeAsync(user.Id)).HasCompletedAdminTour.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateMeAsync_SavesTrimmedPhone_AndNotificationPreference()
    {
        var (db, sut) = BuildSut();
        var user = db.AddUser("me@labtracker.local", Role.Researcher);

        var result = await sut.UpdateMeAsync(user.Id, new UpdateMeRequest { Phone = "  +27 21 650 1234 ", NotifyOnEquipmentChanges = false });

        result.Phone.Should().Be("+27 21 650 1234");
        result.NotifyOnEquipmentChanges.Should().BeFalse();
        db.Users.Single(u => u.Id == user.Id).Phone.Should().Be("+27 21 650 1234");
    }

    [Fact]
    public async Task UpdateMeAsync_StoresBlankPhoneAsNull()
    {
        var (db, sut) = BuildSut();
        var user = db.AddUser("me@labtracker.local", Role.Researcher);
        user.Phone = "021 650 1234";
        db.SaveChanges();

        var result = await sut.UpdateMeAsync(user.Id, new UpdateMeRequest { Phone = "   " });

        result.Phone.Should().BeNull();
    }

    [Theory]
    [InlineData("call me maybe")]
    [InlineData("+27 21 650 1234 5678 9012 3456 7890")]
    public async Task UpdateMeAsync_RejectsInvalidPhone(string phone)
    {
        var (db, sut) = BuildSut();
        var user = db.AddUser("me@labtracker.local", Role.Researcher);

        await sut.Invoking(s => s.UpdateMeAsync(user.Id, new UpdateMeRequest { Phone = phone })).Should().ThrowAsync<FluentValidation.ValidationException>();
    }
}
