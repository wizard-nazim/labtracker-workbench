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
    // Verified against for unknown emails, so they cost the same hashing time as
    // a real account's wrong password.
    private static readonly User TimingDummyUser = new();
    private static readonly string TimingDummyHash = new PasswordHasher<User>().HashPassword(TimingDummyUser, Guid.NewGuid().ToString());

    public async Task<LoginResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await FindActiveUserAsync(request.Email, cancellationToken);

        // Unknown emails are throttled and hashed exactly like real accounts, so
        // neither a 429 nor the response time reveals whether an account exists.
        var lockedFor = user is null
            ? loginAttemptThrottle.TryBeginUnknownEmailAttempt(EmailAddress.Normalize(request.Email))
            : loginAttemptThrottle.TryBeginAttempt(user.Id);
        if (lockedFor is { } retryAfter)
        {
            throw new TooManyRequestsException("Too many failed sign-in attempts for this account. Try again later.", retryAfter);
        }

        if (user is null)
        {
            passwordHasher.VerifyHashedPassword(TimingDummyUser, TimingDummyHash, request.Password);
            return null;
        }

        if (passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
        {
            return null;
        }

        loginAttemptThrottle.Reset(user.Id);
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
        MustChangePassword = user.MustChangePassword,
    };
}
