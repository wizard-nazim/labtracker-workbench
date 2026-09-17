using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
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
        return await db.Researchers
            .Where(r => r.Id == id)
            .Select(ProjectToDto)
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException(nameof(ResearcherEntity), id);
    }

    public async Task<ResearcherDto?> GetByUserIdAsync(int userId, CancellationToken cancellationToken = default)
    {
        return await db.Researchers
            .Where(r => r.UserId == userId)
            .Select(ProjectToDto)
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<ResearcherDto> CreateAsync(UpsertResearcherRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var groups = await db.ResearchGroups.Where(g => request.ResearchGroupIds.Contains(g.Id)).ToListAsync(cancellationToken);

        var researcher = new ResearcherEntity
        {
            FullName = request.FullName,
            StudentNumber = request.StudentNumber,
            FieldOfStudy = request.FieldOfStudy,
            UserId = request.UserId,
            ResearchGroups = groups,
        };
        db.Researchers.Add(researcher);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(researcher.Id, cancellationToken);
    }

    public async Task<ResearcherDto> UpdateAsync(int id, UpsertResearcherRequest request, CancellationToken cancellationToken = default)
    {
        await validator.ValidateAndThrowAsync(request, cancellationToken);

        var researcher = await db.Researchers.Include(r => r.ResearchGroups).SingleOrDefaultAsync(r => r.Id == id, cancellationToken)
            ?? throw new NotFoundException(nameof(ResearcherEntity), id);

        var groups = await db.ResearchGroups.Where(g => request.ResearchGroupIds.Contains(g.Id)).ToListAsync(cancellationToken);

        researcher.FullName = request.FullName;
        researcher.StudentNumber = request.StudentNumber;
        researcher.FieldOfStudy = request.FieldOfStudy;
        researcher.UserId = request.UserId;
        researcher.ResearchGroups.Clear();
        foreach (var group in groups) researcher.ResearchGroups.Add(group);
        await db.SaveChangesAsync(cancellationToken);

        return await GetByIdAsync(id, cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<ResearcherEntity, ResearcherDto>> ProjectToDto = r => new ResearcherDto
    {
        Id = r.Id,
        FullName = r.FullName,
        StudentNumber = r.StudentNumber,
        FieldOfStudy = r.FieldOfStudy,
        ResearchGroupIds = r.ResearchGroups.Select(g => g.Id).ToList(),
        ResearchGroupNames = r.ResearchGroups.Select(g => g.Name).ToList(),
        UserId = r.UserId,
        UserEmail = r.User != null ? r.User.Email : null,
        UserRole = r.User != null ? r.User.Role : (Role?)null,
    };
}
