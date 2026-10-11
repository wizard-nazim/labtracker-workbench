using FluentAssertions;
using FluentValidation.TestHelper;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Application.Modules.Notifications;
using LabTracker.Domain.Modules.Booking;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.UnitTests.Equipment;

public class UpsertEquipmentRequestOwnershipValidatorTests
{
    private static (LabTrackerDbContext Db, UpsertEquipmentRequest Request) Arrange()
    {
        var db = TestDbContextFactory.Create();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        return (db, new UpsertEquipmentRequest
        {
            Name = "Centrifuge X200",
            EquipmentTypeId = type.Id,
            RoomId = room.Id,
            OwningDepartmentId = department.Id,
        });
    }

    [Fact]
    public async Task DepartmentOwnership_WithoutOwner_IsValid()
    {
        var (db, request) = Arrange();

        var result = await new UpsertEquipmentRequestValidator(db).TestValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task DepartmentOwnership_WithOwner_IsRejected()
    {
        var (db, request) = Arrange();
        request.OwnerUserId = db.AddUser("so@labtracker.local", Role.ScienceOfficer).Id;

        var result = await new UpsertEquipmentRequestValidator(db).TestValidateAsync(request);

        result.ShouldHaveValidationErrorFor(x => x.OwnerUserId);
    }

    [Fact]
    public async Task IndividualOwnership_WithoutOwner_IsRejected()
    {
        var (db, request) = Arrange();
        request.OwnershipType = OwnershipType.Individual;

        var result = await new UpsertEquipmentRequestValidator(db).TestValidateAsync(request);

        result.ShouldHaveValidationErrorFor(x => x.OwnerUserId);
    }

    [Theory]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.Researcher)]
    [InlineData(Role.PrincipalInvestigator)]
    public async Task IndividualOwnership_WithEligibleRole_IsValid(Role role)
    {
        var (db, request) = Arrange();
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = db.AddUser("owner@labtracker.local", role).Id;

        var result = await new UpsertEquipmentRequestValidator(db).TestValidateAsync(request);

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task UnknownResearchGroup_IsRejected()
    {
        var (db, request) = Arrange();
        request.ResearchGroupId = 999;

        var result = await new UpsertEquipmentRequestValidator(db).TestValidateAsync(request);

        result.ShouldHaveValidationErrorFor(x => x.ResearchGroupId);
    }
}

public class EquipmentServiceTests
{
    private sealed record Graph(
        LabTrackerDbContext Db,
        EquipmentService Sut,
        Department Department,
        LabTracker.Domain.Modules.Equipment.Room Room,
        LabTracker.Domain.Modules.Equipment.EquipmentType Type,
        int AdminId);

    private static Graph Arrange()
    {
        var db = TestDbContextFactory.Create();
        var sut = new EquipmentService(
            db,
            new UpsertEquipmentRequestValidator(db),
            new AssignScienceOfficerRequestValidator(db),
            new NotificationService(db));
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var admin = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        return new Graph(db, sut, department, room, type, admin.Id);
    }

    private static UpsertEquipmentRequest Request(Graph g, string name = "Centrifuge X200") => new()
    {
        Name = name,
        EquipmentTypeId = g.Type.Id,
        RoomId = g.Room.Id,
        OwningDepartmentId = g.Department.Id,
    };

    [Fact]
    public async Task Create_WithIndividualOwnerAndLab_ReturnsThemWithTimestamps()
    {
        var g = Arrange();
        var ownerUser = g.Db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        var pi = g.Db.AddPrincipalInvestigator(g.Department);
        var lab = g.Db.AddResearchGroup(g.Department, pi, "Plant Stress");
        g.Db.Researchers.Add(new Researcher { FullName = "Thandi Mokoena", StudentNumber = "SO-1", UserId = ownerUser.Id });
        g.Db.SaveChanges();

        var request = Request(g);
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = ownerUser.Id;
        request.ResearchGroupId = lab.Id;

        var result = await g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        result.OwnershipType.Should().Be(OwnershipType.Individual);
        result.Owner.Should().BeEquivalentTo(new EntityReferenceDto { Id = ownerUser.Id, Name = "Thandi Mokoena" });
        result.ResearchGroup.Should().BeEquivalentTo(new EntityReferenceDto { Id = lab.Id, Name = "Plant Stress" });
        result.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        result.UpdatedAt.Should().Be(result.CreatedAt);
    }

    [Fact]
    public async Task Create_WithDeactivatedOwner_IsRejected()
    {
        var g = Arrange();
        var inactive = g.Db.AddUser("gone@labtracker.local", Role.ScienceOfficer, isActive: false);
        var request = Request(g);
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = inactive.Id;

        var act = () => g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        (await act.Should().ThrowAsync<FluentValidation.ValidationException>())
            .Which.Errors.Should().Contain(e => e.PropertyName == nameof(UpsertEquipmentRequest.OwnerUserId));
    }

