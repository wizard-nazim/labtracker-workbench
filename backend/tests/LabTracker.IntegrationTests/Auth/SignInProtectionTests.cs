using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Identity;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace LabTracker.IntegrationTests.Auth;

// Google sign-in (with the token check stubbed, see StubGoogleTokenValidator)
// and the per-IP sign-in rate limit.
public class SignInProtectionTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task GoogleLogin_ForAnActiveUser_ReturnsTokenAndRole()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google", Credential($"{StubGoogleTokenValidator.ValidPrefix}Nadia@LabTracker.local"));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<LoginResult>();
        result!.Token.Should().NotBeNullOrEmpty();
        result.Email.Should().Be(user.Email);
        result.Role.Should().Be(nameof(Role.Researcher));
    }

    [Fact]
    public async Task GoogleLogin_ForAnEmailWithNoAccount_ReturnsUnauthorized()
    {
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google", Credential($"{StubGoogleTokenValidator.ValidPrefix}stranger@gmail.com"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GoogleLogin_ForAnInactiveUser_ReturnsUnauthorized()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher, isActive: false);
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google", Credential($"{StubGoogleTokenValidator.ValidPrefix}{user.Email}"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GoogleLogin_WithAnInvalidCredential_ReturnsUnauthorized()
    {
        await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google", Credential("forged-token"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GoogleLogin_WhenNotConfigured_ReturnsNotFound()
    {
        await using var app = Factory.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services =>
            {
                services.RemoveAll<IGoogleTokenValidator>();
                services.AddSingleton<IGoogleTokenValidator>(new StubGoogleTokenValidator(isEnabled: false));
            }));
        var client = app.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/google", Credential($"{StubGoogleTokenValidator.ValidPrefix}nadia@labtracker.local"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Login_BeyondThePermitLimit_ReturnsTooManyRequestsWithRetryAfter()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        await using var app = Factory.WithWebHostBuilder(builder =>
            builder.UseSetting("RateLimiting:Login:PermitLimit", "3"));
        var client = app.CreateClient();
        var wrong = new LoginRequest { Email = user.Email, Password = "WrongPassword1!" };

        for (var attempt = 0; attempt < 3; attempt++)
        {
            (await client.PostAsJsonAsync("/api/auth/login", wrong)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        // The limit applies even to the right password, so guessing can't continue.
        var blocked = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = user.Email, Password = DefaultPassword });

        blocked.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        blocked.Headers.RetryAfter.Should().NotBeNull();
    }

    [Fact]
    public async Task Login_ManyFailuresFromChangingSpoofedIps_StillLocksTheAccount()
    {
        // A distinct account: the throttle is per app instance and outlives ResetDatabaseAsync.
        var user = await SeedUserAsync("spoofed-ip-target@labtracker.local", Role.Researcher);
        var client = Factory.CreateClient();
        var wrong = new LoginRequest { Email = user.Email, Password = "WrongPassword1!" };

        for (var attempt = 0; attempt < LoginAttemptThrottle.MaxFailures; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/login") { Content = JsonContent.Create(wrong) };
            request.Headers.Add("X-Forwarded-For", $"203.0.113.{attempt + 1}");
            (await client.SendAsync(request)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        }

        var blocked = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = user.Email, Password = DefaultPassword });

        blocked.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        blocked.Headers.RetryAfter.Should().NotBeNull();

        // Google sign-in is the way back in while password sign-in is locked.
        var google = await client.PostAsJsonAsync("/api/auth/google", Credential($"{StubGoogleTokenValidator.ValidPrefix}{user.Email}"));
        google.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private static GoogleLoginRequest Credential(string credential) => new() { Credential = credential };
}
