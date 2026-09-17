using FluentAssertions;
using LabTracker.Application.Modules.Booking;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.UnitTests.TestSupport;

namespace LabTracker.UnitTests.Booking;

public class BookingServiceCreateTests
{
    private static (LabTracker.Infrastructure.Persistence.LabTrackerDbContext Db, BookingService Sut) BuildSut()
    {
        var db = TestDbContextFactory.Create();
        var validator = new CreateBookingRequestValidator(db);
        var resolver = new UsageActorResolver(db);
        return (db, new BookingService(db, validator, resolver));
    }

    [Fact]
    public async Task CreateAsync_WhenActingUserHasOwnResearcherProfile_IgnoresExplicitResearcherIdAndBooksForSelf()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);

        var selfUser = db.AddUser("self@labtracker.local", Role.Researcher);
        var self = db.AddResearcher(group, "Nadia Petrov", "STU1001", selfUser.Id);
        var someoneElse = db.AddResearcher(group, "Sam Reyes", "STU1002");

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
            ResearcherId = someoneElse.Id,
        };

        var result = await sut.CreateAsync(request, selfUser.Id, Role.Researcher);

        result.ResearcherId.Should().Be(self.Id);
        result.ActorType.Should().Be(ActorType.Internal);
        result.Status.Should().Be(BookingStatus.Approved);
    }

    [Theory]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.PrincipalInvestigator)]
    public async Task CreateAsync_ForScienceOfficerOrPiBookingForThemselves_IsInternalAndAutoApproved(Role role)
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);

        var selfUser = db.AddUser($"{role}@labtracker.local", role);
        db.AddResearcher(group, "Self Booker", "STU9001", selfUser.Id);

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
        };

        var result = await sut.CreateAsync(request, selfUser.Id, role);

        result.ActorType.Should().Be(ActorType.Internal);
        result.Status.Should().Be(BookingStatus.Approved);
    }

    [Fact]
    public async Task CreateAsync_WhenActingUserHasNoResearcherProfile_UsesExplicitResearcherId()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);

        var adminUser = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var researcher = db.AddResearcher(group, "Priya Nair", "STU1003");

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
            ResearcherId = researcher.Id,
        };

        var result = await sut.CreateAsync(request, adminUser.Id, Role.SuperAdmin);

        result.ResearcherId.Should().Be(researcher.Id);
        result.ActorType.Should().Be(ActorType.Internal);
        result.Status.Should().Be(BookingStatus.Approved);
    }

    [Theory]
    [InlineData(Role.SuperAdmin)]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.PrincipalInvestigator)]
    public async Task CreateAsync_ForExternalContact_ByAnAuthorizedRole_IsExternalAndRequiresApproval(Role role)
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var actingUser = db.AddUser($"{role}@labtracker.local", role);
        var contact = db.AddExternalContact();

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
            ExternalContactId = contact.Id,
        };

        var result = await sut.CreateAsync(request, actingUser.Id, role);

        result.ActorType.Should().Be(ActorType.External);
        result.ExternalContactId.Should().Be(contact.Id);
        result.Status.Should().Be(BookingStatus.Requested);
        result.ApprovedByUserId.Should().BeNull();
    }

    [Fact]
    public async Task CreateAsync_ForExternalContact_ByAPlainResearcherWithNoProfile_IsForbidden()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var researcherUser = db.AddUser("researcher@labtracker.local", Role.Researcher);
        var contact = db.AddExternalContact();

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
            ExternalContactId = contact.Id,
        };

        var act = () => sut.CreateAsync(request, researcherUser.Id, Role.Researcher);

        await act.Should().ThrowAsync<ForbiddenException>();
    }

    [Fact]
    public async Task CreateAsync_WithBothResearcherIdAndExternalContactId_Throws()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var adminUser = db.AddUser("admin@labtracker.local", Role.SuperAdmin);
        var researcher = db.AddResearcher(group);
        var contact = db.AddExternalContact();

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
            ResearcherId = researcher.Id,
            ExternalContactId = contact.Id,
        };

        var act = () => sut.CreateAsync(request, adminUser.Id, Role.SuperAdmin);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_WhenActingUserHasNoResearcherProfileAndNoExplicitResearcherId_Throws()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var adminUser = db.AddUser("admin@labtracker.local", Role.SuperAdmin);

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
            ResearcherId = null,
        };

        var act = () => sut.CreateAsync(request, adminUser.Id, Role.SuperAdmin);

        var exception = await act.Should().ThrowAsync<FluentValidation.ValidationException>();
        exception.Which.Errors.Should().ContainSingle(e => e.PropertyName == "ResearcherId");
    }

    [Fact]
    public async Task CreateAsync_ForScienceOfficerWithNoResearcherProfile_AutoProvisionsOneNamedAfterTheirEmail()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var scienceOfficer = db.AddUser("so-no-profile@labtracker.local", Role.ScienceOfficer);

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
        };

        var result = await sut.CreateAsync(request, scienceOfficer.Id, Role.ScienceOfficer);

        result.ActorType.Should().Be(ActorType.Internal);
        result.Status.Should().Be(BookingStatus.Approved);
        result.ActorDisplayName.Should().Be("so-no-profile@labtracker.local");
        db.Researchers.Should().ContainSingle(r => r.UserId == scienceOfficer.Id && r.FullName == "so-no-profile@labtracker.local");
    }

    [Fact]
    public async Task CreateAsync_ForPrincipalInvestigatorWithNoResearcherProfile_AutoProvisionsOneNamedAfterTheirPiProfile()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var piUser = db.AddUser("pi-no-profile@labtracker.local", Role.PrincipalInvestigator);
        db.AddPrincipalInvestigator(department, "Dr. Amara Okafor", piUser.Id);

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
        };

        var result = await sut.CreateAsync(request, piUser.Id, Role.PrincipalInvestigator);

        result.ActorType.Should().Be(ActorType.Internal);
        result.Status.Should().Be(BookingStatus.Approved);
        result.ActorDisplayName.Should().Be("Dr. Amara Okafor");
        db.Researchers.Should().ContainSingle(r => r.UserId == piUser.Id && r.FullName == "Dr. Amara Okafor");
    }

    [Fact]
    public async Task CreateAsync_RejectsOverlappingBookingForSameEquipment()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var user = db.AddUser("researcher@labtracker.local", Role.Researcher);
        db.AddResearcher(group, "Nadia Petrov", "STU1001", user.Id);

        var start = DateTime.UtcNow.AddHours(2);
        var end = start.AddHours(1);
        await sut.CreateAsync(new CreateBookingRequest { EquipmentId = equipment.Id, ScheduledStart = start, ScheduledEnd = end }, user.Id, Role.Researcher);

        var overlapping = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = start.AddMinutes(30),
            ScheduledEnd = end.AddMinutes(30),
        };
        var act = () => sut.CreateAsync(overlapping, user.Id, Role.Researcher);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_AllowsBackToBackBookings_WhenTimeRangesDoNotOverlap()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var user = db.AddUser("researcher@labtracker.local", Role.Researcher);
        db.AddResearcher(group, "Nadia Petrov", "STU1001", user.Id);

        var start = DateTime.UtcNow.AddHours(2);
        var mid = start.AddHours(1);
        var end = mid.AddHours(1);

        await sut.CreateAsync(new CreateBookingRequest { EquipmentId = equipment.Id, ScheduledStart = start, ScheduledEnd = mid }, user.Id, Role.Researcher);
        var result = await sut.CreateAsync(new CreateBookingRequest { EquipmentId = equipment.Id, ScheduledStart = mid, ScheduledEnd = end }, user.Id, Role.Researcher);

        result.Should().NotBeNull();
    }

    [Fact]
    public async Task CreateAsync_RejectsBookingThatStartsInThePast()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department);
        var user = db.AddUser("researcher@labtracker.local", Role.Researcher);
        db.AddResearcher(group, "Nadia Petrov", "STU1001", user.Id);

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(-1),
            ScheduledEnd = DateTime.UtcNow.AddHours(1),
        };

        var act = () => sut.CreateAsync(request, user.Id, Role.Researcher);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }

    [Fact]
    public async Task CreateAsync_RejectsEquipmentThatIsNotAvailable()
    {
        var (db, sut) = BuildSut();
        var department = db.AddDepartment();
        var pi = db.AddPrincipalInvestigator(department);
        var group = db.AddResearchGroup(department, pi);
        var room = db.AddRoom(department);
        var type = db.AddEquipmentType();
        var equipment = db.AddEquipment(room, type, department, status: EquipmentStatus.UnderMaintenance);
        var user = db.AddUser("researcher@labtracker.local", Role.Researcher);
        db.AddResearcher(group, "Nadia Petrov", "STU1001", user.Id);

        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(1),
            ScheduledEnd = DateTime.UtcNow.AddHours(2),
        };

        var act = () => sut.CreateAsync(request, user.Id, Role.Researcher);

        await act.Should().ThrowAsync<FluentValidation.ValidationException>();
    }
}
