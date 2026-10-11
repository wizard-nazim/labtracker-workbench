using FluentValidation;
using FluentValidation.Results;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.Application.Modules.Notifications;
using Microsoft.EntityFrameworkCore;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;
using EquipmentScienceOfficerEntity = LabTracker.Domain.Modules.Equipment.EquipmentScienceOfficer;

namespace LabTracker.Application.Modules.Equipment;

public class EquipmentFilter
{
    public int? EquipmentTypeId { get; set; }
    public int? RoomId { get; set; }
    public EquipmentStatus? Status { get; set; }
    public bool? IsShared { get; set; }

    // Archived (Retired) equipment is hidden unless asked for, or unless
    // Status=Retired is requested explicitly.
    public bool IncludeArchived { get; set; }

    // name (default) | createdAt | updatedAt, and asc (default) | desc.
    public string? Sort { get; set; }
    public string? Dir { get; set; }
}

public class EquipmentService(
    IApplicationDbContext db,
    IValidator<UpsertEquipmentRequest> upsertValidator,
    IValidator<AssignScienceOfficerRequest> assignScienceOfficerValidator,
    NotificationService notifications)
{
    public async Task<List<EquipmentDto>> GetAllAsync(EquipmentFilter filter, CancellationToken cancellationToken = default)
    {
        var query = db.Equipment.AsQueryable();

        if (filter.EquipmentTypeId is { } typeId) query = query.Where(e => e.EquipmentTypeId == typeId);
        if (filter.RoomId is { } roomId) query = query.Where(e => e.RoomId == roomId);
        if (filter.Status is { } status) query = query.Where(e => e.Status == status);
        if (filter.IsShared is { } isShared) query = query.Where(e => e.IsShared == isShared);
        if (!filter.IncludeArchived && filter.Status is null) query = query.Where(e => e.Status != EquipmentStatus.Retired);

        var descending = (filter.Dir?.Trim().ToLowerInvariant()) switch
        {
            null or "" or "asc" => false,
            "desc" => true,
            _ => throw InvalidField(nameof(EquipmentFilter.Dir), "Dir must be 'asc' or 'desc'."),
        };

        IOrderedQueryable<EquipmentEntity> ordered = (filter.Sort?.Trim().ToLowerInvariant()) switch
        {
            null or "" or "name" => descending ? query.OrderByDescending(e => e.Name) : query.OrderBy(e => e.Name),
            "createdat" => (descending ? query.OrderByDescending(e => e.CreatedAt) : query.OrderBy(e => e.CreatedAt)).ThenBy(e => e.Name),
            "updatedat" => (descending ? query.OrderByDescending(e => e.UpdatedAt) : query.OrderBy(e => e.UpdatedAt)).ThenBy(e => e.Name),
            _ => throw InvalidField(nameof(EquipmentFilter.Sort), "Sort must be 'name', 'createdAt' or 'updatedAt'."),
        };

        var results = await ordered.ThenBy(e => e.Id).Select(ProjectToDto).ToListAsync(cancellationToken);
        await FillOwnerNamesAsync(results, cancellationToken);
        return results;
    }

    public async Task<EquipmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var dto = await db.Equipment.Where(e => e.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);

        await FillOwnerNamesAsync([dto], cancellationToken);
        return dto;
    }

    public async Task<EquipmentDto> CreateAsync(UpsertEquipmentRequest request, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        await EnsureCanManageEquipmentAsync(actingUserId, actingUserRole, cancellationToken);
        await upsertValidator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureOwnerIsActiveIfChangedAsync(previousOwnerUserId: null, request, cancellationToken);
        await EnsureCanSetResearchGroupAsync(previousResearchGroupId: null, request, actingUserId, actingUserRole, cancellationToken);

        var now = DateTime.UtcNow;
        var equipment = new EquipmentEntity
        {
            Name = request.Name,
            SerialNumber = request.SerialNumber,
            Description = request.Description,
            IsShared = request.IsShared,
            ImageUrl = request.ImageUrl,
            IconKey = request.IconKey,
            EquipmentTypeId = request.EquipmentTypeId,
            RoomId = request.RoomId,
            OwningDepartmentId = request.OwningDepartmentId,
            OwnershipType = request.OwnershipType ?? OwnershipType.Department,
            OwnerUserId = OwnerFor(request),
            ResearchGroupId = request.OwnershipType is null ? null : request.ResearchGroupId,
            Status = EquipmentStatus.Available,
            CreatedAt = now,
            UpdatedAt = now,
        };
        db.Equipment.Add(equipment);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(equipment.Id, cancellationToken);
    }

    public async Task<EquipmentDto> UpdateAsync(int id, UpsertEquipmentRequest request, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        await EnsureCanManageEquipmentAsync(actingUserId, actingUserRole, cancellationToken);
        await upsertValidator.ValidateAndThrowAsync(request, cancellationToken);

        var equipment = await db.Equipment.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);

        await EnsureOwnerIsActiveIfChangedAsync(equipment.OwnerUserId, request, cancellationToken);
        await EnsureCanSetResearchGroupAsync(equipment.ResearchGroupId, request, actingUserId, actingUserRole, cancellationToken);

        var noteChanged = NormalizeNote(equipment.Description) != NormalizeNote(request.Description);

        equipment.Name = request.Name;
        equipment.SerialNumber = request.SerialNumber;
        equipment.Description = request.Description;
        equipment.IsShared = request.IsShared;
        equipment.ImageUrl = request.ImageUrl;
        equipment.IconKey = request.IconKey;
        equipment.EquipmentTypeId = request.EquipmentTypeId;
        equipment.RoomId = request.RoomId;
        equipment.OwningDepartmentId = request.OwningDepartmentId;
        if (request.OwnershipType is { } ownershipType)
        {
            equipment.OwnershipType = ownershipType;
            equipment.OwnerUserId = OwnerFor(request);
            equipment.ResearchGroupId = request.ResearchGroupId;
        }
        equipment.UpdatedAt = DateTime.UtcNow;

        if (noteChanged)
        {
            var note = NormalizeNote(request.Description);
            await notifications.BroadcastEquipmentChangeAsync(
                equipment,
                $"{equipment.Name}: note updated",
                note is null ? "The note on this equipment was removed." : Truncate(note, 300),
                actingUserId,
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    // Super Admins can change any equipment's status; a Science Officer only for
    // equipment they're assigned to (primary or backup) — this is the one place
    // that business rule is enforced, per the brief's "manage equipment assigned to them".
    public async Task<EquipmentDto> UpdateStatusAsync(
        int id, EquipmentStatus newStatus, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        var equipment = await db.Equipment.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);

        if (actingUserRole != Role.SuperAdmin)
        {
            var isAssignedScienceOfficer = await db.EquipmentScienceOfficers
                .AnyAsync(so => so.EquipmentId == id && so.UserId == actingUserId, cancellationToken);

            if (!isAssignedScienceOfficer)
            {
                throw new ForbiddenException("Only a Super Admin or a Science Officer assigned to this equipment can change its status.");
            }
        }

        // Retiring is archiving by another route, so it gets the same guard.
        if (newStatus == EquipmentStatus.Retired && equipment.Status != EquipmentStatus.Retired)
        {
            await EnsureNoLiveBookingsAsync(id, cancellationToken);
        }

        await ApplyStatusChangeAsync(equipment, newStatus, actingUserId, cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    // Archiving reuses the Retired status (bookings are already refused for
    // it). Refused while there are bookings still to come or in progress, so
    // nobody turns up for equipment that's been put away.
    public async Task<EquipmentDto> ArchiveAsync(int id, int actingUserId, CancellationToken cancellationToken = default)
    {
        var equipment = await db.Equipment.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);

        if (equipment.Status != EquipmentStatus.Retired)
        {
            await EnsureNoLiveBookingsAsync(id, cancellationToken);

            await ApplyStatusChangeAsync(equipment, EquipmentStatus.Retired, actingUserId, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        return await GetByIdAsync(id, cancellationToken);
    }

    // Puts archived equipment back in service. A no-op for equipment that
    // isn't archived, so it never flips e.g. Faulty equipment to Available.
    public async Task<EquipmentDto> UnarchiveAsync(int id, int actingUserId, CancellationToken cancellationToken = default)
    {
        var equipment = await db.Equipment.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);

        if (equipment.Status == EquipmentStatus.Retired)
        {
            await ApplyStatusChangeAsync(equipment, EquipmentStatus.Available, actingUserId, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        return await GetByIdAsync(id, cancellationToken);
    }

    // Only for equipment with no history at all — anything that has been
    // booked or used is kept (archive it instead) so reports stay intact.
    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var equipment = await db.Equipment.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);

        var hasHistory = await db.Bookings.AnyAsync(b => b.EquipmentId == id, cancellationToken)
            || await db.UsageRecords.AnyAsync(u => u.EquipmentId == id, cancellationToken);
        if (hasHistory)
        {
            throw new ConflictException("Has bookings or usage history — archive instead.");
        }

        var assignments = await db.EquipmentScienceOfficers.Where(so => so.EquipmentId == id).ToListAsync(cancellationToken);
        db.EquipmentScienceOfficers.RemoveRange(assignments);
        db.Equipment.Remove(equipment);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<EquipmentDto> AssignScienceOfficerAsync(int equipmentId, AssignScienceOfficerRequest request, CancellationToken cancellationToken = default)
    {
        await assignScienceOfficerValidator.ValidateAndThrowAsync(request, cancellationToken);

        if (!await db.Equipment.AnyAsync(e => e.Id == equipmentId, cancellationToken))
        {
            throw new NotFoundException(nameof(EquipmentEntity), equipmentId);
        }

        if (request.IsPrimary)
        {
            var currentPrimary = await db.EquipmentScienceOfficers
                .Where(so => so.EquipmentId == equipmentId && so.IsPrimary && so.UserId != request.UserId)
                .ToListAsync(cancellationToken);
            foreach (var so in currentPrimary)
            {
                so.IsPrimary = false;
            }
        }

        var existing = await db.EquipmentScienceOfficers
            .SingleOrDefaultAsync(so => so.EquipmentId == equipmentId && so.UserId == request.UserId, cancellationToken);

        if (existing is null)
        {
            db.EquipmentScienceOfficers.Add(new EquipmentScienceOfficerEntity
            {
                EquipmentId = equipmentId,
                UserId = request.UserId,
                IsPrimary = request.IsPrimary,
            });
        }
        else
        {
            existing.IsPrimary = request.IsPrimary;
        }

        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(equipmentId, cancellationToken);
    }

    public async Task RemoveScienceOfficerAsync(int equipmentId, int userId, CancellationToken cancellationToken = default)
    {
        var assignment = await db.EquipmentScienceOfficers
            .SingleOrDefaultAsync(so => so.EquipmentId == equipmentId && so.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentScienceOfficerEntity), $"{equipmentId}/{userId}");

        db.EquipmentScienceOfficers.Remove(assignment);
        await db.SaveChangesAsync(cancellationToken);
    }

    // SuperAdmin always can; a Principal Investigator only if granted equipment
    // permissions — mirrors the eligibility check in AssignScienceOfficerRequestValidator.
    private async Task EnsureCanManageEquipmentAsync(int actingUserId, Role actingUserRole, CancellationToken cancellationToken)
    {
        if (actingUserRole == Role.SuperAdmin) return;

        var hasPermission = actingUserRole == Role.PrincipalInvestigator
            && await db.PrincipalInvestigators.AnyAsync(pi => pi.UserId == actingUserId && pi.HasEquipmentPermissions, cancellationToken);

        if (!hasPermission)
        {
            throw new ForbiddenException("Only a Super Admin or a Principal Investigator with equipment permissions can manage equipment.");
        }
    }

    private async Task ApplyStatusChangeAsync(EquipmentEntity equipment, EquipmentStatus newStatus, int actingUserId, CancellationToken cancellationToken)
    {
        var previousStatus = equipment.Status;
        equipment.Status = newStatus;
        if (previousStatus != newStatus) equipment.UpdatedAt = DateTime.UtcNow;

        // Going out of service, or coming back into it, is worth telling people
        // about; a no-op or a move between two out-of-service states isn't.
        var wasInService = previousStatus == EquipmentStatus.Available;
        var isInService = newStatus == EquipmentStatus.Available;
        if (wasInService != isInService)
        {
            await notifications.BroadcastEquipmentChangeAsync(
                equipment,
                isInService ? $"{equipment.Name} is available again" : $"{equipment.Name} is {DescribeStatus(newStatus)}",
                isInService
                    ? "It can be booked again."
                    : "It can't be used until it's back in service. Existing bookings may be affected.",
                actingUserId,
                cancellationToken);
        }
    }

    private async Task EnsureNoLiveBookingsAsync(int equipmentId, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var liveBookings = await db.Bookings.CountAsync(b =>
            b.EquipmentId == equipmentId
            && (b.Status == BookingStatus.Requested || b.Status == BookingStatus.Approved)
            && b.ScheduledEnd > now, cancellationToken);

        if (liveBookings > 0)
        {
            throw new ConflictException(
                $"Has {liveBookings} upcoming or in-progress booking{(liveBookings == 1 ? "" : "s")} — cancel or reject {(liveBookings == 1 ? "it" : "them")} before archiving.");
        }
    }

    private static int? OwnerFor(UpsertEquipmentRequest request)
        => request.OwnershipType == OwnershipType.Individual ? request.OwnerUserId : null;

    // A deactivated person, or someone without an owner-eligible role, can't be
    // newly made an owner, but equipment they already own stays editable (the
    // owner is only re-checked when it changes).
    private async Task EnsureOwnerIsActiveIfChangedAsync(int? previousOwnerUserId, UpsertEquipmentRequest request, CancellationToken cancellationToken)
    {
        var ownerUserId = OwnerFor(request);
        if (ownerUserId is null || ownerUserId == previousOwnerUserId) return;

        var owner = await db.Users.AsNoTracking()
            .Where(u => u.Id == ownerUserId)
            .Select(u => new { u.Role, u.IsActive })
            .SingleOrDefaultAsync(cancellationToken);
        if (owner is null || owner.Role is not (Role.ScienceOfficer or Role.Researcher or Role.PrincipalInvestigator))
        {
            throw InvalidField(nameof(UpsertEquipmentRequest.OwnerUserId), "OwnerUserId must reference a Science Officer, Researcher or Principal Investigator.");
        }
        if (!owner.IsActive)
        {
            throw InvalidField(nameof(UpsertEquipmentRequest.OwnerUserId), "OwnerUserId references a deactivated user; activate them first or choose someone else.");
        }
    }

    // A Principal Investigator manages equipment for their own lab only, so
    // they may only assign a lab they lead. Re-checked only when the lab
    // changes, so editing other fields of equipment an admin assigned to
    // another lab still works.
    private async Task EnsureCanSetResearchGroupAsync(
        int? previousResearchGroupId, UpsertEquipmentRequest request, int actingUserId, Role actingUserRole, CancellationToken cancellationToken)
    {
        if (actingUserRole != Role.PrincipalInvestigator) return;
        if (request.OwnershipType is null) return;
        if (request.ResearchGroupId is not { } groupId || groupId == previousResearchGroupId) return;

        var leadsGroup = await db.ResearchGroups.AnyAsync(
            g => g.Id == groupId && g.PrincipalInvestigator.UserId == actingUserId, cancellationToken);
        if (!leadsGroup)
        {
            throw new ForbiddenException("A Principal Investigator can only assign equipment to a lab they lead.");
        }
    }

    // User has no name of its own — use the linked PI or researcher profile's
    // name when there is one, falling back to the login email the projection set.
    private async Task FillOwnerNamesAsync(List<EquipmentDto> results, CancellationToken cancellationToken)
    {
        var ownerIds = results.Where(r => r.Owner is not null).Select(r => r.Owner!.Id).Distinct().ToList();
        if (ownerIds.Count == 0) return;

        var piNames = await db.PrincipalInvestigators
            .Where(pi => pi.UserId != null && ownerIds.Contains(pi.UserId.Value))
            .Select(pi => new { UserId = pi.UserId!.Value, pi.FullName })
            .ToListAsync(cancellationToken);
        var researcherNames = await db.Researchers
            .Where(r => r.UserId != null && ownerIds.Contains(r.UserId.Value))
            .Select(r => new { UserId = r.UserId!.Value, r.FullName })
            .ToListAsync(cancellationToken);

        var names = new Dictionary<int, string>();
        foreach (var r in researcherNames) names[r.UserId] = r.FullName;
        foreach (var pi in piNames) names[pi.UserId] = pi.FullName;

        foreach (var owner in results.Select(r => r.Owner).OfType<EntityReferenceDto>())
        {
            if (names.TryGetValue(owner.Id, out var name) && !string.IsNullOrWhiteSpace(name)) owner.Name = name;
        }
    }

    private static ValidationException InvalidField(string propertyName, string message)
        => new([new ValidationFailure(propertyName, message)]);

    private static readonly System.Linq.Expressions.Expression<Func<EquipmentEntity, EquipmentDto>> ProjectToDto = e => new EquipmentDto
    {
        Id = e.Id,
        Name = e.Name,
        SerialNumber = e.SerialNumber,
        Description = e.Description,
        IsShared = e.IsShared,
        Status = e.Status,
        ImageUrl = e.ImageUrl,
        IconKey = e.IconKey,
        EquipmentTypeId = e.EquipmentTypeId,
        EquipmentTypeName = e.EquipmentType.Name,
        RoomId = e.RoomId,
        RoomLabel = e.Room.Building + " " + e.Room.Floor + " " + e.Room.RoomNumber,
        FacilityName = e.Room.Facility != null ? e.Room.Facility.Name : null,
        OwningDepartmentId = e.OwningDepartmentId,
        OwningDepartmentName = e.OwningDepartment.Name,
        OwnershipType = e.OwnershipType,
        Owner = e.OwnerUser != null ? new EntityReferenceDto { Id = e.OwnerUser.Id, Name = e.OwnerUser.Email } : null,
        ResearchGroup = e.ResearchGroup != null ? new EntityReferenceDto { Id = e.ResearchGroup.Id, Name = e.ResearchGroup.Name } : null,
        CreatedAt = e.CreatedAt,
        UpdatedAt = e.UpdatedAt,
        ScienceOfficers = e.ScienceOfficers.Select(so => new ScienceOfficerAssignmentDto
        {
            UserId = so.UserId,
            Email = so.User.Email,
            IsPrimary = so.IsPrimary,
        }).ToList(),
    };

    private static string? NormalizeNote(string? note) => string.IsNullOrWhiteSpace(note) ? null : note.Trim();

    private static string Truncate(string text, int max) => text.Length <= max ? text : text[..(max - 1)] + "…";

    private static string DescribeStatus(EquipmentStatus status) => status switch
    {
        EquipmentStatus.Faulty => "marked faulty",
        EquipmentStatus.UnderMaintenance => "under maintenance",
        EquipmentStatus.Retired => "retired",
        _ => status.ToString().ToLowerInvariant(),
    };
}
