using FluentValidation;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Application.Modules.Notifications;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using LabTracker.Shared.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Identity;

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
}

public class ForgotPasswordRequest
{
    public string Email { get; set; } = string.Empty;
}

public class AssignPasswordRequest
{
    public string NewPassword { get; set; } = string.Empty;
}

public class PasswordResetRequestDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? FullName { get; set; }
    public Role Role { get; set; }
    public DateTime CreatedAt { get; set; }
    public PasswordResetStatus Status { get; set; }
    public string? ResolvedByEmail { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
        RuleFor(x => x.NewPassword).NotEqual(x => x.CurrentPassword)
            .WithMessage("Choose a password different from your current one.");
    }
}

public class AssignPasswordRequestValidator : AbstractValidator<AssignPasswordRequest>
{
    public AssignPasswordRequestValidator()
    {
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8);
    }
}

// Changing your own password, "forgot password" requests, and the Super Admin
// resolving them. Admins never see a password the user chose: anything an
// admin assigns is temporary (MustChangePassword) until the user replaces it.
public class PasswordService(
    IApplicationDbContext db,
    IPasswordHasher<User> passwordHasher,
    IJwtTokenGenerator jwtTokenGenerator,
    LoginAttemptThrottle loginAttemptThrottle,
    NotificationService notificationService,
    IValidator<ChangePasswordRequest> changeValidator,
    IValidator<AssignPasswordRequest> assignValidator)
{
    // Returns a fresh token: the change bumps SecurityVersion, which ends
    // every other session, but this one should carry on.
    public async Task<LoginResult> ChangeOwnPasswordAsync(int userId, ChangePasswordRequest request, CancellationToken cancellationToken = default)
    {
        await changeValidator.ValidateAndThrowAsync(request, cancellationToken);

        var user = await db.Users.FindAsync([userId], cancellationToken)
            ?? throw new NotFoundException(nameof(User), userId);

        // Shares the sign-in throttle, so a stolen session can't be used to
        // brute-force the current password.
        if (loginAttemptThrottle.TryBeginAttempt(user.Id) is { } retryAfter)
        {
            throw new TooManyRequestsException("Too many wrong passwords. Try again later.", retryAfter);
        }

        if (passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.CurrentPassword) == PasswordVerificationResult.Failed)
        {
            throw new ValidationException(
                [new FluentValidation.Results.ValidationFailure(nameof(request.CurrentPassword), "Your current password is incorrect.")]);
        }

        loginAttemptThrottle.Reset(user.Id);

        // Replacing a temporary password is the expected follow-up to an
        // admin's reset, so it isn't news to them.
        var wasTemporary = user.MustChangePassword;
        SetPassword(user, request.NewPassword, temporary: false);

        if (!wasTemporary)
        {
            var name = await DisplayNameAsync(user, cancellationToken);
            await notificationService.NotifyAdminsAsync(
                NotificationType.PasswordChanged,
                "Password changed",
                $"{name} changed their password.",
                exceptUserId: user.Id,
                cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);

        return new LoginResult
        {
            Token = jwtTokenGenerator.GenerateToken(user),
            Email = user.Email,
            Role = user.Role.ToString(),
            MustChangePassword = false,
        };
    }

    // Always completes the same way whether or not the email has an account,
    // so the sign-in page can't be used to find out who does.
    public async Task RequestResetAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email)) return;

        var email = EmailAddress.Normalize(request.Email);
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == email && u.IsActive, cancellationToken);
        if (user is null) return;

        var alreadyPending = await db.PasswordResetRequests
            .AnyAsync(r => r.UserId == user.Id && r.Status == PasswordResetStatus.Pending, cancellationToken);
        if (alreadyPending) return;

        db.PasswordResetRequests.Add(new PasswordResetRequest
        {
            UserId = user.Id,
            CreatedAt = DateTime.UtcNow,
            Status = PasswordResetStatus.Pending,
        });

        var name = await DisplayNameAsync(user, cancellationToken);
        await notificationService.NotifyAdminsAsync(
            NotificationType.PasswordResetRequested,
            "Password reset requested",
            $"{name} forgot their password. Assign a temporary one in Admin › Requests.",
            exceptUserId: user.Id,
            cancellationToken);

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<PasswordResetRequestDto>> GetRequestsAsync(PasswordResetStatus? status, CancellationToken cancellationToken = default)
    {
        var query = db.PasswordResetRequests.AsQueryable();
        query = status is { } s
            ? query.Where(r => r.Status == s)
            : query.Where(r => r.Status != PasswordResetStatus.Pending);

        return await query
            .OrderByDescending(r => r.ResolvedAt ?? r.CreatedAt).ThenByDescending(r => r.Id)
            .Take(200)
            .Select(r => new PasswordResetRequestDto
            {
                Id = r.Id,
                UserId = r.UserId,
                Email = r.User.Email,
                FullName = db.Researchers.Where(p => p.UserId == r.UserId).Select(p => p.FullName).FirstOrDefault()
                    ?? db.PrincipalInvestigators.Where(p => p.UserId == r.UserId).Select(p => p.FullName).FirstOrDefault(),
                Role = r.User.Role,
                CreatedAt = r.CreatedAt,
                Status = r.Status,
                ResolvedByEmail = r.ResolvedByUser != null ? r.ResolvedByUser.Email : null,
                ResolvedAt = r.ResolvedAt,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<int> CountPendingAsync(CancellationToken cancellationToken = default)
        => await db.PasswordResetRequests.CountAsync(r => r.Status == PasswordResetStatus.Pending, cancellationToken);

    public async Task ResolveAsync(int id, AssignPasswordRequest request, int adminUserId, CancellationToken cancellationToken = default)
    {
        await assignValidator.ValidateAndThrowAsync(request, cancellationToken);

        var resetRequest = await PendingRequestAsync(id, cancellationToken);
        var user = await db.Users.FindAsync([resetRequest.UserId], cancellationToken)
            ?? throw new NotFoundException(nameof(User), resetRequest.UserId);

        SetPassword(user, request.NewPassword, temporary: true);
        Close(resetRequest, PasswordResetStatus.Completed, adminUserId);
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task DismissAsync(int id, int adminUserId, CancellationToken cancellationToken = default)
    {
        var resetRequest = await PendingRequestAsync(id, cancellationToken);
        Close(resetRequest, PasswordResetStatus.Dismissed, adminUserId);
        await db.SaveChangesAsync(cancellationToken);
    }

    private void SetPassword(User user, string password, bool temporary)
    {
        user.PasswordHash = passwordHasher.HashPassword(user, password);
        user.PasswordChangedAt = DateTime.UtcNow;
        user.MustChangePassword = temporary;
        user.SecurityVersion++;
    }

    private static void Close(PasswordResetRequest request, PasswordResetStatus status, int adminUserId)
    {
        request.Status = status;
        request.ResolvedByUserId = adminUserId;
        request.ResolvedAt = DateTime.UtcNow;
    }

    private async Task<PasswordResetRequest> PendingRequestAsync(int id, CancellationToken cancellationToken)
    {
        var request = await db.PasswordResetRequests.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(PasswordResetRequest), id);
        if (request.Status != PasswordResetStatus.Pending)
        {
            throw new ValidationException(
                [new FluentValidation.Results.ValidationFailure("Status", "This request has already been dealt with.")]);
        }
        return request;
    }

    private async Task<string> DisplayNameAsync(User user, CancellationToken cancellationToken)
    {
        var name = await db.Researchers.Where(r => r.UserId == user.Id).Select(r => r.FullName).FirstOrDefaultAsync(cancellationToken)
            ?? await db.PrincipalInvestigators.Where(p => p.UserId == user.Id).Select(p => p.FullName).FirstOrDefaultAsync(cancellationToken);
        return name is null ? user.Email : $"{name} ({user.Email})";
    }
}
