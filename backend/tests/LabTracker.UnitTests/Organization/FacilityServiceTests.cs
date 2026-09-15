using FluentAssertions;
using LabTracker.Application.Modules.Organization;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.Organization;

public class FacilityServiceTests
{
    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, FacilityService Sut) BuildSut()
    {
        var db = TestDbContextFactory.Create();
        return (db, new FacilityService(db, new UpsertFacilityRequestValidator(db)));
    }

    [Fact]
    public async Task CreateAsync_PersistsFacilityWithOverseers()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var overseer = db.AddUser("so@labtracker.local", Role.ScienceOfficer);

        var request = new UpsertFacilityRequest { Name = "Imaging Core", DepartmentId = department.Id, OverseerUserIds = [overseer.Id] };
        var result = await sut.CreateAsync(request);

        result.Name.Should().Be("Imaging Core");
        result.DepartmentName.Should().Be(department.Name);
        result.OverseerUserIds.Should().ContainSingle().Which.Should().Be(overseer.Id);
        result.OverseerEmails.Should().ContainSingle().Which.Should().Be(overseer.Email);
    }

    [Fact]
    public async Task CreateAsync_RejectsOverseerThatIsNotAScienceOfficer()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var notAnOverseer = db.AddUser("researcher@labtracker.local", Role.Researcher);

        var request = new UpsertFacilityRequest { Name = "Imaging Core", DepartmentId = department.Id, OverseerUserIds = [notAnOverseer.Id] };
        var act = () => sut.CreateAsync(request);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_RejectsUnknownDepartmentId()
    {
        var (_, sut) = BuildSut();
        var request = new UpsertFacilityRequest { Name = "Imaging Core", DepartmentId = 999 };

        var act = () => sut.CreateAsync(request);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task UpdateAsync_ReplacesOverseerSet()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var firstOverseer = db.AddUser("first@labtracker.local", Role.ScienceOfficer);
        var secondOverseer = db.AddUser("second@labtracker.local", Role.ScienceOfficer);

        var created = await sut.CreateAsync(new UpsertFacilityRequest { Name = "Imaging Core", DepartmentId = department.Id, OverseerUserIds = [firstOverseer.Id] });

        var updated = await sut.UpdateAsync(created.Id, new UpsertFacilityRequest { Name = "Imaging Core", DepartmentId = department.Id, OverseerUserIds = [secondOverseer.Id] });

        updated.OverseerUserIds.Should().ContainSingle().Which.Should().Be(secondOverseer.Id);
    }

    [Fact]
    public async Task GetByIdAsync_ThrowsNotFound_ForUnknownId()
    {
        var (_, sut) = BuildSut();

        var act = () => sut.GetByIdAsync(999);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task UpdateAsync_ThrowsNotFound_ForUnknownId()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();

        var act = () => sut.UpdateAsync(999, new UpsertFacilityRequest { Name = "X", DepartmentId = department.Id });

        await act.Should().ThrowAsync<NotFoundException>();
    }
}