    [Fact]
    public async Task Update_KeepingADeactivatedOwner_StillSucceeds()
    {
        var g = Arrange();
        var owner = g.Db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        var request = Request(g);
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = owner.Id;
        var created = await g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        owner.IsActive = false;
        g.Db.SaveChanges();

        request.Name = "Centrifuge X300";
        var updated = await g.Sut.UpdateAsync(created.Id, request, g.AdminId, Role.SuperAdmin);

        updated.Name.Should().Be("Centrifuge X300");
        updated.Owner!.Id.Should().Be(owner.Id);
        updated.Owner.Name.Should().Be("so@labtracker.local");
    }

    [Fact]
    public async Task Update_SwitchingToADeactivatedOwner_IsRejected()
    {
        var g = Arrange();
        var created = await g.Sut.CreateAsync(Request(g), g.AdminId, Role.SuperAdmin);
        var inactive = g.Db.AddUser("gone@labtracker.local", Role.Researcher, isActive: false);

        var request = Request(g);
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = inactive.Id;
        var act = () => g.Sut.UpdateAsync(created.Id, request, g.AdminId, Role.SuperAdmin);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task Update_BumpsUpdatedAt_ButNotCreatedAt()
    {
        var g = Arrange();
        var created = await g.Sut.CreateAsync(Request(g), g.AdminId, Role.SuperAdmin);
        var entity = g.Db.Equipment.Single();
        entity.CreatedAt = entity.UpdatedAt = DateTime.UtcNow.AddDays(-3);
        g.Db.SaveChanges();

        var updated = await g.Sut.UpdateAsync(created.Id, Request(g, "Renamed"), g.AdminId, Role.SuperAdmin);

        updated.CreatedAt.Should().BeBefore(DateTime.UtcNow.AddDays(-2));
        updated.UpdatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
    }

    private static (int PiUserId, ResearchGroup OwnLab, ResearchGroup OtherLab) ArrangePi(Graph g)
    {
        var piUser = g.Db.AddUser("pi@labtracker.local", Role.PrincipalInvestigator);
        var pi = g.Db.AddPrincipalInvestigator(g.Department, "Dr. Amara Okafor", piUser.Id);
        pi.HasEquipmentPermissions = true;
        var otherPi = g.Db.AddPrincipalInvestigator(g.Department, "Dr. Liang Chen");
        g.Db.SaveChanges();
        return (piUser.Id, g.Db.AddResearchGroup(g.Department, pi, "Okafor Lab"), g.Db.AddResearchGroup(g.Department, otherPi, "Chen Lab"));
    }

    [Fact]
    public async Task PrincipalInvestigator_CanAssignTheirOwnLab()
    {
        var g = Arrange();
        var (piUserId, ownLab, _) = ArrangePi(g);
        var request = Request(g);
        request.OwnershipType = OwnershipType.Department;
        request.ResearchGroupId = ownLab.Id;

        var result = await g.Sut.CreateAsync(request, piUserId, Role.PrincipalInvestigator);

        result.ResearchGroup!.Id.Should().Be(ownLab.Id);
    }

    [Fact]
    public async Task PrincipalInvestigator_CannotAssignAnotherPisLab()
    {
        var g = Arrange();
        var (piUserId, _, otherLab) = ArrangePi(g);
        var request = Request(g);
        request.OwnershipType = OwnershipType.Department;
        request.ResearchGroupId = otherLab.Id;

        var act = () => g.Sut.CreateAsync(request, piUserId, Role.PrincipalInvestigator);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task PrincipalInvestigator_CanEditEquipmentWhoseOtherLabAnAdminSet()
    {
        var g = Arrange();
        var (piUserId, _, otherLab) = ArrangePi(g);
        var request = Request(g);
        request.ResearchGroupId = otherLab.Id;
        var created = await g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        request.Name = "Renamed by PI";
        var updated = await g.Sut.UpdateAsync(created.Id, request, piUserId, Role.PrincipalInvestigator);

        updated.Name.Should().Be("Renamed by PI");
    }

    [Fact]
    public async Task SuperAdmin_CanAssignAnyLab()
    {
        var g = Arrange();
        var (_, _, otherLab) = ArrangePi(g);
        var request = Request(g);
        request.OwnershipType = OwnershipType.Department;
        request.ResearchGroupId = otherLab.Id;

        var result = await g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        result.ResearchGroup!.Id.Should().Be(otherLab.Id);
    }

    private static BookingEntity AddBooking(Graph g, EquipmentEntity equipment, DateTime start, DateTime end, BookingStatus status)
    {
        var actor = g.Db.UsageActors.FirstOrDefault();
        if (actor is null)
        {
            actor = new UsageActor { ActorType = ActorType.External, ExternalContactId = g.Db.AddExternalContact().Id, DisplayNameSnapshot = "Visitor" };
            g.Db.UsageActors.Add(actor);
            g.Db.SaveChanges();
        }

        var booking = new BookingEntity
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ScheduledStart = start,
            ScheduledEnd = end,
            Status = status,
            CreatedByUserId = g.AdminId,
            CreatedAt = DateTime.UtcNow,
        };
        g.Db.Bookings.Add(booking);
        g.Db.SaveChanges();
        return booking;
    }

    [Fact]
    public async Task Create_WithSuperAdminOwner_IsRejected()
    {
        var g = Arrange();
        var request = Request(g);
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = g.AdminId;

        var act = () => g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        (await act.Should().ThrowAsync<FluentValidation.ValidationException>())
            .Which.Errors.Should().Contain(e => e.PropertyName == nameof(UpsertEquipmentRequest.OwnerUserId));
    }

    [Fact]
    public async Task Update_KeepingAnOwnerWhoseRoleChanged_StillSucceeds()
    {
        var g = Arrange();
        var owner = g.Db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        var request = Request(g);
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = owner.Id;
        var created = await g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        owner.Role = Role.SuperAdmin;
        g.Db.SaveChanges();

        request.Name = "Centrifuge X300";
        var updated = await g.Sut.UpdateAsync(created.Id, request, g.AdminId, Role.SuperAdmin);

        updated.Owner!.Id.Should().Be(owner.Id);
    }

    [Fact]
    public async Task Update_WithoutOwnershipFields_LeavesOwnerAndLabUnchanged()
    {
        var g = Arrange();
        var owner = g.Db.AddUser("so@labtracker.local", Role.ScienceOfficer);
        var pi = g.Db.AddPrincipalInvestigator(g.Department);
        var lab = g.Db.AddResearchGroup(g.Department, pi, "Plant Stress");
        var request = Request(g);
        request.OwnershipType = OwnershipType.Individual;
        request.OwnerUserId = owner.Id;
        request.ResearchGroupId = lab.Id;
        var created = await g.Sut.CreateAsync(request, g.AdminId, Role.SuperAdmin);

        // What a client that predates these fields sends.
        var legacy = Request(g, "Centrifuge X300");
        var updated = await g.Sut.UpdateAsync(created.Id, legacy, g.AdminId, Role.SuperAdmin);

        updated.Name.Should().Be("Centrifuge X300");
        updated.OwnershipType.Should().Be(OwnershipType.Individual);
        updated.Owner!.Id.Should().Be(owner.Id);
        updated.ResearchGroup!.Id.Should().Be(lab.Id);
    }

    [Fact]
    public async Task UpdateStatus_ToRetiredWithLiveBookings_IsRefused()
    {
        var g = Arrange();
        var equipment = g.Db.AddEquipment(g.Room, g.Type, g.Department);
        var now = DateTime.UtcNow;
        AddBooking(g, equipment, now.AddHours(1), now.AddHours(2), BookingStatus.Approved);

        var act = () => g.Sut.UpdateStatusAsync(equipment.Id, EquipmentStatus.Retired, g.AdminId, Role.SuperAdmin);

        (await act.Should().ThrowAsync<ConflictException>()).WithMessage("Has 1 upcoming or in-progress booking*");
        g.Db.Equipment.Single().Status.Should().Be(EquipmentStatus.Available);
    }

    [Fact]
    public async Task Archive_WithLiveBookings_IsRefusedWithTheCount()
    {
        var g = Arrange();
        var equipment = g.Db.AddEquipment(g.Room, g.Type, g.Department);
        var now = DateTime.UtcNow;
        AddBooking(g, equipment, now.AddHours(1), now.AddHours(2), BookingStatus.Approved);
        AddBooking(g, equipment, now.AddHours(-1), now.AddHours(1), BookingStatus.Requested);

        var act = () => g.Sut.ArchiveAsync(equipment.Id, g.AdminId);

        (await act.Should().ThrowAsync<ConflictException>()).WithMessage("Has 2 upcoming or in-progress bookings*");
        g.Db.Equipment.Single().Status.Should().Be(EquipmentStatus.Available);
    }

    [Fact]
    public async Task Archive_IgnoresPastAndClosedBookings_AndNotifies()
    {
        var g = Arrange();
        var equipment = g.Db.AddEquipment(g.Room, g.Type, g.Department);
        var researcher = g.Db.AddUser("r@labtracker.local", Role.Researcher);
        var now = DateTime.UtcNow;
        AddBooking(g, equipment, now.AddHours(-3), now.AddHours(-2), BookingStatus.Approved);
        AddBooking(g, equipment, now.AddHours(1), now.AddHours(2), BookingStatus.Cancelled);

        var result = await g.Sut.ArchiveAsync(equipment.Id, g.AdminId);

        result.Status.Should().Be(EquipmentStatus.Retired);
        g.Db.Notifications.Should().Contain(n => n.UserId == researcher.Id && n.EquipmentId == equipment.Id);
    }

    [Fact]
    public async Task Unarchive_RestoresAvailability()
    {
        var g = Arrange();
        var equipment = g.Db.AddEquipment(g.Room, g.Type, g.Department, status: EquipmentStatus.Retired);

        var result = await g.Sut.UnarchiveAsync(equipment.Id, g.AdminId);

        result.Status.Should().Be(EquipmentStatus.Available);
    }

    [Fact]
    public async Task Unarchive_LeavesNonArchivedEquipmentAlone()
    {
        var g = Arrange();
        var equipment = g.Db.AddEquipment(g.Room, g.Type, g.Department, status: EquipmentStatus.Faulty);

        var result = await g.Sut.UnarchiveAsync(equipment.Id, g.AdminId);

        result.Status.Should().Be(EquipmentStatus.Faulty);
    }

    [Fact]
    public async Task Delete_WithBookings_IsRefused()
    {
        var g = Arrange();
        var equipment = g.Db.AddEquipment(g.Room, g.Type, g.Department);
        AddBooking(g, equipment, DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-2).AddHours(1), BookingStatus.Completed);

        var act = () => g.Sut.DeleteAsync(equipment.Id);

        (await act.Should().ThrowAsync<ConflictException>()).WithMessage("*archive instead*");
    }

