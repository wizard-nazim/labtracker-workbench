using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using LabTracker.Shared.Identity;

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

        RuleFor(x => x.Password).MinimumLength(8).When(x => x.Password is not null);

        // A login is provisioned using the PI's own Email, so it must not already
        // belong to another account (same uniqueness rule as CreateUserRequestValidator).
        RuleFor(x => x.Email)
            .MustAsync((email, ct) => IsEmailAvailableForLoginAsync(db, email, ct))
            .When(x => x.Password is not null)
            .WithMessage("A user with this email already exists.");
    }

    private static async Task<bool> IsEmailAvailableForLoginAsync(IApplicationDbContext db, string email, CancellationToken ct)
        => !await db.Users.AnyAsync(u => u.Email == EmailAddress.Normalize(email), ct);
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

        RuleFor(x => x.ResearchGroupIds).NotEmpty().WithMessage("At least one research group is required.");

        RuleForEach(x => x.ResearchGroupIds)
            .MustAsync((id, ct) => db.ResearchGroups.AnyAsync(g => g.Id == id, ct))
            .WithMessage("ResearchGroupIds contains an id that does not reference an existing research group.");

        RuleFor(x => x.FieldOfStudy).IsInEnum().When(x => x.FieldOfStudy.HasValue);

        // Not restricted to Role.Researcher — a Science Officer or Principal
        // Investigator can also be linked to a Researcher profile so they can
        // book/use equipment for themselves, same as a plain researcher.
        RuleFor(x => x.UserId)
            .MustAsync((id, ct) => db.Users.AnyAsync(u => u.Id == id && u.Role != Role.SuperAdmin, ct))
            .When(x => x.UserId.HasValue)
            .WithMessage("UserId must reference an existing non-admin user.");
    }
}
