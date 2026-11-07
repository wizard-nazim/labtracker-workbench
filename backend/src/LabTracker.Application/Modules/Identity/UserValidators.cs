using FluentValidation;
using LabTracker.Shared.Enums;
using LabTracker.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using LabTracker.Shared.Identity;

namespace LabTracker.Application.Modules.Identity;

public class CreateUserRequestValidator : AbstractValidator<CreateUserRequest>
{
    public CreateUserRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200)
            .MustAsync((email, ct) => IsEmailUniqueAsync(db, email, ct))
            .WithMessage("A user with this email already exists.");

        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);

        RuleFor(x => x.Role).IsInEnum();
    }

    private static async Task<bool> IsEmailUniqueAsync(IApplicationDbContext db, string email, CancellationToken ct)
        => !await db.Users.AnyAsync(u => u.Email == EmailAddress.Normalize(email), ct);
}

public class CreateAccountRequestValidator : AbstractValidator<CreateAccountRequest>
{
    public CreateAccountRequestValidator(IApplicationDbContext db)
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200)
            .MustAsync((email, ct) => db.Users.AllAsync(u => u.Email != EmailAddress.Normalize(email), ct))
            .WithMessage("A user with this email already exists.");

        RuleFor(x => x.Password).NotEmpty().MinimumLength(8);

        // Super Admins have no profile (plain create); PIs are added from their own tab.
        RuleFor(x => x.Role).Must(r => r is Role.Researcher or Role.ScienceOfficer)
            .WithMessage("Role must be Researcher or ScienceOfficer.");

        RuleFor(x => x.FullName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.StudentNumber).MaximumLength(50);
        RuleFor(x => x.FieldOfStudy).IsInEnum().When(x => x.FieldOfStudy.HasValue);

        When(x => x.Role == Role.Researcher, () =>
        {
            RuleFor(x => x.StudentNumber).NotEmpty().WithMessage("A student number is required.");
            RuleFor(x => x.ResearchGroupIds).NotEmpty().WithMessage("Choose at least one lab.");
        });

        RuleForEach(x => x.ResearchGroupIds)
            .MustAsync((id, ct) => db.ResearchGroups.AnyAsync(g => g.Id == id, ct))
            .WithMessage("ResearchGroupIds contains an id that does not reference an existing research group.");
    }
}

public class UpdateUserLoginRequestValidator : AbstractValidator<UpdateUserLoginRequest>
{
    public UpdateUserLoginRequestValidator()
    {
        // Uniqueness is checked in UserService, which knows whose login this is.
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(200);

        RuleFor(x => x.Password).MinimumLength(8).When(x => !string.IsNullOrEmpty(x.Password));
    }
}

public class UpdateMeRequestValidator : AbstractValidator<UpdateMeRequest>
{
    public UpdateMeRequestValidator()
    {
        // Same limit as ExternalContact.Phone; digits plus the usual separators.
        // Checked after trimming, which is how the service stores it.
        RuleFor(x => x.Phone!.Trim())
            .MaximumLength(30)
            .Matches(@"^\+?[0-9 ()\-]*$").WithMessage("Use digits, spaces, brackets, dashes and an optional leading +.")
            .OverridePropertyName(nameof(UpdateMeRequest.Phone))
            .When(x => !string.IsNullOrWhiteSpace(x.Phone));
    }
}