    [Fact]
    public async Task Delete_WithoutHistory_RemovesItAndItsScienceOfficers()
    {
        var g = Arrange();
        var equipment = g.Db.AddEquipment(g.Room, g.Type, g.Department);
        g.Db.AddEquipmentScienceOfficer(equipment, g.Db.AddUser("so@labtracker.local", Role.ScienceOfficer));

        await g.Sut.DeleteAsync(equipment.Id);

        g.Db.Equipment.Should().BeEmpty();
        g.Db.EquipmentScienceOfficers.Should().BeEmpty();
    }

    [Fact]
    public async Task GetAll_HidesArchivedByDefault()
    {
        var g = Arrange();
        g.Db.AddEquipment(g.Room, g.Type, g.Department, "Active");
        g.Db.AddEquipment(g.Room, g.Type, g.Department, "Archived", EquipmentStatus.Retired);

        var defaultList = await g.Sut.GetAllAsync(new EquipmentFilter());
        var withArchived = await g.Sut.GetAllAsync(new EquipmentFilter { IncludeArchived = true });
        var onlyRetired = await g.Sut.GetAllAsync(new EquipmentFilter { Status = EquipmentStatus.Retired });

        defaultList.Select(e => e.Name).Should().Equal("Active");
        withArchived.Select(e => e.Name).Should().Equal("Active", "Archived");
        onlyRetired.Select(e => e.Name).Should().Equal("Archived");
    }

