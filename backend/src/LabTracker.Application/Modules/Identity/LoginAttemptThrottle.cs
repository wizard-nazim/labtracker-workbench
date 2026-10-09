using System.Collections.Concurrent;

namespace LabTracker.Application.Modules.Identity;

// Caps password attempts per account, whatever IP they come from, as a backstop
// to the per-IP limiter (Api/Extensions/RateLimiting.cs).
//
// Emails with no account are counted the same way, so a 429 doesn't reveal
// which emails exist. They live in a separate, capped map that is simply
// cleared when full: no real account sits behind those entries, so dropping
// them costs nothing, and spraying made-up emails can't grow memory or evict a
// real account's count.
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

    private const int MaxTrackedUnknownEmails = 10_000;

    private readonly ConcurrentDictionary<int, Attempts> attemptsByUserId = new();
    private readonly ConcurrentDictionary<string, Attempts> attemptsByUnknownEmail = new();

    private sealed record Attempts(int Count, DateTimeOffset WindowStart);

    // Counts an attempt before the password is checked, atomically, so parallel
    // requests can't all slip in under the limit. Returns how long the account
    // stays locked if this attempt is over the limit, otherwise null.
    public TimeSpan? TryBeginAttempt(int userId) => Begin(attemptsByUserId, userId);

    public TimeSpan? TryBeginUnknownEmailAttempt(string normalizedEmail)
    {
        if (attemptsByUnknownEmail.Count >= MaxTrackedUnknownEmails)
            attemptsByUnknownEmail.Clear();
        return Begin(attemptsByUnknownEmail, normalizedEmail);
    }

    // A successful sign-in clears the count.
    public void Reset(int userId) => attemptsByUserId.TryRemove(userId, out _);

    private TimeSpan? Begin<TKey>(ConcurrentDictionary<TKey, Attempts> attemptsByKey, TKey key)
        where TKey : notnull
    {
        var now = timeProvider.GetUtcNow();
        var attempts = attemptsByKey.AddOrUpdate(
            key,
            _ => new Attempts(1, now),
            (_, existing) => now - existing.WindowStart >= Window
                ? new Attempts(1, now)
                : existing with { Count = existing.Count + 1 });

        return attempts.Count > MaxAttempts ? attempts.WindowStart + Window - now : null;
    }
}
