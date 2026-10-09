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
            return payload.EmailVerified ? payload.Email : null;
        }
        catch (InvalidJwtException)
        {
            return null;
        }
    }
}
