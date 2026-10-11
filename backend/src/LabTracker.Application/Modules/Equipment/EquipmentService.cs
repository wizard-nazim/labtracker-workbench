using FluentValidation;
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

        return await query.OrderBy(e => e.Name).Select(ProjectToDto).ToListAsync(cancellationToken);
    }

    public async Task<EquipmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.Equipment.Where(e => e.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);
    }

    public async Task<EquipmentDto> CreateAsync(UpsertEquipmentRequest request, int actingUserId, Role actingUserRole, CancellationToken cancellationToken = default)
    {
        await EnsureCanManageEquipmentAsync(actingUserId, actingUserRole, cancellationToken);
        await upsertValidator.ValidateAndThrowAsync(request, cancellationToken);

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

        var previousStatus = equipment.Status;
        equipment.Status = newStatus;

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

        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
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
