using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Organization;

public class UpsertFacilityRequestValidator : AbstractValidator<UpsertFacilityRequest>
{
    public UpsertFacilityRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);

        RuleFor(x => x.DepartmentId)
            .MustAsync((id, ct) => db.Departments.AnyAsync(d => d.Id == id, ct))
            .WithMessage("DepartmentId does not reference an existing department.");

        RuleForEach(x => x.OverseerUserIds)
            .MustAsync((id, ct) => db.Users.AnyAsync(u => u.Id == id && u.Role == Role.ScienceOfficer, ct))
            .WithMessage("OverseerUserIds must reference Science Officer users.");
    }
}
