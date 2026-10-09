using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using LabTracker.Shared.Identity;

namespace LabTracker.Application.Modules.Identity;

public class AuthService(
    IApplicationDbContext db,
    IPasswordHasher<User> passwordHasher,
    IJwtTokenGenerator jwtTokenGenerator,
    IGoogleTokenValidator googleTokenValidator)
{
    public async Task<LoginResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await FindActiveUserAsync(request.Email, cancellationToken);
        if (user is null)
        {
            return null;
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

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
