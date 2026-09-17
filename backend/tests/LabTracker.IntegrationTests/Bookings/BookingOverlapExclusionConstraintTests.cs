using FluentAssertions;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;

namespace LabTracker.IntegrationTests.Bookings;

// The app-level conflict check in CreateBookingRequestValidator is a plain
// check-then-insert with no locking (see BookingValidators.HasNoConflictAsync):
// two concurrent requests can both pass validation and both try to insert. The
// EX_Bookings_Equipment_TimeRange exclusion constraint (see the
// AddBookingOverlapExclusionConstraint migration) is the actual backstop. That
// only shows up against a real Postgres, so this bypasses the validator and
// inserts directly to prove the database itself rejects the second overlapping row.
public class BookingOverlapExclusionConstraintTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task DirectInsert_OfOverlappingBookingForSameEquipment_ViolatesTheExclusionConstraint()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department);
        var group = await db.AddResearchGroupAsync(department, pi);
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department);
        var researcher = await db.AddResearcherAsync(group);
        var creator = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);

        var actor = new LabTracker.Domain.Modules.Booking.UsageActor
        {
            ActorType = ActorType.Internal,
            ResearcherId = researcher.Id,
            DisplayNameSnapshot = researcher.FullName,
        };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var start = DateTime.UtcNow.AddHours(2);
        var end = start.AddHours(1);

        db.Bookings.Add(new BookingEntity
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ScheduledStart = start,
            ScheduledEnd = end,
            Status = BookingStatus.Requested,
            CreatedByUserId = creator.Id,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        db.Bookings.Add(new BookingEntity
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ScheduledStart = start.AddMinutes(30),
            ScheduledEnd = end.AddMinutes(30),
            Status = BookingStatus.Requested,
            CreatedByUserId = creator.Id,
            CreatedAt = DateTime.UtcNow,
        });

        var act = () => db.SaveChangesAsync();

        var exception = await act.Should().ThrowAsync<DbUpdateException>();
        exception.Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.SqlState.Should().Be(PostgresErrorCodes.ExclusionViolation);
    }

    [Fact]
    public async Task DirectInsert_OfOverlappingCancelledBooking_DoesNotViolateTheExclusionConstraint()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department);
        var group = await db.AddResearchGroupAsync(department, pi);
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department);
        var researcher = await db.AddResearcherAsync(group);
        var creator = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);

        var actor = new LabTracker.Domain.Modules.Booking.UsageActor
        {
            ActorType = ActorType.Internal,
            ResearcherId = researcher.Id,
            DisplayNameSnapshot = researcher.FullName,
        };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var start = DateTime.UtcNow.AddHours(2);
        var end = start.AddHours(1);

        db.Bookings.Add(new BookingEntity
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ScheduledStart = start,
            ScheduledEnd = end,
            Status = BookingStatus.Cancelled,
            CreatedByUserId = creator.Id,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        db.Bookings.Add(new BookingEntity
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ScheduledStart = start.AddMinutes(30),
            ScheduledEnd = end.AddMinutes(30),
            Status = BookingStatus.Requested,
            CreatedByUserId = creator.Id,
            CreatedAt = DateTime.UtcNow,
        });

        var act = () => db.SaveChangesAsync();

        await act.Should().NotThrowAsync();
    }
}
