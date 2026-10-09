using Google.Apis.Auth;
using LabTracker.Application.Modules.Identity;
using Microsoft.Extensions.Configuration;

namespace LabTracker.Infrastructure.Identity;

public class GoogleTokenValidator(IConfiguration configuration) : IGoogleTokenValidator
{
    private readonly string? clientId = configuration["Google:ClientId"];

    public bool IsEnabled => !string.IsNullOrWhiteSpace(clientId);

    public async Task<string?> ValidateAsync(string credential, CancellationToken cancellationToken = default)
    {
        if (!IsEnabled || string.IsNullOrWhiteSpace(credential))
            return null;

        try
        {
            // Checks the signature against Google's keys, the issuer, expiry and
            // that the token was minted for our client ID.
            var payload = await GoogleJsonWebSignature.ValidateAsync(
                credential,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId!] });
            return IsAuthoritativeEmail(payload.Email, payload.EmailVerified, payload.HostedDomain) ? payload.Email : null;
        }
        catch (InvalidJwtException)
        {
            return null;
        }
    }

    // Google vouches for who owns an email only for Gmail addresses and for
    // Google Workspace accounts (which carry the `hd` claim). Any other address
    // can be attached to a personal Google account after a one-off check, so
    // whoever controlled it once (e.g. a previous holder of a reassigned
    // address) could still sign in as its current owner. Those are refused;
    // such users sign in with their password.
    public static bool IsAuthoritativeEmail(string? email, bool emailVerified, string? hostedDomain)
    {
        if (!emailVerified || string.IsNullOrWhiteSpace(email))
            return false;

        if (!string.IsNullOrWhiteSpace(hostedDomain))
            return email.EndsWith("@" + hostedDomain, StringComparison.OrdinalIgnoreCase);

        return email.EndsWith("@gmail.com", StringComparison.OrdinalIgnoreCase)
            || email.EndsWith("@googlemail.com", StringComparison.OrdinalIgnoreCase);
    }
}
