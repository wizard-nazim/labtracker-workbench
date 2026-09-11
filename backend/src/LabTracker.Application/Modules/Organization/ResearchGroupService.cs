using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using ResearchGroupEntity = LabTracker.Domain.Modules.Organization.ResearchGroup;

namespace LabTracker.Application.Modules.Organization;

public class ResearchGroupService(IApplicationDbContext db, IValidator<UpsertResearchGroupRequest> validator)
{
    public async Task<List<ResearchGroupDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.ResearchGroups
            .OrderBy(g => g.Name)
            .Select(ProjectToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<ResearchGroupDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.ResearchGroups.Where(g => g.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(ResearchGroupEntity), id);
    }

    public async Task<ResearchGroupDto> CreateAsync(UpsertResearchGroupRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var group = new ResearchGroupEntity
        {
            Name = request.Name,
            DepartmentId = request.DepartmentId,
            PrincipalInvestigatorId = request.PrincipalInvestigatorId,
        };
        db.ResearchGroups.Add(group);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(group.Id, cancellationToken);
    }

    public async Task<ResearchGroupDto> UpdateAsync(int id, UpsertResearchGroupRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var group = await db.ResearchGroups.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(ResearchGroupEntity), id);

        group.Name = request.Name;
        group.DepartmentId = request.DepartmentId;
        group.PrincipalInvestigatorId = request.PrincipalInvestigatorId;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<ResearchGroupEntity, ResearchGroupDto>> ProjectToDto = g => new ResearchGroupDto
    {
        Id = g.Id,
        Name = g.Name,
        DepartmentId = g.DepartmentId,
        DepartmentName = g.Department.Name,
        PrincipalInvestigatorId = g.PrincipalInvestigatorId,
        PrincipalInvestigatorName = g.PrincipalInvestigator.FullName,
    };
}
