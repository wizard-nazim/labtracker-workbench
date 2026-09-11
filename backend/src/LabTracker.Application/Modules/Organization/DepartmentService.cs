using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using DepartmentEntity = LabTracker.Domain.Modules.Organization.Department;

namespace LabTracker.Application.Modules.Organization;

public class DepartmentService(IApplicationDbContext db, IValidator<UpsertDepartmentRequest> validator)
{
    public async Task<List<DepartmentDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Departments
            .OrderBy(d => d.Name)
            .Select(d => ToDto(d))
            .ToListAsync(cancellationToken);
    }

    public async Task<DepartmentDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var department = await db.Departments.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(DepartmentEntity), id);

        return ToDto(department);
    }

    public async Task<DepartmentDto> CreateAsync(UpsertDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var department = new DepartmentEntity { Name = request.Name, Code = request.Code };
        db.Departments.Add(department);
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(department);
    }

    public async Task<DepartmentDto> UpdateAsync(int id, UpsertDepartmentRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var department = await db.Departments.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(DepartmentEntity), id);

        department.Name = request.Name;
        department.Code = request.Code;
        await db.SaveChangesAsync(cancellationToken);

        return ToDto(department);
    }

    private static DepartmentDto ToDto(DepartmentEntity d) => new() { Id = d.Id, Name = d.Name, Code = d.Code };
}
