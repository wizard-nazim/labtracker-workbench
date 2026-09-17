using FluentAssertions;
using LabTracker.Application.Modules.Organization;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.Organization;

public class ResearcherServiceTests
{
    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, ResearcherService Sut) BuildSut()
    {
        var db = TestDbContextFactory.Create();
        return (db, new ResearcherService(db, new UpsertResearcherRequestValidator(db)));
    }

    [Fact]
    public async Task CreateAsync_LinksToMultipleResearchGroups()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var groupA = db.AddResearchGroup(department, pi, "Plant Stress");
        var groupB = db.AddResearchGroup(department, pi, "Speedy");

        var result = await sut.CreateAsync(new UpsertResearcherRequest
        {
            FullName = "Nadia Petrov",
            StudentNumber = "STU1001",
            ResearchGroupIds = [groupA.Id, groupB.Id],
        });

        result.ResearchGroupIds.Should().BeEquivalentTo([groupA.Id, groupB.Id]);
    }

    [Fact]
    public async Task CreateAsync_RejectsEmptyResearchGroupList()
    {
        var (_, sut) = BuildSut();

        var act = () => sut.CreateAsync(new UpsertResearcherRequest { FullName = "Nadia Petrov", StudentNumber = "STU1001", ResearchGroupIds = [] });

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_RejectsSuperAdminAsLinkedUser()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var superAdmin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);

        var request = new UpsertResearcherRequest
        {
            FullName = "Nadia Petrov",
            StudentNumber = "STU1001",
            ResearchGroupIds = [group.Id],
            UserId = superAdmin.Id,
        };

        var act = () => sut.CreateAsync(request);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Theory]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.PrincipalInvestigator)]
    [InlineData(Role.Researcher)]
    public async Task CreateAsync_AllowsNonSuperAdminRolesAsLinkedUser(Role role)
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var user = db.AddUser($"{role}@labtracker.local", role);

        var request = new UpsertResearcherRequest
        {
            FullName = "Nadia Petrov",
            StudentNumber = "STU1001",
            ResearchGroupIds = [group.Id],
            UserId = user.Id,
        };

        var result = await sut.CreateAsync(request);

        result.UserId.Should().Be(user.Id);
    }

    [Fact]
    public async Task UpdateAsync_ReplacesResearchGroupMembership()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var groupA = db.AddResearchGroup(department, pi, "Plant Stress");
        var groupB = db.AddResearchGroup(department, pi, "Speedy");

        var created = await sut.CreateAsync(new UpsertResearcherRequest { FullName = "Nadia Petrov", StudentNumber = "STU1001", ResearchGroupIds = [groupA.Id] });

        var updated = await sut.UpdateAsync(created.Id, new UpsertResearcherRequest { FullName = "Nadia Petrov", StudentNumber = "STU1001", ResearchGroupIds = [groupB.Id] });

        updated.ResearchGroupIds.Should().ContainSingle().Which.Should().Be(groupB.Id);
    }

    [Fact]
    public async Task GetByUserIdAsync_ReturnsNull_WhenUserHasNoResearcherProfile()
    {
        var (db, sut) = BuildSut();
        var user = db.AddUser("nobody@labtracker.local", Role.SuperAdmin);

        var result = await sut.GetByUserIdAsync(user.Id);

        result.Should().BeNull();
    }
}
