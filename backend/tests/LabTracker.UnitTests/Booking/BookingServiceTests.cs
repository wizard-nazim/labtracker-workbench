using FluentAssertions;
using LabTracker.Application.Modules.Booking;
using LabTracker.Application.Modules.Notifications;
using LabTracker.Domain.Modules.Booking;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
        var result = await sut.CancelAsync(booking.Id, actingUserId: 999, role);

        result.Status.Should().Be(BookingStatus.Cancelled);
    }

    [Fact]
    public async Task CancelAsync_ThrowsNotFound_ForUnknownBookingId()
    {
        using var db = TestDbContextFactory.Create();
        var sut = new BookingService(db, null!, null!, new NotificationService(db));

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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
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

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
        var act = () => sut.ApproveAsync(booking.Id, unassignedScienceOfficer.Id, Role.ScienceOfficer);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    // Seeds one piece of equipment (optionally in a facility) with a single
    // booking in the given status; shared by the approval-guard tests below.
    private static async Task<(EquipmentEntity Equipment, BookingEntity Booking)> SeedBookingAsync(
        LabTracker.Infrastructure.Persistence.LabTrackerDbContext db, BookingStatus status, LabTracker.Domain.Modules.Organization.Facility? facility = null)
    {
        var department = db.Departments.FirstOrDefault() ?? db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department, facility: facility);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcher = db.AddResearcher(group);
        var actor = new UsageActor { ActorType = ActorType.External, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2), status);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return (equipment, booking);
    }

    [Theory]
    [InlineData(BookingStatus.Approved)]
    [InlineData(BookingStatus.Rejected)]
    [InlineData(BookingStatus.Cancelled)]
    public async Task ApproveAndReject_ThrowConflict_WhenBookingIsNoLongerRequested(BookingStatus status)
    {
        using var db = TestDbContextFactory.Create();
        var (_, booking) = await SeedBookingAsync(db, status);
        var sut = new BookingService(db, null!, null!, new NotificationService(db));

        await sut.Invoking(s => s.ApproveAsync(booking.Id, actingUserId: 7, Role.SuperAdmin)).Should().ThrowAsync<ConflictException>();
        await sut.Invoking(s => s.RejectAsync(booking.Id, actingUserId: 7, Role.SuperAdmin)).Should().ThrowAsync<ConflictException>();
    }

    [Fact]
    public async Task RejectAsync_SetsStatus_WithoutRecordingAnApprover()
    {
        using var db = TestDbContextFactory.Create();
        var (_, booking) = await SeedBookingAsync(db, BookingStatus.Requested);
        var sut = new BookingService(db, null!, null!, new NotificationService(db));

        var result = await sut.RejectAsync(booking.Id, actingUserId: 7, Role.SuperAdmin);

        result.Status.Should().Be(BookingStatus.Rejected);
        result.ApprovedByUserId.Should().BeNull();
        db.Bookings.Single(b => b.Id == booking.Id).ModifiedByUserId.Should().Be(7);
    }

    [Fact]
    public async Task GetAllAsync_SetsCanApprove_OnlyForRequestedBookingsTheScienceOfficerIsScopedTo()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var scienceOfficer = db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        var facility = db.AddFacility(department, overseers: scienceOfficer);

        var (assignedEquipment, assignedBooking) = await SeedBookingAsync(db, BookingStatus.Requested);
        db.AddEquipmentScienceOfficer(assignedEquipment, scienceOfficer);
        var (_, facilityBooking) = await SeedBookingAsync(db, BookingStatus.Requested, facility);
        var (_, unrelatedBooking) = await SeedBookingAsync(db, BookingStatus.Requested);
        var (approvedEquipment, alreadyApproved) = await SeedBookingAsync(db, BookingStatus.Approved);
        db.AddEquipmentScienceOfficer(approvedEquipment, scienceOfficer);
        await db.SaveChangesAsync();

        var sut = new BookingService(db, null!, null!, new NotificationService(db));
        var result = (await sut.GetAllAsync(new BookingFilter(), scienceOfficer.Id, Role.ScienceOfficer)).ToDictionary(b => b.Id, b => b.CanApprove);

        result[assignedBooking.Id].Should().BeTrue();
        result[facilityBooking.Id].Should().BeTrue();
        result[unrelatedBooking.Id].Should().BeFalse();
        result[alreadyApproved.Id].Should().BeFalse();
    }

    [Fact]
    public async Task GetAllAsync_SetsCanApprove_ForEveryRequestedBooking_ForSuperAdmin_AndNeverForResearchers()
    {
        using var db = TestDbContextFactory.Create();
        var (_, requested) = await SeedBookingAsync(db, BookingStatus.Requested);
        var sut = new BookingService(db, null!, null!, new NotificationService(db));

        (await sut.GetAllAsync(new BookingFilter(), actingUserId: 7, Role.SuperAdmin)).Single(b => b.Id == requested.Id).CanApprove.Should().BeTrue();
        (await sut.GetByIdAsync(requested.Id, actingUserId: 7, Role.PrincipalInvestigator)).CanApprove.Should().BeFalse();
        (await sut.GetByIdAsync(requested.Id, actingUserId: 7, Role.Researcher)).CanApprove.Should().BeFalse();
    }

    [Theory]
    [InlineData(true, NotificationType.BookingApproved)]
    [InlineData(false, NotificationType.BookingRejected)]
    public async Task ApproveAndReject_NotifyTheBookingsCreator(bool approve, NotificationType expected)
    {
        using var db = TestDbContextFactory.Create();
        var (_, booking) = await SeedBookingAsync(db, BookingStatus.Requested);
        var sut = new BookingService(db, null!, null!, new NotificationService(db));

        if (approve) await sut.ApproveAsync(booking.Id, actingUserId: 7, Role.SuperAdmin);
        else await sut.RejectAsync(booking.Id, actingUserId: 7, Role.SuperAdmin);

        var notification = db.Notifications.Single();
        notification.UserId.Should().Be(booking.CreatedByUserId);
        notification.Type.Should().Be(expected);
        notification.BookingId.Should().Be(booking.Id);
    }

    [Fact]
    public async Task ActorPhone_IsVisibleToStaff_ButHiddenFromEveryoneElse()
    {
        using var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var equipment = db.AddEquipment(db.AddRoom(department), db.AddEquipmentType(), department);
        var contact = db.AddExternalContact();
        contact.Phone = "082 555 0101";
        var actor = new UsageActor { ActorType = ActorType.External, ExternalContactId = contact.Id, DisplayNameSnapshot = contact.FullName };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();
        var booking = NewBooking(equipment.Id, actor.Id, createdByUserId: 42, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2));
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        var sut = new BookingService(db, null!, null!, new NotificationService(db));

        (await sut.GetByIdAsync(booking.Id, actingUserId: 7, Role.ScienceOfficer)).ActorPhone.Should().Be("082 555 0101");
        (await sut.GetByIdAsync(booking.Id, actingUserId: 7, Role.PrincipalInvestigator)).ActorPhone.Should().BeNull();
    }
}
