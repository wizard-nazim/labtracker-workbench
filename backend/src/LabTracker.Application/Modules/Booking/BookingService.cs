using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;

namespace LabTracker.Application.Modules.Booking;

public class BookingService(IApplicationDbContext db, IValidator<CreateBookingRequest> createValidator, UsageActorResolver actorResolver)
{
    // Researchers only ever see their own bookings; Super Admins and Science
    // Officers see everything, per the brief's "personal bookings" vs "view bookings" split.
    public async Task<List<BookingDto>> GetAllAsync(BookingFilter filter, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        var query = db.Bookings.AsQueryable();

        if (actingUserRole == Role.Researcher)
        {
            query = query.Where(b => b.Actor.ResearcherId != null && b.Actor.Researcher!.UserId == actingUserId);
        }

        if (filter.EquipmentId is { } equipmentId) query = query.Where(b => b.EquipmentId == equipmentId);
        if (filter.Status is { } status) query = query.Where(b => b.Status == status);

        return await query.OrderByDescending(b => b.ScheduledStart).Select(ProjectToDto).ToListAsync(cancellationToken);
    }

    public async Task<BookingDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.Bookings.Where(b => b.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(BookingEntity), id);
    }

    public async Task<BookingDto> CreateAsync(CreateBookingRequest request, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        int researcherId;
        if (actingUserRole == Role.Researcher)
        {
            // A Researcher can only ever book for themselves — any ResearcherId in the
            // request body is ignored to prevent booking on someone else's behalf.
            researcherId = await db.Researchers.Where(r => r.UserId == actingUserId).Select(r => r.Id).SingleOrDefaultAsync(cancellationToken);
            if (researcherId == 0)
            {
                throw new NotFoundException("ResearcherProfile", actingUserId);
            }
        }
        else if (request.ResearcherId is { } explicitId)
        {
            researcherId = explicitId;
        }
        else
        {
            throw new FluentValidation.ValidationException(
                [new FluentValidation.Results.ValidationFailure(nameof(request.ResearcherId), "ResearcherId is required when booking on behalf of someone else.")]);
        }

        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var actorId = await actorResolver.GetOrCreateInternalActorAsync(researcherId, cancellationToken);

        var booking = new BookingEntity
        {
            EquipmentId = request.EquipmentId,
            ActorId = actorId,
            ScheduledStart = request.ScheduledStart,
            ScheduledEnd = request.ScheduledEnd,
            Status = BookingStatus.Requested,
            CreatedByUserId = actingUserId,
            CreatedAt = DateTime.UtcNow,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(booking.Id, cancellationToken);
    }

    public async Task<BookingDto> ApproveAsync(int id, int actingUserId, CancellationToken cancellationToken = default)
        => await TransitionAsync(id, BookingStatus.Approved, actingUserId, approvedByUserId: actingUserId, cancellationToken);

    public async Task<BookingDto> RejectAsync(int id, int actingUserId, CancellationToken cancellationToken = default)
        => await TransitionAsync(id, BookingStatus.Rejected, actingUserId, approvedByUserId: actingUserId, cancellationToken);

    // The booking's own creator, or a Super Admin/Science Officer, may cancel it.
    public async Task<BookingDto> CancelAsync(int id, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        var booking = await db.Bookings.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(BookingEntity), id);

        if (actingUserRole != Role.SuperAdmin && actingUserRole != Role.ScienceOfficer && booking.CreatedByUserId != actingUserId)
        {
            throw new ForbiddenException("Only the booking's creator or a Super Admin/Science Officer can cancel it.");
        }

        booking.Status = BookingStatus.Cancelled;
        booking.ModifiedByUserId = actingUserId;
        booking.ModifiedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private async Task<BookingDto> TransitionAsync(int id, BookingStatus newStatus, int actingUserId, int approvedByUserId, CancellationToken cancellationToken)
    {
        var booking = await db.Bookings.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(BookingEntity), id);

        booking.Status = newStatus;
        booking.ApprovedByUserId = approvedByUserId;
        booking.ModifiedByUserId = actingUserId;
        booking.ModifiedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<BookingEntity, BookingDto>> ProjectToDto = b => new BookingDto
    {
        Id = b.Id,
        ScheduledStart = b.ScheduledStart,
        ScheduledEnd = b.ScheduledEnd,
        Status = b.Status,
        EquipmentId = b.EquipmentId,
        EquipmentName = b.Equipment.Name,
        ResearcherId = b.Actor.ResearcherId,
        ActorDisplayName = b.Actor.DisplayNameSnapshot,
        CreatedByUserId = b.CreatedByUserId,
        CreatedAt = b.CreatedAt,
        ApprovedByUserId = b.ApprovedByUserId,
        ModifiedAt = b.ModifiedAt,
    };
}
