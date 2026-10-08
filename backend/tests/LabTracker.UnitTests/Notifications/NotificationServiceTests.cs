using FluentAssertions;
using FluentValidation;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Application.Modules.Notifications;
using LabTracker.Domain.Modules.Notifications;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.UnitTests.Notifications;

public class NotificationServiceTests
{
    // Validators are pass-throughs: these tests are about who gets notified, not input validation.
    private static EquipmentService NewEquipmentService(LabTrackerDbContext db)
        => new(db, new InlineValidator<UpsertEquipmentRequest>(), new InlineValidator<AssignScienceOfficerRequest>(), new NotificationService(db));

    private static EquipmentEntity SeedEquipment(LabTrackerDbContext db, string? description = "Works fine")
    {
        var department = db.AddDepartment();
        var equipment = db.AddEquipment(db.AddRoom(department), db.AddEquipmentType(), department);
        equipment.Description = description;
        db.SaveChanges();
        return equipment;
    }

    private static UpsertEquipmentRequest RequestFor(EquipmentEntity e, string? description) => new()
    {
        Name = e.Name,
        SerialNumber = e.SerialNumber,
        Description = description,
        IsShared = e.IsShared,
        EquipmentTypeId = e.EquipmentTypeId,
        RoomId = e.RoomId,
        OwningDepartmentId = e.OwningDepartmentId,
    };

    [Fact]
    public async Task UpdateAsync_BroadcastsNoteChange_ToActiveOptedInUsers_ExceptTheEditor()
    {
        using var db = TestDbContextFactory.Create();
        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var optedIn = db.AddUser("in@labtracker.local", Role.Researcher);
        var optedOut = db.AddUser("out@labtracker.local", Role.Researcher);
        optedOut.NotifyOnEquipmentChanges = false;
        db.AddUser("inactive@labtracker.local", Role.Researcher, isActive: false);
        var equipment = SeedEquipment(db);

        await NewEquipmentService(db).UpdateAsync(equipment.Id, RequestFor(equipment, "Broken, being repaired"), admin.Id, Role.SuperAdmin);

        var notifications = db.Notifications.ToList();
        notifications.Should().ContainSingle();
        notifications[0].UserId.Should().Be(optedIn.Id);
        notifications[0].Type.Should().Be(NotificationType.EquipmentUpdated);
        notifications[0].EquipmentId.Should().Be(equipment.Id);
        notifications[0].Body.Should().Be("Broken, being repaired");
    }

    [Theory]
    [InlineData("Works fine")]
    [InlineData("  Works fine  ")]
    public async Task UpdateAsync_DoesNotBroadcast_WhenNoteIsUnchanged(string description)
    {
        using var db = TestDbContextFactory.Create();
        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        db.AddUser("in@labtracker.local", Role.Researcher);
        var equipment = SeedEquipment(db);

        await NewEquipmentService(db).UpdateAsync(equipment.Id, RequestFor(equipment, description), admin.Id, Role.SuperAdmin);

        db.Notifications.Should().BeEmpty();
    }

    [Theory]
    [InlineData(EquipmentStatus.Available, EquipmentStatus.Faulty, 1)]
    [InlineData(EquipmentStatus.UnderMaintenance, EquipmentStatus.Available, 1)]
    [InlineData(EquipmentStatus.Faulty, EquipmentStatus.UnderMaintenance, 0)]
    [InlineData(EquipmentStatus.Available, EquipmentStatus.Available, 0)]
    public async Task UpdateStatusAsync_Broadcasts_OnlyWhenGoingOutOfOrBackIntoService(EquipmentStatus from, EquipmentStatus to, int expected)
    {
        using var db = TestDbContextFactory.Create();
        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        db.AddUser("in@labtracker.local", Role.Researcher);
        var equipment = SeedEquipment(db);
        equipment.Status = from;
        db.SaveChanges();

        await NewEquipmentService(db).UpdateStatusAsync(equipment.Id, to, admin.Id, Role.SuperAdmin);

        db.Notifications.Should().HaveCount(expected);
    }

    // Equipment names can be 200 chars and so can the Title column, so the
    // suffix would overflow it and fail the whole equipment save on Postgres.
    [Fact]
    public async Task UpdateStatusAsync_ClampsTitle_ForMaxLengthEquipmentName()
    {
        using var db = TestDbContextFactory.Create();
        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        db.AddUser("in@labtracker.local", Role.Researcher);
        var equipment = SeedEquipment(db);
        equipment.Name = new string('x', 200);
        db.SaveChanges();

        await NewEquipmentService(db).UpdateStatusAsync(equipment.Id, EquipmentStatus.UnderMaintenance, admin.Id, Role.SuperAdmin);

        var title = db.Notifications.Single().Title;
        title.Should().HaveLength(200);
        title.Should().EndWith("…");
    }

    [Fact]
    public async Task GetMineAsync_ReturnsOnlyTheUsersOwn_NewestFirst_AndFiltersUnread()
    {
        using var db = TestDbContextFactory.Create();
        var me = db.AddUser("me@labtracker.local", Role.Researcher);
        var other = db.AddUser("other@labtracker.local", Role.Researcher);
        var now = DateTime.UtcNow;
        db.Notifications.AddRange(
            new Notification { UserId = me.Id, Title = "old", Body = "b", CreatedAt = now.AddHours(-2), ReadAt = now },
            new Notification { UserId = me.Id, Title = "new", Body = "b", CreatedAt = now },
            new Notification { UserId = other.Id, Title = "theirs", Body = "b", CreatedAt = now });
        db.SaveChanges();
        var sut = new NotificationService(db);

        (await sut.GetMineAsync(me.Id, unreadOnly: false)).Select(n => n.Title).Should().Equal("new", "old");
        (await sut.GetMineAsync(me.Id, unreadOnly: true)).Select(n => n.Title).Should().Equal("new");
    }

    [Fact]
    public async Task MarkReadAsync_ThrowsNotFound_ForSomeoneElsesNotification()
    {
        using var db = TestDbContextFactory.Create();
        var me = db.AddUser("me@labtracker.local", Role.Researcher);
        var other = db.AddUser("other@labtracker.local", Role.Researcher);
        var theirs = new Notification { UserId = other.Id, Title = "t", Body = "b", CreatedAt = DateTime.UtcNow };
        db.Notifications.Add(theirs);
        db.SaveChanges();

        await new NotificationService(db).Invoking(s => s.MarkReadAsync(theirs.Id, me.Id)).Should().ThrowAsync<NotFoundException>();
        db.Notifications.Single().ReadAt.Should().BeNull();
    }

    [Fact]
    public async Task MarkAllReadAsync_OnlyTouchesTheUsersOwn()
    {
        using var db = TestDbContextFactory.Create();
        var me = db.AddUser("me@labtracker.local", Role.Researcher);
        var other = db.AddUser("other@labtracker.local", Role.Researcher);
        db.Notifications.AddRange(
            new Notification { UserId = me.Id, Title = "a", Body = "b", CreatedAt = DateTime.UtcNow },
            new Notification { UserId = other.Id, Title = "c", Body = "d", CreatedAt = DateTime.UtcNow });
        db.SaveChanges();

        await new NotificationService(db).MarkAllReadAsync(me.Id);

        db.Notifications.Single(n => n.UserId == me.Id).ReadAt.Should().NotBeNull();
        db.Notifications.Single(n => n.UserId == other.Id).ReadAt.Should().BeNull();
    }
}
