using LabTracker.Application.Modules.Identity;

namespace LabTracker.IntegrationTests.TestSupport;

// Stands in for Google's signature check: a credential of "valid:<email>" is a
// verified token for that email, anything else is rejected.
public class StubGoogleTokenValidator(bool isEnabled = true) : IGoogleTokenValidator
{
    public const string ValidPrefix = "valid:";

    public bool IsEnabled { get; } = isEnabled;

    public Task<string?> ValidateAsync(string credential, CancellationToken cancellationToken = default)
        => Task.FromResult(
            IsEnabled && credential.StartsWith(ValidPrefix, StringComparison.Ordinal)
                ? credential[ValidPrefix.Length..]
                : null);
}
