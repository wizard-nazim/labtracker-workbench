using System.Collections.Concurrent;

namespace LabTracker.Application.Modules.Identity;

// Caps failed password attempts per account, whatever IP they come from. The
// per-IP limiter (Api/Extensions/RateLimiting.cs) keys on X-Forwarded-For,
// which a client can vary when it reaches the API directly; this can't be
// sidestepped that way. Google sign-in isn't throttled here, so someone locked
// out by another person's guessing can still get in that way.
//
// In-memory, so per API instance; LabTracker runs a single instance.
public class LoginAttemptThrottle(TimeProvider timeProvider)
{
    public const int MaxFailures = 10;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    // Bounds memory if someone sprays attempts at many made-up emails.
    private const int MaxTrackedAccounts = 10_000;

    private readonly ConcurrentDictionary<string, Attempts> attemptsByEmail = new();

    private sealed record Attempts(int Failures, DateTimeOffset WindowStart);

    // Time left until the account may try again, or null if it isn't locked.
    public TimeSpan? LockedFor(string normalizedEmail)
    {
        if (!attemptsByEmail.TryGetValue(normalizedEmail, out var attempts) || attempts.Failures < MaxFailures)
            return null;

        var remaining = attempts.WindowStart + Window - timeProvider.GetUtcNow();
        return remaining > TimeSpan.Zero ? remaining : null;
    }

    public void RecordFailure(string normalizedEmail)
    {
        var now = timeProvider.GetUtcNow();
        if (attemptsByEmail.Count >= MaxTrackedAccounts)
            PruneExpired(now);

        attemptsByEmail.AddOrUpdate(
            normalizedEmail,
            _ => new Attempts(1, now),
            (_, existing) => now - existing.WindowStart >= Window
                ? new Attempts(1, now)
                : existing with { Failures = existing.Failures + 1 });
    }

    public void Reset(string normalizedEmail) => attemptsByEmail.TryRemove(normalizedEmail, out _);

    private void PruneExpired(DateTimeOffset now)
    {
        foreach (var (email, attempts) in attemptsByEmail)
        {
            if (now - attempts.WindowStart >= Window)
                attemptsByEmail.TryRemove(email, out _);
        }
    }
}
