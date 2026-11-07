using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Identity;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;

namespace LabTracker.IntegrationTests.Auth;

// Changing your own password, forgot-password requests, and the rule that a
// password change or deactivation ends existing sessions (TokenRevocation).
public class PasswordEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task ChangePassword_WithoutAToken_Returns401()
    {
        var response = await Factory.CreateClient().PutAsJsonAsync("/api/auth/me/password",
            new ChangePasswordRequest { CurrentPassword = DefaultPassword, NewPassword = "BrandNew123!" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ChangePassword_RejectsTheOldToken_AndTheReturnedOneWorks()
    {
        await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var oldSession = await CreateAuthenticatedClientAsync("nadia@labtracker.local");

        var response = await oldSession.PutAsJsonAsync("/api/auth/me/password",
            new ChangePasswordRequest { CurrentPassword = DefaultPassword, NewPassword = "BrandNew123!" });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<LoginResult>(TestJson.Options);

        (await oldSession.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);

        var newSession = Factory.CreateClient();
        newSession.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result!.Token);
        (await newSession.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Deactivating_A_User_EndsTheirOpenSession()
    {
        await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var student = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var admin = await CreateAuthenticatedClientAsync("admin@labtracker.local");
        var session = await CreateAuthenticatedClientAsync("nadia@labtracker.local");
        (await session.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.OK);

        (await admin.PatchAsJsonAsync($"/api/users/{student.Id}/status", new { isActive = false })).EnsureSuccessStatusCode();

        (await session.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ForgotPassword_GivesTheSameReply_ForKnownAndUnknownEmails()
    {
        await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var client = Factory.CreateClient();

        var known = await client.PostAsJsonAsync("/api/auth/password-reset-requests", new ForgotPasswordRequest { Email = "nadia@labtracker.local" });
        var unknown = await client.PostAsJsonAsync("/api/auth/password-reset-requests", new ForgotPasswordRequest { Email = "nobody@labtracker.local" });

        known.StatusCode.Should().Be(HttpStatusCode.Accepted);
        unknown.StatusCode.Should().Be(HttpStatusCode.Accepted);
        (await known.Content.ReadAsStringAsync()).Should().Be(await unknown.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task AdminResolvesARequest_AndTheUserSignsInWithATemporaryPassword()
    {
        await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        var admin = await CreateAuthenticatedClientAsync("admin@labtracker.local");
        await Factory.CreateClient().PostAsJsonAsync("/api/auth/password-reset-requests", new ForgotPasswordRequest { Email = "nadia@labtracker.local" });

        var pending = await admin.GetFromJsonAsync<List<PasswordResetRequestDto>>("/api/password-reset-requests?status=Pending", TestJson.Options);
        var request = pending.Should().ContainSingle().Subject;
        (await admin.PostAsJsonAsync($"/api/password-reset-requests/{request.Id}/resolve", new AssignPasswordRequest { NewPassword = "Temporary123!" }))
            .StatusCode.Should().Be(HttpStatusCode.NoContent);

        var login = await Factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = "nadia@labtracker.local", Password = "Temporary123!" });
        var result = await login.Content.ReadFromJsonAsync<LoginResult>(TestJson.Options);
        result!.MustChangePassword.Should().BeTrue();
    }

    [Theory]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.Researcher)]
    public async Task ResetRequests_AreForSuperAdminsOnly(Role role)
    {
        await SeedUserAsync("someone@labtracker.local", role);
        var client = await CreateAuthenticatedClientAsync("someone@labtracker.local");

        (await client.GetAsync("/api/password-reset-requests?status=Pending")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
