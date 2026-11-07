using System.Security.Claims;
using LabTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace LabTracker.Api.Extensions;

// Tokens last 8 hours and can't be recalled, so each request also checks the
// account is still active and the token isn't older than the last password
// change (the "sv" claim vs User.SecurityVersion). The lookup is cached for a
// short while (Auth:AccountStateCacheSeconds, default 30) to keep it cheap on
// the small server, which means a change takes up to that long to bite. Only *older* versions are rejected, so a token issued just after a
// change still works while the cache holds the previous version.
public static class TokenRevocation
{
    public const string SecurityVersionClaim = "sv";

    private sealed record AccountState(bool IsActive, int SecurityVersion);

    public static async Task ValidateAsync(TokenValidatedContext context)
    {
        if (!int.TryParse(context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
        {
            context.Fail("Token has no user.");
            return;
        }

        // Tokens issued before this check existed have no claim: treat as 0 so
        // nobody is signed out by the deploy itself.
        var tokenVersion = int.TryParse(context.Principal!.FindFirstValue(SecurityVersionClaim), out var v) ? v : 0;

        var services = context.HttpContext.RequestServices;
        var cacheSeconds = services.GetRequiredService<IConfiguration>().GetValue("Auth:AccountStateCacheSeconds", 30);

        Task<AccountState?> Load() => services.GetRequiredService<LabTrackerDbContext>().Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new AccountState(u.IsActive, u.SecurityVersion))
            .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

        var state = cacheSeconds <= 0
            ? await Load()
            : await services.GetRequiredService<IMemoryCache>().GetOrCreateAsync($"account-state:{userId}", entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(cacheSeconds);
                return Load();
            });

        if (state is null || !state.IsActive || tokenVersion < state.SecurityVersion)
        {
            context.Fail("Session is no longer valid.");
        }
    }
}
