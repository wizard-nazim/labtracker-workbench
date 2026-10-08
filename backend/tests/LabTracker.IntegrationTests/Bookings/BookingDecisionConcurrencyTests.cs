using FluentAssertions;
using LabTracker.Application.Modules.Booking;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;

namespace LabTracker.IntegrationTests.Bookings;

// BookingService.TransitionAsync checks "still Requested" in memory, so two
// people deciding the same booking at once could both pass it. Booking's xmin
// concurrency token (see BookingConfiguration) is the backstop, and only exists
// on a real Postgres. The race is reproduced deterministically: the loser's
// context is made to track the booking before the winner saves, so its
// FindAsync hands back that stale copy.
public class BookingDecisionConcurrencyTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task SecondDecision_OnAStaleRead_IsRejectedAsConflict_AndLeavesOnlyTheFirst()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var bookingId = await SeedRequestedBookingAsync(admin.Id);

        using var loserScope = Factory.Services.CreateScope();
        var loserDb = loserScope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        (await loserDb.Bookings.FindAsync(bookingId))!.Status.Should().Be(BookingStatus.Requested);

        using (var winnerScope = Factory.Services.CreateScope())
        {
            await winnerScope.ServiceProvider.GetRequiredService<BookingService>()
                .ApproveAsync(bookingId, admin.Id, Role.SuperAdmin);
        }

        var act = () => loserScope.ServiceProvider.GetRequiredService<BookingService>()
            .RejectAsync(bookingId, admin.Id, Role.SuperAdmin);

        await act.Should().ThrowAsync<ConflictException>();

        using var checkScope = Factory.Services.CreateScope();
        var checkDb = checkScope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        (await checkDb.Bookings.SingleAsync(b => b.Id == bookingId)).Status.Should().Be(BookingStatus.Approved);
        (await checkDb.Notifications.Where(n => n.BookingId == bookingId).Select(n => n.Type).ToListAsync())
            .Should().Equal(NotificationType.BookingApproved);
    }

    private async Task<int> SeedRequestedBookingAsync(int creatorId)
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

        var actor = new LabTracker.Domain.Modules.Booking.UsageActor
        {
            ActorType = ActorType.Internal,
            ResearcherId = researcher.Id,
            DisplayNameSnapshot = researcher.FullName,
        };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        var booking = new BookingEntity
        {
            EquipmentId = equipment.Id,
            ActorId = actor.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(2),
            ScheduledEnd = DateTime.UtcNow.AddHours(3),
            Status = BookingStatus.Requested,
            CreatedByUserId = creatorId,
            CreatedAt = DateTime.UtcNow,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync();
        return booking.Id;
    }
}
