using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using FacilityEntity = LabTracker.Domain.Modules.Organization.Facility;

namespace LabTracker.Application.Modules.Organization;

public class FacilityService(IApplicationDbContext db, IValidator<UpsertFacilityRequest> validator)
{
    public async Task<List<FacilityDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Facilities
            .Include(f => f.Department)
            .Include(f => f.Overseers)
            .OrderBy(f => f.Name)
            .Select(f => ToDto(f))
            .ToListAsync(cancellationToken);
    }

    public async Task<FacilityDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var facility = await db.Facilities
            .Include(f => f.Department)
            .Include(f => f.Overseers)
            .SingleOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw new NotFoundException(nameof(FacilityEntity), id);

        return ToDto(facility);
    }

    public async Task<FacilityDto> CreateAsync(UpsertFacilityRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var overseers = await db.Users.Where(u => request.OverseerUserIds.Contains(u.Id)).ToListAsync(cancellationToken);

        var facility = new FacilityEntity
        {
            Name = request.Name,
            DepartmentId = request.DepartmentId,
            Overseers = overseers,
        };
        db.Facilities.Add(facility);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(facility.Id, cancellationToken);
    }

    public async Task<FacilityDto> UpdateAsync(int id, UpsertFacilityRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var facility = await db.Facilities.Include(f => f.Overseers).SingleOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw new NotFoundException(nameof(FacilityEntity), id);

        var overseers = await db.Users.Where(u => request.OverseerUserIds.Contains(u.Id)).ToListAsync(cancellationToken);

        facility.Name = request.Name;
        facility.DepartmentId = request.DepartmentId;
        facility.Overseers.Clear();
        foreach (var overseer in overseers) facility.Overseers.Add(overseer);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private static FacilityDto ToDto(FacilityEntity f) => new()
    {
        Id = f.Id,
        Name = f.Name,
        DepartmentId = f.DepartmentId,
        DepartmentName = f.Department.Name,
        OverseerUserIds = f.Overseers.Select(o => o.Id).ToList(),
        OverseerEmails = f.Overseers.Select(o => o.Email).ToList(),
    };
}
