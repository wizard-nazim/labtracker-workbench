using System.Collections.Concurrent;

namespace LabTracker.Application.Modules.Identity;

// Caps password attempts per account, whatever IP they come from, as a backstop
// to the per-IP limiter (Api/Extensions/RateLimiting.cs). Only real accounts are
// tracked, so memory is bounded by the number of users.
//
// Trade-off: anyone who knows an email can lock that account's password sign-in
// for up to Window by failing on purpose. Users whose email Google vouches for
// (Gmail / Workspace) can still use Google sign-in meanwhile.
//
// In-memory, so per API instance; LabTracker runs a single instance.
public class LoginAttemptThrottle(TimeProvider timeProvider)
{
    public const int MaxAttempts = 10;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    private readonly ConcurrentDictionary<int, Attempts> attemptsByUserId = new();

    private sealed record Attempts(int Count, DateTimeOffset WindowStart);

    // Counts an attempt before the password is checked, atomically, so parallel
    // requests can't all slip in under the limit. Returns how long the account
    // stays locked if this attempt is over the limit, otherwise null.
    public TimeSpan? TryBeginAttempt(int userId)
    {
        var now = timeProvider.GetUtcNow();
        var attempts = attemptsByUserId.AddOrUpdate(
            userId,
            _ => new Attempts(1, now),
            (_, existing) => now - existing.WindowStart >= Window
                ? new Attempts(1, now)
                : existing with { Count = existing.Count + 1 });

        return attempts.Count > MaxAttempts ? attempts.WindowStart + Window - now : null;
    }

    // A successful sign-in clears the count.
    public void Reset(int userId) => attemptsByUserId.TryRemove(userId, out _);
}
