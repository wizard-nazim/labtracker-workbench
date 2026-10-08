using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using LabTracker.Shared.Identity;

namespace LabTracker.Application.Modules.Identity;

public class AuthService(
    IApplicationDbContext db,
    IPasswordHasher<User> passwordHasher,
    IJwtTokenGenerator jwtTokenGenerator)
{
    public async Task<LoginResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Email == EmailAddress.Normalize(request.Email), cancellationToken);
        if (user is null || !user.IsActive)
        {
            return null;
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed)
        {
            return null;
        }

        return new LoginResult
        {
            Token = jwtTokenGenerator.GenerateToken(user),
            Email = user.Email,
            Role = user.Role.ToString(),
        };
    }
}
