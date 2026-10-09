using FluentAssertions;
using LabTracker.Application.Modules.Identity;

namespace LabTracker.UnitTests.Identity;

public class LoginAttemptThrottleTests
{
    private const string Email = "nadia@labtracker.local";

    private static (LoginAttemptThrottle Sut, ManualTimeProvider Clock) BuildSut()
    {
        var clock = new ManualTimeProvider();
        return (new LoginAttemptThrottle(clock), clock);
    }

    private static void Fail(LoginAttemptThrottle sut, int times)
    {
        for (var i = 0; i < times; i++) sut.RecordFailure(Email);
    }

    [Fact]
    public void LockedFor_BelowTheLimit_IsNull()
    {
        var (sut, _) = BuildSut();

        Fail(sut, LoginAttemptThrottle.MaxFailures - 1);

        sut.LockedFor(Email).Should().BeNull();
    }

    [Fact]
    public void LockedFor_AtTheLimit_ReturnsTimeUntilTheWindowEnds()
    {
        var (sut, clock) = BuildSut();
        Fail(sut, LoginAttemptThrottle.MaxFailures);

        clock.Advance(TimeSpan.FromMinutes(5));

        sut.LockedFor(Email).Should().Be(LoginAttemptThrottle.Window - TimeSpan.FromMinutes(5));
        sut.LockedFor("someone-else@labtracker.local").Should().BeNull();
    }

    [Fact]
    public void LockedFor_AfterTheWindow_IsNullAndCountingStartsOver()
    {
        var (sut, clock) = BuildSut();
        Fail(sut, LoginAttemptThrottle.MaxFailures);

        clock.Advance(LoginAttemptThrottle.Window);
        sut.LockedFor(Email).Should().BeNull();

        Fail(sut, 1);
        sut.LockedFor(Email).Should().BeNull();
    }

    [Fact]
    public void Reset_ClearsFailures()
    {
        var (sut, _) = BuildSut();
        Fail(sut, LoginAttemptThrottle.MaxFailures - 1);

        sut.Reset(Email);
        Fail(sut, 1);

        sut.LockedFor(Email).Should().BeNull();
    }

    private sealed class ManualTimeProvider : TimeProvider
    {
        private DateTimeOffset now = new(2026, 10, 9, 12, 0, 0, TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => now;
        public void Advance(TimeSpan by) => now += by;
    }
}
