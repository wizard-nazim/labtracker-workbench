namespace LabTracker.Application.Modules.Identity;

public interface IGoogleTokenValidator
{
    // False when Google:ClientId isn't configured, so the endpoint can 404.
    bool IsEnabled { get; }

    // Returns the token's email when it is a valid Google ID token for this
    // client and the email is verified; otherwise null.
    Task<string?> ValidateAsync(string credential, CancellationToken cancellationToken = default);
}
