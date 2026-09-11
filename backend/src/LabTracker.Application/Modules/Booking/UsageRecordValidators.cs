using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Booking;

public class CreateUsageRecordRequestValidator : AbstractValidator<CreateUsageRecordRequest>
{
    public CreateUsageRecordRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.EquipmentId)
            .MustAsync((id, ct) => db.Equipment.AnyAsync(e => e.Id == id, ct))
            .WithMessage("EquipmentId does not reference an existing piece of equipment.");

        RuleFor(x => x.ActualEnd)
            .GreaterThan(x => x.ActualStart)
            .WithMessage("ActualEnd must be after ActualStart.");

        RuleFor(x => x.ActualEnd)
            .Must(end => end <= DateTime.UtcNow)
            .WithMessage("Usage cannot be recorded as ending in the future.");

        RuleFor(x => x)
            .MustAsync(async (request, ct) =>
            {
                if (request.BookingId is not { } bookingId) return true;

                var booking = await db.Bookings
                    .Where(b => b.Id == bookingId)
                    .Select(b => new { b.EquipmentId, b.Status })
                    .SingleOrDefaultAsync(ct);

                return booking is not null
                    && booking.EquipmentId == request.EquipmentId
                    && (booking.Status == BookingStatus.Requested || booking.Status == BookingStatus.Approved);
            })
            .WithName("BookingId")
            .WithMessage("BookingId must reference an existing, still-active booking for the same equipment.");

        RuleFor(x => x.ResearcherId)
            .NotNull()
            .WithMessage("ResearcherId is required when recording walk-in usage without a booking.")
            .When(x => !x.BookingId.HasValue);

        RuleFor(x => x.ResearcherId)
            .MustAsync((id, ct) => db.Researchers.AnyAsync(r => r.Id == id, ct))
            .When(x => !x.BookingId.HasValue && x.ResearcherId.HasValue)
            .WithMessage("ResearcherId does not reference an existing researcher.");
    }
}
