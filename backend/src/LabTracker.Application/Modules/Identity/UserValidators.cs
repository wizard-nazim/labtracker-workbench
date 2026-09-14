using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

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
        => !await db.Users.AnyAsync(u => u.Email == email, ct);
}
