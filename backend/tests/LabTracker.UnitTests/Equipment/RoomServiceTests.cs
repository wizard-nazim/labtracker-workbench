using FluentAssertions;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Application.Modules.Organization;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.Equipment;

public class RoomServiceTests
{
    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, RoomService Sut) BuildSut()
    {
        var db = TestDbContextFactory.Create();
        return (db, new RoomService(db, new UpsertRoomRequestValidator(db)));
    }

    private static LabTracker.Domain.Modules.Organization.Facility AddFacility(LabTracker.Infrastructure.Persistence.LabTrackerDbContext db, LabTracker.Domain.Modules.Organization.Department department, string name = "BSL2 - Mammalian")
    {
        var facility = new LabTracker.Domain.Modules.Organization.Facility { Name = name, DepartmentId = department.Id };
        db.Facilities.Add(facility);
        db.SaveChanges();
        return facility;
    }

    [Fact]
    public async Task CreateAsync_WithFacilityId_LinksTheRoomToTheFacility()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var facility = AddFacility(db, department);

        var result = await sut.CreateAsync(new UpsertRoomRequest
        {
            Building = "Science Building",
            Floor = "4",
            RoomNumber = "432.2",
            FacilityId = facility.Id,
        });

        result.FacilityId.Should().Be(facility.Id);
        result.FacilityName.Should().Be(facility.Name);
    }

    [Fact]
    public async Task CreateAsync_RejectsUnknownFacilityId()
    {
        var (_, sut) = BuildSut();

        var act = () => sut.CreateAsync(new UpsertRoomRequest { Building = "X", Floor = "1", RoomNumber = "1", FacilityId = 999 });

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task UpdateAsync_CanChangeTheRoomsFacility()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var facilityA = AddFacility(db, department, "BSL2 - Mammalian");
        var facilityB = AddFacility(db, department, "Plant Growth Rooms");

        var created = await sut.CreateAsync(new UpsertRoomRequest { Building = "X", Floor = "1", RoomNumber = "1", FacilityId = facilityA.Id });

        var updated = await sut.UpdateAsync(created.Id, new UpsertRoomRequest { Building = "X", Floor = "1", RoomNumber = "1", FacilityId = facilityB.Id });

        updated.FacilityId.Should().Be(facilityB.Id);
        updated.FacilityName.Should().Be("Plant Growth Rooms");
    }

    [Fact]
    public async Task CreateAsync_RejectsACaseOrWhitespaceVariantOfAnExistingRoom()
    {
        var (_, sut) = BuildSut();
        await sut.CreateAsync(new UpsertRoomRequest { Building = "MCB Building", Floor = "4th Floor", RoomNumber = "432.2" });

        var act = () => sut.CreateAsync(new UpsertRoomRequest { Building = " mcb building ", Floor = "4TH FLOOR", RoomNumber = "432.2 " });

        await act.Should().ThrowAsync<LabTracker.Shared.Exceptions.ConflictException>();
    }

    [Fact]
    public async Task CreateAsync_TrimsStoredValues()
    {
        var (_, sut) = BuildSut();

        var result = await sut.CreateAsync(new UpsertRoomRequest { Building = "  MCB Building ", Floor = " 4th Floor", RoomNumber = "216A " });

        result.Building.Should().Be("MCB Building");
        result.Floor.Should().Be("4th Floor");
        result.RoomNumber.Should().Be("216A");
    }

    [Fact]
    public async Task UpdateAsync_AllowsKeepingItsOwnValues_ButNotTakingAnotherRooms()
    {
        var (_, sut) = BuildSut();
        var first = await sut.CreateAsync(new UpsertRoomRequest { Building = "X", Floor = "1", RoomNumber = "101" });
        var second = await sut.CreateAsync(new UpsertRoomRequest { Building = "X", Floor = "1", RoomNumber = "102" });

        var kept = await sut.UpdateAsync(first.Id, new UpsertRoomRequest { Building = "x", Floor = "1", RoomNumber = "101" });
        var clash = () => sut.UpdateAsync(second.Id, new UpsertRoomRequest { Building = "X", Floor = "1", RoomNumber = "101" });

        kept.Building.Should().Be("x");
        await clash.Should().ThrowAsync<LabTracker.Shared.Exceptions.ConflictException>();
    }

    [Fact]
    public async Task DeleteAsync_InUse_IsRefusedWithTheCount()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        db.AddEquipment(room, type, department);

        var act = () => sut.DeleteAsync(room.Id);

        (await act.Should().ThrowAsync<LabTracker.Shared.Exceptions.ConflictException>()).WithMessage("In use by 1 equipment.");
    }

    [Fact]
    public async Task DeleteAsync_Unused_RemovesIt()
    {
        var (db, sut) = BuildSut();
        var room = db.AddRoom();

        await sut.DeleteAsync(room.Id);

        db.Rooms.Should().BeEmpty();
    }
}
