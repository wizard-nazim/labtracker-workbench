using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.Application.Modules.Notifications;
using Microsoft.EntityFrameworkCore;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;

namespace LabTracker.Application.Modules.Booking;

public class BookingService(IApplicationDbContext db, IValidator<CreateBookingRequest> createValidator, UsageActorResolver actorResolver, NotificationService notifications)
{
    // Researchers only ever see their own bookings; a Principal Investigator sees
    // bookings across the research group(s) they lead (lab-wide, not just their
    // own); Super Admins and Science Officers see everything department-wide,
    // per the brief's "personal bookings" vs "view bookings" split.
    public async Task<List<BookingDto>> GetAllAsync(BookingFilter filter, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        var query = db.Bookings.AsQueryable();

        if (actingUserRole == Role.Researcher)
        {
            query = query.Where(b => b.Actor.ResearcherId != null && b.Actor.Researcher!.UserId == actingUserId);
        }
        else if (actingUserRole == Role.PrincipalInvestigator)
        {
            var ledGroupIds = db.ResearchGroups
                .Where(g => g.PrincipalInvestigator.UserId == actingUserId)
                .Select(g => g.Id);
            query = query.Where(b => b.Actor.ResearcherId != null && b.Actor.Researcher!.ResearchGroups.Any(g => ledGroupIds.Contains(g.Id)));
        }

        if (filter.EquipmentId is { } equipmentId) query = query.Where(b => b.EquipmentId == equipmentId);
        if (filter.Status is { } status) query = query.Where(b => b.Status == status);

        var bookings = await query.OrderByDescending(b => b.ScheduledStart).Select(ProjectToDto).ToListAsync(cancellationToken);
        await ApplyViewerFieldsAsync(bookings, actingUserId, actingUserRole, cancellationToken);
        return bookings;
    }

    public async Task<BookingDto> GetByIdAsync(int id, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        var booking = await db.Bookings.Where(b => b.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(BookingEntity), id);
        await ApplyViewerFieldsAsync([booking], actingUserId, actingUserRole, cancellationToken);
        return booking;
    }

    // Roles allowed to book equipment on behalf of a visiting/external person —
    // a plain Researcher has no supervisory/hosting relationship to a visitor in
    // this system's role model, so isn't included. Keep this in sync with the
    // equivalent role gate in the frontend's book-equipment-dialog.tsx.
    private static readonly Role[] ExternalBookingRoles = [Role.SuperAdmin, Role.ScienceOfficer, Role.PrincipalInvestigator];

