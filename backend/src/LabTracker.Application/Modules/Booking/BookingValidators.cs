using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Booking;

public class CreateBookingRequestValidator : AbstractValidator<CreateBookingRequest>
{
    public CreateBookingRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.EquipmentId)
            .MustAsync((id, ct) => db.Equipment.AnyAsync(e => e.Id == id, ct))
            .WithMessage("EquipmentId does not reference an existing piece of equipment.")
            .DependentRules(() =>
            {
                RuleFor(x => x.EquipmentId)
                    .MustAsync(async (id, ct) =>
                        await db.Equipment.Where(e => e.Id == id).Select(e => e.Status).SingleAsync(ct) == EquipmentStatus.Available)
                    .WithMessage("This equipment is not currently available (faulty, under maintenance, or retired).");
            });

        RuleFor(x => x.ScheduledEnd)
            .GreaterThan(x => x.ScheduledStart)
            .WithMessage("ScheduledEnd must be after ScheduledStart.");

        RuleFor(x => x.ScheduledStart)
            .Must(start => start >= DateTime.UtcNow)
            .WithMessage("A booking cannot start in the past.");

        RuleFor(x => x)
            .MustAsync((request, ct) => HasNoConflictAsync(db, request, ct))
            .WithName("ScheduledStart")
            .WithMessage("This equipment is already booked for an overlapping time range.");

        RuleFor(x => x.ResearcherId)
            .MustAsync((id, ct) => db.Researchers.AnyAsync(r => r.Id == id, ct))
            .When(x => x.ResearcherId.HasValue)
            .WithMessage("ResearcherId does not reference an existing researcher.");
    }

    private static async Task<bool> HasNoConflictAsync(IApplicationDbContext db, CreateBookingRequest request, CancellationToken ct)
    {
        return !await db.Bookings.AnyAsync(b =>
            b.EquipmentId == request.EquipmentId &&
            b.Status != BookingStatus.Cancelled && b.Status != BookingStatus.Rejected &&
            b.ScheduledStart < request.ScheduledEnd && b.ScheduledEnd > request.ScheduledStart, ct);
    }
}
