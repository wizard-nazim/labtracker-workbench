using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
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
    IValidator<AssignScienceOfficerRequest> assignScienceOfficerValidator)
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

    public async Task<EquipmentDto> CreateAsync(UpsertEquipmentRequest request, CancellationToken cancellationToken = default)
    {
        await upsertValidator.ValidateAndThrowAsync(request, cancellationToken);

        var equipment = new EquipmentEntity
        {
            Name = request.Name,
            SerialNumber = request.SerialNumber,
            Description = request.Description,
            IsShared = request.IsShared,
            EquipmentTypeId = request.EquipmentTypeId,
            RoomId = request.RoomId,
            OwningDepartmentId = request.OwningDepartmentId,
            Status = EquipmentStatus.Available,
        };
        db.Equipment.Add(equipment);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(equipment.Id, cancellationToken);
    }

    public async Task<EquipmentDto> UpdateAsync(int id, UpsertEquipmentRequest request, CancellationToken cancellationToken = default)
    {
        await upsertValidator.ValidateAndThrowAsync(request, cancellationToken);

        var equipment = await db.Equipment.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentEntity), id);

        equipment.Name = request.Name;
        equipment.SerialNumber = request.SerialNumber;
        equipment.Description = request.Description;
        equipment.IsShared = request.IsShared;
        equipment.EquipmentTypeId = request.EquipmentTypeId;
        equipment.RoomId = request.RoomId;
        equipment.OwningDepartmentId = request.OwningDepartmentId;
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

        equipment.Status = newStatus;
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

    private static readonly System.Linq.Expressions.Expression<Func<EquipmentEntity, EquipmentDto>> ProjectToDto = e => new EquipmentDto
    {
        Id = e.Id,
        Name = e.Name,
        SerialNumber = e.SerialNumber,
        Description = e.Description,
        IsShared = e.IsShared,
        Status = e.Status,
        EquipmentTypeId = e.EquipmentTypeId,
        EquipmentTypeName = e.EquipmentType.Name,
        RoomId = e.RoomId,
        RoomLabel = e.Room.Building + " " + e.Room.Floor + " " + e.Room.RoomNumber,
        OwningDepartmentId = e.OwningDepartmentId,
        OwningDepartmentName = e.OwningDepartment.Name,
        ScienceOfficers = e.ScienceOfficers.Select(so => new ScienceOfficerAssignmentDto
        {
            UserId = so.UserId,
            Email = so.User.Email,
            IsPrimary = so.IsPrimary,
        }).ToList(),
    };
}