    public async Task<BookingDto> CreateAsync(CreateBookingRequest request, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        // Who the booking is *for* decides internal-vs-external (and therefore
        // auto-approval), not who's creating it — a Super Admin booking on behalf
        // of an internal researcher without a login must still auto-approve, same
        // as a Science Officer/Principal Investigator booking for themselves.
        var selfResearcherId = await db.Researchers.Where(r => r.UserId == actingUserId).Select(r => r.Id).SingleOrDefaultAsync(cancellationToken);

        ActorType actorType;
        int? researcherId = null;
        int? externalContactId = null;
        var needsSelfResearcherProvisioning = false;

        // Checked first: booking for a visitor is an explicit, role-gated choice,
        // so it must win even when the acting user has their own Researcher
        // profile (which every Science Officer/PI gets on their first self-booking).
        if (request.ExternalContactId is { } explicitContactId)
        {
            if (!ExternalBookingRoles.Contains(actingUserRole))
            {
                throw new ForbiddenException("Only a Super Admin, Science Officer, or Principal Investigator can book on behalf of an external visitor.");
            }

            actorType = ActorType.External;
            externalContactId = explicitContactId;
        }
        else if (selfResearcherId != 0)
        {
            // Anyone with their own linked Researcher profile (a plain Researcher, or
            // a Science Officer/Principal Investigator who also has one) books for
            // themselves — any ResearcherId in the request body is ignored in that
            // case, to prevent booking on another internal person's behalf.
            actorType = ActorType.Internal;
            researcherId = selfResearcherId;
        }
        else if (request.ResearcherId is { } explicitResearcherId)
        {
            actorType = ActorType.Internal;
            researcherId = explicitResearcherId;
        }
        else if (actingUserRole != Role.SuperAdmin)
        {
            // Self-booking, but this login has no linked Researcher profile yet
            // (e.g. a Science Officer/Researcher account created via Admin > Users
            // without a separate Admin > Researchers link). Provisioning the bare
            // profile happens after validation below, so a validation failure (e.g.
            // equipment unavailable) never leaves a stray Researcher row behind.
            // SuperAdmin is excluded: they manage the system rather than use it, so
            // they never get a self-booking path at all.
            actorType = ActorType.Internal;
            needsSelfResearcherProvisioning = true;
        }
        else
        {
            throw new FluentValidation.ValidationException(
                [new FluentValidation.Results.ValidationFailure(nameof(request.ResearcherId), "ResearcherId or ExternalContactId is required when booking on behalf of someone else.")]);
        }

        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        if (needsSelfResearcherProvisioning)
        {
            var fullName = await db.PrincipalInvestigators
                .Where(pi => pi.UserId == actingUserId)
                .Select(pi => pi.FullName)
                .SingleOrDefaultAsync(cancellationToken)
                ?? await db.Users.Where(u => u.Id == actingUserId).Select(u => u.Email).SingleAsync(cancellationToken);

            var newResearcher = new Domain.Modules.Organization.Researcher
            {
                FullName = fullName,
                StudentNumber = string.Empty,
                UserId = actingUserId,
            };
            db.Researchers.Add(newResearcher);
            await db.SaveChangesAsync(cancellationToken);

            researcherId = newResearcher.Id;
        }

        var actorId = actorType == ActorType.Internal
            ? await actorResolver.GetOrCreateInternalActorAsync(researcherId!.Value, cancellationToken)
            : await actorResolver.GetOrCreateExternalActorAsync(externalContactId!.Value, cancellationToken);

        // Internal bookings (anyone already in the system) are auto-approved —
        // no manual step. External/visiting bookings still need approval from a
        // Super Admin/Science Officer (see ApproveAsync/RejectAsync).
        var isAutoApproved = actorType == ActorType.Internal;

        var booking = new BookingEntity
        {
            EquipmentId = request.EquipmentId,
            ActorId = actorId,
            ScheduledStart = request.ScheduledStart,
            ScheduledEnd = request.ScheduledEnd,
            Status = isAutoApproved ? BookingStatus.Approved : BookingStatus.Requested,
            ApprovedByUserId = isAutoApproved ? actingUserId : null,
            Notes = request.Notes,
            CreatedByUserId = actingUserId,
            CreatedAt = DateTime.UtcNow,
        };
        db.Bookings.Add(booking);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(booking.Id, actingUserId, actingUserRole, cancellationToken);
    }

    public async Task<BookingDto> ApproveAsync(int id, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
        => await TransitionAsync(id, BookingStatus.Approved, actingUserId, actingUserRole, cancellationToken);

    public async Task<BookingDto> RejectAsync(int id, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
        => await TransitionAsync(id, BookingStatus.Rejected, actingUserId, actingUserRole, cancellationToken);

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

        return await GetByIdAsync(id, actingUserId, actingUserRole, cancellationToken);
    }

    // A Super Admin may approve/reject any booking; a Science Officer only for
    // equipment they're directly assigned to, or that belongs to a Facility
    // they oversee — mirroring EquipmentService.UpdateStatusAsync's scoping.
    // Only a still-Requested booking can be decided; ApprovedByUserId is only
    // written on approval (ModifiedByUserId records who rejected).
    private async Task<BookingDto> TransitionAsync(int id, BookingStatus newStatus, int actingUserId, Role actingUserRole, CancellationToken cancellationToken)
    {
        var booking = await db.Bookings.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(BookingEntity), id);

        if (actingUserRole != Role.SuperAdmin
            && !await ApprovableEquipmentIds(actingUserId).ContainsAsync(booking.EquipmentId, cancellationToken))
        {
            throw new ForbiddenException("Only a Super Admin, or a Science Officer assigned to this equipment or its facility, can approve/reject this booking.");
        }

        if (booking.Status != BookingStatus.Requested)
        {
            throw new ConflictException($"This booking is already {booking.Status.ToString().ToLowerInvariant()} and can no longer be approved or rejected.");
        }

        booking.Status = newStatus;
        if (newStatus == BookingStatus.Approved) booking.ApprovedByUserId = actingUserId;
        booking.ModifiedByUserId = actingUserId;
        booking.ModifiedAt = DateTime.UtcNow;
        await notifications.NotifyBookingDecidedAsync(booking, cancellationToken);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            // Someone else decided it between our read and our write (Booking's
            // xmin concurrency token, see BookingConfiguration). Their decision
            // stands; ours — and its notification — is rolled back with the save.
            throw new ConflictException("This booking was just approved or rejected by someone else and can no longer be changed.");
        }

