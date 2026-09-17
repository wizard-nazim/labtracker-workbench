using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Identity;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;

namespace LabTracker.IntegrationTests.Auth;

public class AuthEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task Login_WithCorrectCredentials_ReturnsTokenAndRole()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = user.Email, Password = DefaultPassword });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<LoginResult>();
        result!.Token.Should().NotBeNullOrEmpty();
        result.Role.Should().Be(nameof(Role.Researcher));
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = user.Email, Password = "WrongPassword1!" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_ForInactiveUser_ReturnsUnauthorized()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher, isActive: false);
        var client = Factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = user.Email, Password = DefaultPassword });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithoutAToken_ReturnsUnauthorized()
    {
        var client = Factory.CreateClient();

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithAValidToken_ReturnsTheAuthenticatedUsersProfile()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var client = await CreateAuthenticatedClientAsync(user.Email);

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var me = await response.Content.ReadFromJsonAsync<MeDto>();
        me!.Email.Should().Be(user.Email);
        me.Role.Should().Be(nameof(Role.Researcher));
    }

    [Fact]
    public async Task AdminTourComplete_ForNonSuperAdmin_ReturnsForbidden()
    {
        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var client = await CreateAuthenticatedClientAsync(user.Email);

        var response = await client.PostAsync("/api/auth/admin-tour/complete", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
