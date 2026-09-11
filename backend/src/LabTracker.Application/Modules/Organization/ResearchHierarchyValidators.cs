using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Organization;

public class UpsertPrincipalInvestigatorRequestValidator : AbstractValidator<UpsertPrincipalInvestigatorRequest>
{
    public UpsertPrincipalInvestigatorRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Email).NotEmpty().MaximumLength(256).EmailAddress();

        RuleFor(x => x.DepartmentId)
            .MustAsync((id, ct) => db.Departments.AnyAsync(d => d.Id == id, ct))
            .WithMessage("DepartmentId does not reference an existing department.");
    }
}

public class UpsertResearchGroupRequestValidator : AbstractValidator<UpsertResearchGroupRequest>
{
    public UpsertResearchGroupRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);

        RuleFor(x => x.DepartmentId)
            .MustAsync((id, ct) => db.Departments.AnyAsync(d => d.Id == id, ct))
            .WithMessage("DepartmentId does not reference an existing department.");

        RuleFor(x => x.PrincipalInvestigatorId)
            .MustAsync((id, ct) => db.PrincipalInvestigators.AnyAsync(p => p.Id == id, ct))
            .WithMessage("PrincipalInvestigatorId does not reference an existing principal investigator.");
    }
}

public class UpsertResearcherRequestValidator : AbstractValidator<UpsertResearcherRequest>
{
    public UpsertResearcherRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.StudentNumber).NotEmpty().MaximumLength(50);

        RuleFor(x => x.ResearchGroupId)
            .MustAsync((id, ct) => db.ResearchGroups.AnyAsync(g => g.Id == id, ct))
            .WithMessage("ResearchGroupId does not reference an existing research group.");

        RuleFor(x => x.UserId)
            .MustAsync((id, ct) => db.Users.AnyAsync(u => u.Id == id && u.Role == Role.Researcher, ct))
            .When(x => x.UserId.HasValue)
            .WithMessage("UserId must reference an existing user with the Researcher role.");
    }
}
