using System.Text;

namespace LabTracker.Api.Extensions;

// Fails fast on settings the app can't run without, instead of starting up and
// returning 500s on the first login or query. Everything is reported at once
// so a deploy doesn't need one restart per missing value.
public static class StartupConfiguration
{
    // HS256 needs a key of at least 256 bits; shorter keys only fail at the
    // first token signing.
    private const int MinSigningKeyBytes = 32;

    public static void Validate(IConfiguration configuration, ILogger logger)
    {
        var problems = new List<string>();

        if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("DefaultConnection")))
            problems.Add("ConnectionStrings:DefaultConnection is not set.");

        var signingKey = configuration["Jwt:SigningKey"];
        if (string.IsNullOrWhiteSpace(signingKey))
            problems.Add("Jwt:SigningKey is not set.");
        else if (Encoding.UTF8.GetByteCount(signingKey) < MinSigningKeyBytes)
            problems.Add($"Jwt:SigningKey must be at least {MinSigningKeyBytes} bytes.");

        if (string.IsNullOrWhiteSpace(configuration["Jwt:Issuer"]))
            problems.Add("Jwt:Issuer is not set.");
        if (string.IsNullOrWhiteSpace(configuration["Jwt:Audience"]))
            problems.Add("Jwt:Audience is not set.");

        var bootstrapPassword = configuration["Bootstrap:AdminPassword"];
        if (!string.IsNullOrWhiteSpace(configuration["Bootstrap:AdminEmail"]) && (bootstrapPassword?.Length ?? 0) < 12)
            problems.Add("Bootstrap:AdminPassword must be at least 12 characters.");

        if (problems.Count > 0)
            throw new InvalidOperationException("LabTracker configuration is incomplete:\n- " + string.Join("\n- ", problems));

        // Optional at startup: everything except equipment images works without it.
        if (string.IsNullOrWhiteSpace(configuration["Minio:ServiceUrl"]))
            logger.LogWarning("Minio:ServiceUrl is not set; equipment image uploads will fail.");
    }
}
