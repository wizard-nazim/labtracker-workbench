using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using UsageRecordEntity = LabTracker.Domain.Modules.Booking.UsageRecord;

namespace LabTracker.Application.Modules.Booking;

public class UsageRecordService(IApplicationDbContext db, IValidator<CreateUsageRecordRequest> validator, UsageActorResolver actorResolver)
{
    // Researchers only ever see their own usage history; Super Admins and Science
    // Officers see everything, mirroring how bookings are scoped.
    public async Task<List<UsageRecordDto>> GetAllAsync(UsageRecordFilter filter, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        var query = db.UsageRecords.AsQueryable();

        if (actingUserRole == Role.Researcher)
        {
            query = query.Where(u => u.Actor.ResearcherId != null && u.Actor.Researcher!.UserId == actingUserId);
        }

        if (filter.EquipmentId is { } equipmentId) query = query.Where(u => u.EquipmentId == equipmentId);

        return await query.OrderByDescending(u => u.ActualStart).Select(ProjectToDto).ToListAsync(cancellationToken);
    }

    public async Task<UsageRecordDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.UsageRecords.Where(u => u.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(UsageRecordEntity), id);
    }

    public async Task<UsageRecordDto> CreateAsync(CreateUsageRecordRequest request, int actingUserId, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        int actorId;
        if (request.BookingId is { } bookingId)
        {
            actorId = await db.Bookings.Where(b => b.Id == bookingId).Select(b => b.ActorId).SingleAsync(cancellationToken);
        }
        else
        {
            actorId = await actorResolver.GetOrCreateInternalActorAsync(request.ResearcherId!.Value, cancellationToken);
        }

        var record = new UsageRecordEntity
        {
            EquipmentId = request.EquipmentId,
            ActorId = actorId,
            BookingId = request.BookingId,
            ActualStart = request.ActualStart,
            ActualEnd = request.ActualEnd,
            Notes = request.Notes,
            RecordedByUserId = actingUserId,
            CreatedAt = DateTime.UtcNow,
        };
        db.UsageRecords.Add(record);

        if (request.BookingId is { } linkedBookingId)
        {
            var booking = await db.Bookings.FindAsync([linkedBookingId], cancellationToken)
                ?? throw new NotFoundException("Booking", linkedBookingId);
            booking.Status = BookingStatus.Completed;
            booking.ModifiedByUserId = actingUserId;
            booking.ModifiedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(record.Id, cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<UsageRecordEntity, UsageRecordDto>> ProjectToDto = u => new UsageRecordDto
    {
        Id = u.Id,
        ActualStart = u.ActualStart,
        ActualEnd = u.ActualEnd,
        Notes = u.Notes,
        EquipmentId = u.EquipmentId,
        EquipmentName = u.Equipment.Name,
        BookingId = u.BookingId,
        ResearcherId = u.Actor.ResearcherId,
        ActorDisplayName = u.Actor.DisplayNameSnapshot,
        RecordedByUserId = u.RecordedByUserId,
        CreatedAt = u.CreatedAt,
    };
}
