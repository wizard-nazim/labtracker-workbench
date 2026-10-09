using FluentAssertions;
using LabTracker.Application.Modules.Identity;

namespace LabTracker.UnitTests.Identity;

public class LoginAttemptThrottleTests
{
    private const int UserId = 7;

    private static (LoginAttemptThrottle Sut, ManualTimeProvider Clock) BuildSut()
    {
        var clock = new ManualTimeProvider();
        return (new LoginAttemptThrottle(clock), clock);
    }

    private static void Attempt(LoginAttemptThrottle sut, int times)
    {
        for (var i = 0; i < times; i++) sut.TryBeginAttempt(UserId);
    }

    [Fact]
    public void TryBeginAttempt_UpToTheLimit_IsAllowed()
    {
        var (sut, _) = BuildSut();

        Attempt(sut, LoginAttemptThrottle.MaxAttempts - 1);

        sut.TryBeginAttempt(UserId).Should().BeNull();
    }

    [Fact]
    public void TryBeginAttempt_OverTheLimit_ReturnsTimeUntilTheWindowEnds()
    {
        var (sut, clock) = BuildSut();
        Attempt(sut, LoginAttemptThrottle.MaxAttempts);

        clock.Advance(TimeSpan.FromMinutes(5));

        sut.TryBeginAttempt(UserId).Should().Be(LoginAttemptThrottle.Window - TimeSpan.FromMinutes(5));
        sut.TryBeginAttempt(UserId + 1).Should().BeNull();
    }

    [Fact]
    public void TryBeginAttempt_AfterTheWindow_StartsCountingAgain()
    {
        var (sut, clock) = BuildSut();
        Attempt(sut, LoginAttemptThrottle.MaxAttempts + 3);

        clock.Advance(LoginAttemptThrottle.Window);

        sut.TryBeginAttempt(UserId).Should().BeNull();
    }

    [Fact]
    public void Reset_ClearsTheCount()
    {
        var (sut, _) = BuildSut();
        Attempt(sut, LoginAttemptThrottle.MaxAttempts);

        sut.Reset(UserId);

        sut.TryBeginAttempt(UserId).Should().BeNull();
    }

    [Fact]
    public async Task TryBeginAttempt_UnderParallelLoad_AllowsExactlyTheLimit()
    {
        var (sut, _) = BuildSut();

        var results = await Task.WhenAll(Enumerable.Range(0, 200).Select(_ => Task.Run(() => sut.TryBeginAttempt(UserId))));

        results.Count(r => r is null).Should().Be(LoginAttemptThrottle.MaxAttempts);
    }

    private sealed class ManualTimeProvider : TimeProvider
    {
        private DateTimeOffset now = new(2026, 10, 9, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan by) => now += by;
    }
}