        return await GetByIdAsync(id, actingUserId, actingUserRole, cancellationToken);
    }

    // Equipment a (non-Super-Admin) user may approve bookings for: directly
    // assigned as a Science Officer, or overseeing the equipment's Facility.
    private IQueryable<int> ApprovableEquipmentIds(int userId) =>
        db.EquipmentScienceOfficers.Where(so => so.UserId == userId).Select(so => so.EquipmentId)
            .Concat(db.Equipment
                .Where(e => e.Room.Facility != null && e.Room.Facility.Overseers.Any(u => u.Id == userId))
                .Select(e => e.Id));

    // Per-viewer fields: CanApprove (so the frontend only shows Approve/Reject
    // where the backend would allow it) and hiding ActorPhone from non-staff.
    private async Task ApplyViewerFieldsAsync(IReadOnlyCollection<BookingDto> bookings, int actingUserId, Role actingUserRole, CancellationToken cancellationToken)
    {
        if (actingUserRole is not (Role.SuperAdmin or Role.ScienceOfficer))
        {
            foreach (var b in bookings) b.ActorPhone = null;
            return;
        }
        if (!bookings.Any(b => b.Status == BookingStatus.Requested)) return;

        HashSet<int>? approvable = actingUserRole == Role.SuperAdmin
            ? null
            : (await ApprovableEquipmentIds(actingUserId).ToListAsync(cancellationToken)).ToHashSet();

        foreach (var b in bookings)
        {
            b.CanApprove = b.Status == BookingStatus.Requested && (approvable is null || approvable.Contains(b.EquipmentId));
        }
    }

    private static readonly System.Linq.Expressions.Expression<Func<BookingEntity, BookingDto>> ProjectToDto = b => new BookingDto
    {
        Id = b.Id,
        ScheduledStart = b.ScheduledStart,
        ScheduledEnd = b.ScheduledEnd,
        Status = b.Status,
        EquipmentId = b.EquipmentId,
        EquipmentName = b.Equipment.Name,
        RoomLabel = b.Equipment.Room.Building + " " + b.Equipment.Room.Floor + " " + b.Equipment.Room.RoomNumber,
        ActorType = b.Actor.ActorType,
        ResearcherId = b.Actor.ResearcherId,
        ExternalContactId = b.Actor.ExternalContactId,
        ActorDisplayName = b.Actor.DisplayNameSnapshot,
        ActorRole = b.Actor.ResearcherId != null && b.Actor.Researcher!.UserId != null ? b.Actor.Researcher!.User!.Role : (Role?)null,
        ActorPhone = b.Actor.ExternalContactId != null
            ? b.Actor.ExternalContact!.Phone
            : b.Actor.ResearcherId != null && b.Actor.Researcher!.UserId != null ? b.Actor.Researcher!.User!.Phone : null,
        Notes = b.Notes,
        CreatedByUserId = b.CreatedByUserId,
        CreatedAt = b.CreatedAt,
        ApprovedByUserId = b.ApprovedByUserId,
        ModifiedAt = b.ModifiedAt,
    };
}
