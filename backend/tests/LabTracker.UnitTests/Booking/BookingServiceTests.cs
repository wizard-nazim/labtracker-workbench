using FluentAssertions;
using LabTracker.Application.Modules.Booking;
using LabTracker.Domain.Modules.Booking;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;

namespace LabTracker.UnitTests.Booking;

public class BookingServiceTests
{
    private static BookingEntity NewBooking(int equipmentId, int actorId, int createdByUserId, DateTime start, DateTime end, BookingStatus status = BookingStatus.Requested)
        => new()
        {
            EquipmentId = equipmentId,
            ActorId = actorId,
            ScheduledStart = start,
            ScheduledEnd = end,
            Status = status,
            CreatedByUserId = createdByUserId,
            CreatedAt = DateTime.UtcNow,
        };

    [Fact]
    public async Task GetAllAsync_ForResearcher_OnlyReturnsTheirOwnBookings()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);

        var researcherUser = db.AddUser("researcher@labtracker.local", Role.Researcher);
        var otherUser = db.AddUser("other@labtracker.local", Role.Researcher);
        var researcher = db.AddResearcher(group, "Nadia Petrov", "STU1001", researcherUser.Id);
        var otherResearcher = db.AddResearcher(group, "Sam Reyes", "STU1002", otherUser.Id);

        var ownActor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        var otherActor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = otherResearcher.Id, DisplayNameSnapshot = otherResearcher.FullName };
        db.UsageActors.AddRange(ownActor, otherActor);
        await db.SaveChangesAsync();

        var now = DateTime.UtcNow;
        db.Bookings.AddRange(
            NewBooking(equipment.Id, ownActor.Id, researcherUser.Id, now.AddHours(1), now.AddHours(2)),
            NewBooking(equipment.Id, otherActor.Id, otherUser.Id, now.AddHours(3), now.AddHours(4)));
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.GetAllAsync(new BookingFilter(), researcherUser.Id, Role.Researcher);

        result.Should().ContainSingle().Which.ResearcherId.Should().Be(researcher.Id);
    }

    [Fact]
    public async Task GetAllAsync_ForPrincipalInvestigator_ReturnsBookingsAcrossAllLedGroups_ButNotOtherGroups()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var piUser = db.AddUser("pi@labtracker.local", Role.PrincipalInvestigator);
        var pi = db.AddPrincipalInvestigator(department, "Dr. Amara Okafor", piUser.Id);
        var otherPi = db.AddPrincipalInvestigator(department, "Dr. Liang Chen");

        var ledGroup = db.AddResearchGroup(department, pi, "Okafor Lab");
        var otherGroup = db.AddResearchGroup(department, otherPi, "Chen Lab");

        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);

        var ledResearcher = db.AddResearcher(ledGroup, "Nadia Petrov", "STU1001");
        var otherResearcher = db.AddResearcher(otherGroup, "Priya Nair", "STU1003");

        var ledActor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = ledResearcher.Id, DisplayNameSnapshot = ledResearcher.FullName };
        var otherActor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = otherResearcher.Id, DisplayNameSnapshot = otherResearcher.FullName };
        db.UsageActors.AddRange(ledActor, otherActor);
        await db.SaveChangesAsync();

        var now = DateTime.UtcNow;
        db.Bookings.AddRange(
            NewBooking(equipment.Id, ledActor.Id, piUser.Id, now.AddHours(1), now.AddHours(2)),
            NewBooking(equipment.Id, otherActor.Id, piUser.Id, now.AddHours(3), now.AddHours(4)));
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.GetAllAsync(new BookingFilter(), piUser.Id, Role.PrincipalInvestigator);

        result.Should().ContainSingle().Which.ResearcherId.Should().Be(ledResearcher.Id);
    }

    [Theory]
    [InlineData(Role.SuperAdmin)]
    [InlineData(Role.ScienceOfficer)]
    public async Task GetAllAsync_ForAdminRoles_ReturnsAllBookings(Role role)
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);

        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var now = DateTime.UtcNow;
        db.Bookings.Add(NewBooking(equipment.Id, actor.Id, 999, now.AddHours(1), now.AddHours(2)));
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.GetAllAsync(new BookingFilter(), actingUserId: 999, role);

        result.Should().ContainSingle();
    }

    [Fact]
    public async Task CancelAsync_AllowsTheBookingsOwnCreator()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.CancelAsync(booking.Id, actingUserId: 42, Role.Researcher);

        result.Status.Should().Be(BookingStatus.Cancelled);
    }

    [Fact]
    public async Task CancelAsync_ThrowsForbidden_WhenActingUserIsNeitherCreatorNorAdmin()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var act = () => sut.CancelAsync(booking.Id, actingUserId: 7, Role.Researcher);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Theory]
    [InlineData(Role.SuperAdmin)]
    [InlineData(Role.ScienceOfficer)]
    public async Task CancelAsync_AllowsAdminRoles_EvenWhenNotTheCreator(Role role)
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.CancelAsync(booking.Id, actingUserId: 999, role);

        result.Status.Should().Be(BookingStatus.Cancelled);
    }

    [Fact]
    public async Task CancelAsync_ThrowsNotFound_ForUnknownBookingId()
    {
        using var db = TestDbContextFactory.Create();
        var sut = new BookingService(db, null!, null!);

        var act = () => sut.CancelAsync(id: 12345, actingUserId: 1, Role.SuperAdmin);

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ApproveAsync_SetsStatusAndApprovedByUserId()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.ApproveAsync(booking.Id, actingUserId: 7, Role.SuperAdmin);

        result.Status.Should().Be(BookingStatus.Approved);
        result.ApprovedByUserId.Should().Be(7);
    }

    [Fact]
    public async Task ApproveAsync_AllowsScienceOfficer_WhenAssignedDirectlyToTheEquipment()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var scienceOfficer = db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        db.AddEquipmentScienceOfficer(equipment, scienceOfficer);

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.ApproveAsync(booking.Id, scienceOfficer.Id, Role.ScienceOfficer);

        result.Status.Should().Be(BookingStatus.Approved);
    }

    [Fact]
    public async Task ApproveAsync_AllowsScienceOfficer_WhenOverseeingTheEquipmentsFacility()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var scienceOfficer = db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        var facility = db.AddFacility(department, overseers: scienceOfficer);
        var room = db.AddRoom(department, facility: facility);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var result = await sut.ApproveAsync(booking.Id, scienceOfficer.Id, Role.ScienceOfficer);

        result.Status.Should().Be(BookingStatus.Approved);
    }

    [Fact]
    public async Task ApproveAsync_ThrowsForbidden_ForScienceOfficerNotAssignedToEquipmentOrItsFacility()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var unassignedScienceOfficer = db.AddUser("unassigned-so@labtracker.local", Role.ScienceOfficer);

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!);
        var act = () => sut.ApproveAsync(booking.Id, unassignedScienceOfficer.Id, Role.ScienceOfficer);

        await act.Should().ThrowAsync<ForbiddenException>();
    }
}
