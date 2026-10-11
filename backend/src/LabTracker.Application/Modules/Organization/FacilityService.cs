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
            .Include(f => f.Rooms)
            .OrderBy(f => f.Name)
            .Select(f => ToDto(f))
            .ToListAsync(cancellationToken);
    }

    public async Task<FacilityDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var facility = await db.Facilities
            .Include(f => f.Department)
            .Include(f => f.Overseers)
            .Include(f => f.Rooms)
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

    // Rooms just stop being part of the facility (they and their equipment are
    // kept); overseer links are dropped. One SaveChanges, so it's all-or-nothing.
    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var facility = await db.Facilities
            .Include(f => f.Overseers)
            .Include(f => f.Rooms)
            .SingleOrDefaultAsync(f => f.Id == id, cancellationToken)
            ?? throw new NotFoundException(nameof(FacilityEntity), id);

        facility.Overseers.Clear();
        foreach (var room in facility.Rooms) room.FacilityId = null;
        db.Facilities.Remove(facility);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static FacilityDto ToDto(FacilityEntity f) => new()
    {
        Id = f.Id,
        Name = f.Name,
        DepartmentId = f.DepartmentId,
        DepartmentName = f.Department.Name,
        OverseerUserIds = f.Overseers.Select(o => o.Id).ToList(),
        OverseerEmails = f.Overseers.Select(o => o.Email).ToList(),
        RoomLabels = f.Rooms.Select(r => $"{r.Building} {r.Floor} {r.RoomNumber}").ToList(),
    };
}
