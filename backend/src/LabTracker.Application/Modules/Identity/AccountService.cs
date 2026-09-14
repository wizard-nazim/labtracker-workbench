using LabTracker.Application.Common.Interfaces;
using LabTracker.Application.Modules.Organization;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using UserEntity = LabTracker.Domain.Modules.Identity.User;

namespace LabTracker.Application.Modules.Identity;

public class AccountService(IApplicationDbContext db, ResearcherService researcherService, PrincipalInvestigatorService principalInvestigatorService)
{
    public async Task<MeDto> GetMeAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new NotFoundException(nameof(UserEntity), userId);

        var researcherProfile = await researcherService.GetByUserIdAsync(userId, cancellationToken);
        var piProfile = user.Role == Role.PrincipalInvestigator
            ? await principalInvestigatorService.GetByUserIdAsync(userId, cancellationToken)
            : null;

        return new MeDto
        {
            Id = user.Id,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            HasCompletedOnboarding = user.HasCompletedOnboarding,
            HasCompletedAdminTour = user.HasCompletedAdminTour,
            ResearcherProfile = researcherProfile,
            PrincipalInvestigatorProfile = piProfile,
        };
    }

    public async Task CompleteOnboardingAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new NotFoundException(nameof(UserEntity), userId);

        user.HasCompletedOnboarding = true;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task CompleteAdminTourAsync(int userId, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new NotFoundException(nameof(UserEntity), userId);

        user.HasCompletedAdminTour = true;
        await db.SaveChangesAsync(cancellationToken);
    }
}
