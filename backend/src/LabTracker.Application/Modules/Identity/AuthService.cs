using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using LabTracker.Shared.Exceptions;
using LabTracker.Shared.Identity;

namespace LabTracker.Application.Modules.Identity;

public class AuthService(
    IApplicationDbContext db,
    IPasswordHasher<User> passwordHasher,
    IJwtTokenGenerator jwtTokenGenerator,
    IGoogleTokenValidator googleTokenValidator,
    LoginAttemptThrottle loginAttemptThrottle)
{
    public async Task<LoginResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = EmailAddress.Normalize(request.Email);
        if (loginAttemptThrottle.LockedFor(email) is { } lockedFor)
        {
            throw new TooManyRequestsException("Too many failed sign-in attempts for this account. Try again later.", lockedFor);
        }

        var user = await FindActiveUserAsync(email, cancellationToken);
        if (user is null
            || passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
        {
            // Counted for unknown emails too, so lockouts don't reveal which accounts exist.
            loginAttemptThrottle.RecordFailure(email);
            return null;
        }

        loginAttemptThrottle.Reset(email);
        return IssueToken(user);
    }

    // Google only signs in people who already have an active LabTracker login,
    // matched by email; it never creates accounts.
    public async Task<LoginResult?> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default)
    {
        var email = await googleTokenValidator.ValidateAsync(request.Credential, cancellationToken);
        if (email is null)
        {
            return null;
        }

        var user = await FindActiveUserAsync(email, cancellationToken);
        return user is null ? null : IssueToken(user);
    }

    private async Task<User?> FindActiveUserAsync(string email, CancellationToken cancellationToken)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == EmailAddress.Normalize(email), cancellationToken);
        return user is { IsActive: true } ? user : null;
    }

    private LoginResult IssueToken(User user) => new()
    {
        Token = jwtTokenGenerator.GenerateToken(user),
        Email = user.Email,
        Role = user.Role.ToString(),
    };
}