    [Fact]
    public async Task GetAll_SortsByNameCreatedAtOrUpdatedAt_InEitherDirection()
    {
        var g = Arrange();
        var now = DateTime.UtcNow;
        var b = g.Db.AddEquipment(g.Room, g.Type, g.Department, "Bravo");
        var a = g.Db.AddEquipment(g.Room, g.Type, g.Department, "Alpha");
        var c = g.Db.AddEquipment(g.Room, g.Type, g.Department, "Charlie");
        (b.CreatedAt, b.UpdatedAt) = (now.AddDays(-3), now.AddDays(-1));
        (a.CreatedAt, a.UpdatedAt) = (now.AddDays(-2), now.AddDays(-3));
        (c.CreatedAt, c.UpdatedAt) = (now.AddDays(-1), now.AddDays(-2));
        g.Db.SaveChanges();

        async Task<IEnumerable<string>> Names(string? sort, string? dir)
            => (await g.Sut.GetAllAsync(new EquipmentFilter { Sort = sort, Dir = dir })).Select(e => e.Name);

        (await Names(null, null)).Should().Equal("Alpha", "Bravo", "Charlie");
        (await Names("name", "desc")).Should().Equal("Charlie", "Bravo", "Alpha");
        (await Names("createdAt", "asc")).Should().Equal("Bravo", "Alpha", "Charlie");
        (await Names("createdAt", "desc")).Should().Equal("Charlie", "Alpha", "Bravo");
        (await Names("updatedAt", "desc")).Should().Equal("Bravo", "Charlie", "Alpha");
    }

    [Fact]
    public async Task GetAll_RejectsAnUnknownSort()
    {
        var g = Arrange();

        var act = () => g.Sut.GetAllAsync(new EquipmentFilter { Sort = "serial" });

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }
}
