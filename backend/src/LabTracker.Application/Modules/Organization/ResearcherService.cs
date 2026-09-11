using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using ResearcherEntity = LabTracker.Domain.Modules.Organization.Researcher;

namespace LabTracker.Application.Modules.Organization;

public class ResearcherService(IApplicationDbContext db, IValidator<UpsertResearcherRequest> validator)
{
    public async Task<List<ResearcherDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.Researchers
            .OrderBy(r => r.FullName)
            .Select(ProjectToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<ResearcherDto> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await db.Researchers.Where(r => r.Id == id).Select(ProjectToDto).SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(ResearcherEntity), id);
    }

    public async Task<ResearcherDto> CreateAsync(UpsertResearcherRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var researcher = new ResearcherEntity
        {
            FullName = request.FullName,
            StudentNumber = request.StudentNumber,
            ResearchGroupId = request.ResearchGroupId,
            UserId = request.UserId,
        };
        db.Researchers.Add(researcher);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(researcher.Id, cancellationToken);
    }

    public async Task<ResearcherDto> UpdateAsync(int id, UpsertResearcherRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var researcher = await db.Researchers.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(ResearcherEntity), id);

        researcher.FullName = request.FullName;
        researcher.StudentNumber = request.StudentNumber;
        researcher.ResearchGroupId = request.ResearchGroupId;
        researcher.UserId = request.UserId;
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<ResearcherEntity, ResearcherDto>> ProjectToDto = r => new ResearcherDto
    {
        Id = r.Id,
        FullName = r.FullName,
        StudentNumber = r.StudentNumber,
        ResearchGroupId = r.ResearchGroupId,
        ResearchGroupName = r.ResearchGroup.Name,
        UserId = r.UserId,
        UserEmail = r.User != null ? r.User.Email : null,
    };
}
