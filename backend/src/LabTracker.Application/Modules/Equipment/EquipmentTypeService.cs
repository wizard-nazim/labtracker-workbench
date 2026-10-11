using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using EquipmentTypeEntity = LabTracker.Domain.Modules.Equipment.EquipmentType;

namespace LabTracker.Application.Modules.Equipment;

public class EquipmentTypeService(IApplicationDbContext db, IValidator<UpsertEquipmentTypeRequest> validator)
{
    public async Task<List<EquipmentTypeDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.EquipmentTypes
            .OrderBy(t => t.Name)
            .Select(t => new EquipmentTypeDto { Id = t.Id, Name = t.Name })
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentTypeDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var type = await db.EquipmentTypes.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentTypeEntity), id);

        return new EquipmentTypeDto { Id = type.Id, Name = type.Name };
    }

    public async Task<EquipmentTypeDto> CreateAsync(UpsertEquipmentTypeRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var type = new EquipmentTypeEntity { Name = request.Name };
        db.EquipmentTypes.Add(type);
        await db.SaveChangesAsync(cancellationToken);

        return new EquipmentTypeDto { Id = type.Id, Name = type.Name };
    }

    public async Task<EquipmentTypeDto> UpdateAsync(int id, UpsertEquipmentTypeRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var type = await db.EquipmentTypes.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentTypeEntity), id);

        type.Name = request.Name;
        await db.SaveChangesAsync(cancellationToken);

        return new EquipmentTypeDto { Id = type.Id, Name = type.Name };
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var type = await db.EquipmentTypes.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentTypeEntity), id);

        var usedBy = await db.Equipment.CountAsync(e => e.EquipmentTypeId == id, cancellationToken);
        if (usedBy > 0)
        {
            throw new ConflictException($"In use by {usedBy} equipment.");
        }

        db.EquipmentTypes.Remove(type);
        await db.SaveChangesAsync(cancellationToken);
    }
}
