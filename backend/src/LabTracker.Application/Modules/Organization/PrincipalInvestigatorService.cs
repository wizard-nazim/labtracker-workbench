using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using PrincipalInvestigatorEntity = LabTracker.Domain.Modules.Organization.PrincipalInvestigator;

namespace LabTracker.Application.Modules.Organization;

public class PrincipalInvestigatorService(IApplicationDbContext db, IValidator<UpsertPrincipalInvestigatorRequest> validator)
{
    public async Task<List<PrincipalInvestigatorDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.PrincipalInvestigators
            .OrderBy(p => p.FullName)
            .Select(ProjectToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<PrincipalInvestigatorDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.PrincipalInvestigators.Where(p => p.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(PrincipalInvestigatorEntity), id);
    }

    public async Task<PrincipalInvestigatorDto> CreateAsync(UpsertPrincipalInvestigatorRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var pi = new PrincipalInvestigatorEntity
        {
            FullName = request.FullName,
            Email = request.Email,
            DepartmentId = request.DepartmentId,
        };
        db.PrincipalInvestigators.Add(pi);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(pi.Id, cancellationToken);
    }

    public async Task<PrincipalInvestigatorDto> UpdateAsync(int id, UpsertPrincipalInvestigatorRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var pi = await db.PrincipalInvestigators.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(PrincipalInvestigatorEntity), id);

        pi.FullName = request.FullName;
        pi.Email = request.Email;
        pi.DepartmentId = request.DepartmentId;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<PrincipalInvestigatorEntity, PrincipalInvestigatorDto>> ProjectToDto = p => new PrincipalInvestigatorDto
    {
        Id = p.Id,
        FullName = p.FullName,
        Email = p.Email,
        DepartmentId = p.DepartmentId,
        DepartmentName = p.Department.Name,
    };
}
