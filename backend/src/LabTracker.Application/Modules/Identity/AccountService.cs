using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Application.Modules.Organization;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using UserEntity = LabTracker.Domain.Modules.Identity.User;

namespace LabTracker.Application.Modules.Identity;

public class AccountService(
    IApplicationDbContext db,
    ResearcherService researcherService,
    PrincipalInvestigatorService principalInvestigatorService,
    IValidator<UpdateMeRequest> updateMeValidator)
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
            Phone = user.Phone,
            NotifyOnEquipmentChanges = user.NotifyOnEquipmentChanges,
            MustChangePassword = user.MustChangePassword,
            ResearcherProfile = researcherProfile,
            PrincipalInvestigatorProfile = piProfile,
        };
    }

    // The signed-in user's own contact details and notification preference.
    public async Task<MeDto> UpdateMeAsync(int userId, UpdateMeRequest request, CancellationToken cancellationToken = default)
    {
        await updateMeValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new NotFoundException(nameof(UserEntity), userId);

        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.NotifyOnEquipmentChanges = request.NotifyOnEquipmentChanges;
        await db.SaveChangesAsync(cancellationToken);

        return await GetMeAsync(userId, cancellationToken);
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
