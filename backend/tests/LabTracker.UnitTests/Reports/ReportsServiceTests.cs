using FluentAssertions;
using LabTracker.Application.Modules.Reports;
using LabTracker.Domain.Modules.Booking;
using LabTracker.Shared.Enums;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.Reports;

public class ReportsServiceTests
{
    private static UsageStatsFilter DefaultFilter() => new()
    {
        From = DateTime.UtcNow.AddDays(-30),
        To = DateTime.UtcNow.AddDays(1),
    };

    [Fact]
    public async Task GetEquipmentUsageStatsAsync_AttributesUsageToTheBookedEquipmentsRoomLab_NotToEveryLabTheResearcherBelongsTo()
    {
        var db = TestDbContextFactory.Create();
        var sut = new ReportsService(db);

        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var okaforLab = db.AddResearchGroup(department, pi, "Okafor Lab");
        var chenLab = db.AddResearchGroup(department, pi, "Chen Lab");

        // Nadia belongs to both labs, but the room she actually booked equipment
        // in is tied only to Okafor Lab.
        var room = db.AddRoom(department);
        room.ResearchGroupId = okaforLab.Id;
        db.SaveChanges();

        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);

        var nadia = new LabTracker.Domain.Modules.Organization.Researcher
        {
            FullName = "Nadia Petrov",
            StudentNumber = "STU1001",
            ResearchGroups = [okaforLab, chenLab],
        };
        db.Researchers.Add(nadia);
        db.SaveChanges();

        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = nadia.Id, DisplayNameSnapshot = nadia.FullName };
        db.UsageActors.Add(actor);
        db.SaveChanges();

        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var start = DateTime.UtcNow.AddHours(-2);
        db.UsageRecords.Add(new UsageRecord
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ActualStart = start,
            ActualEnd = start.AddHours(2),
            CreatedAt = start,
            RecordedByUserId = admin.Id,
        });
        db.SaveChanges();

        var result = await sut.GetEquipmentUsageStatsAsync(DefaultFilter());

        result.Should().ContainSingle();
        var row = result.Single();
        row.ResearchGroupId.Should().Be(okaforLab.Id);
        row.SessionCount.Should().Be(1);
        row.TotalHours.Should().Be(2);
    }

    [Fact]
    public async Task GetEquipmentUsageStatsAsync_ForInternalUsageInARoomWithNoLab_BucketsAsUnassigned()
    {
        var db = TestDbContextFactory.Create();
        var sut = new ReportsService(db);

        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department); // no ResearchGroupId set
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);

        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        db.SaveChanges();

        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var start = DateTime.UtcNow.AddHours(-1);
        db.UsageRecords.Add(new UsageRecord
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ActualStart = start,
            ActualEnd = start.AddHours(1),
            CreatedAt = start,
            RecordedByUserId = admin.Id,
        });
        db.SaveChanges();

        var result = await sut.GetEquipmentUsageStatsAsync(DefaultFilter());

        result.Should().ContainSingle();
        var row = result.Single();
        row.ResearchGroupId.Should().BeNull();
        row.ResearchGroupName.Should().Be("Unassigned");
    }

    [Fact]
    public async Task GetEquipmentUsageStatsAsync_ForExternalActor_BucketsAsExternal_EvenWhenRoomHasALab()
    {
        var db = TestDbContextFactory.Create();
        var sut = new ReportsService(db);

        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        room.ResearchGroupId = group.Id;
        db.SaveChanges();

        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var contact = db.AddExternalContact();

        var actor = new UsageActor { ActorType = ActorType.External, ExternalContactId = contact.Id, DisplayNameSnapshot = contact.FullName };
        db.UsageActors.Add(actor);
        db.SaveChanges();

        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var start = DateTime.UtcNow.AddHours(-1);
        db.UsageRecords.Add(new UsageRecord
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ActualStart = start,
            ActualEnd = start.AddHours(1),
            CreatedAt = start,
            RecordedByUserId = admin.Id,
        });
        db.SaveChanges();

        var result = await sut.GetEquipmentUsageStatsAsync(DefaultFilter());

        result.Should().ContainSingle();
        var row = result.Single();
        row.ResearchGroupId.Should().BeNull();
        row.ResearchGroupName.Should().Be("External");
    }

    [Fact]
    public async Task GetEquipmentUsageStatsAsync_PrefersTheEquipmentsOwnLabOverTheRoomsLab()
    {
        var db = TestDbContextFactory.Create();
        var sut = new ReportsService(db);

        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var roomLab = db.AddResearchGroup(department, pi, "Room Lab");
        var equipmentLab = db.AddResearchGroup(department, pi, "Plant Stress");

        var room = db.AddRoom(department);
        room.ResearchGroupId = roomLab.Id;
        var equipment = db.AddEquipment(room, db.AddEquipmentType(), department);
        equipment.ResearchGroupId = equipmentLab.Id;
        db.SaveChanges();

        var researcher = db.AddResearcher(roomLab);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        db.SaveChanges();

        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var start = DateTime.UtcNow.AddHours(-2);
        db.UsageRecords.Add(new UsageRecord
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ActualStart = start,
            ActualEnd = start.AddHours(1),
            CreatedAt = start,
            RecordedByUserId = admin.Id,
        });
        db.SaveChanges();

        var result = await sut.GetEquipmentUsageStatsAsync(DefaultFilter());

        result.Should().ContainSingle().Which.ResearchGroupName.Should().Be("Plant Stress");
    }
}
