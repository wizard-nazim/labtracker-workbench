using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;

namespace LabTracker.Api.Extensions;

// Caps sign-in attempts per client IP so passwords can't be guessed at speed.
// UseForwardedHeaders runs first, so RemoteIpAddress is the real client.
public static class RateLimiting
{
    public const string LoginPolicy = "login";

    public static IServiceCollection AddLoginRateLimiting(this IServiceCollection services)
    {
        return services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = (context, _) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
                {
                    context.HttpContext.Response.Headers.RetryAfter =
                        ((int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
                }
                return ValueTask.CompletedTask;
            };

            // Limits are read from the app's configuration (not at registration),
            // so they follow the final config, including test overrides.
            options.AddPolicy(LoginPolicy, httpContext =>
                RateLimitPartition.GetFixedWindowLimiter(
                    httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                    _ =>
                    {
                        var configuration = httpContext.RequestServices.GetRequiredService<IConfiguration>();
                        return new FixedWindowRateLimiterOptions
                        {
                            PermitLimit = configuration.GetValue("RateLimiting:Login:PermitLimit", 10),
                            Window = TimeSpan.FromSeconds(configuration.GetValue("RateLimiting:Login:WindowSeconds", 60)),
                            QueueLimit = 0,
                        };
                    }));
        });
    }
}
