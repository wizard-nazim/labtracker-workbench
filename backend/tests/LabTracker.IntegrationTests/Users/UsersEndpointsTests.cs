using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Identity;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.IntegrationTests.Users;

public class UsersEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task CreateAccount_AsSuperAdmin_CreatesALinkedStudentWhoCanSignIn()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var group = await db.AddResearchGroupAsync(department, await db.AddPrincipalInvestigatorAsync(department));
        await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var admin = await CreateAuthenticatedClientAsync("admin@labtracker.local");

        var response = await admin.PostAsJsonAsync("/api/users/accounts", new CreateAccountRequest
        {
            Email = "thandi@uni.ac.za", Password = "Temporary123!", Role = Role.Researcher,
            FullName = "Thandi Mokoena", StudentNumber = "MKNTHA001", ResearchGroupIds = [group.Id],
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var created = await response.Content.ReadFromJsonAsync<UserDto>(TestJson.Options);
        created!.MustChangePassword.Should().BeTrue();
        var profile = await db.Researchers.AsNoTracking().SingleAsync(r => r.UserId == created.Id);
        profile.StudentNumber.Should().Be("MKNTHA001");

        var login = await Factory.CreateClient().PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = "thandi@uni.ac.za", Password = "Temporary123!" });
        login.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.Researcher)]
    public async Task CreateAccount_AsNonAdmin_IsForbidden(Role role)
    {
        await SeedUserAsync("someone@labtracker.local", role);
        var client = await CreateAuthenticatedClientAsync("someone@labtracker.local");

        var response = await client.PostAsJsonAsync("/api/users/accounts", new CreateAccountRequest
        {
            Email = "new@uni.ac.za", Password = "Temporary123!", Role = Role.ScienceOfficer, FullName = "New Officer",
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateAccount_WithInvalidRequest_Returns400AndCreatesNoLogin()
    {
        await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var admin = await CreateAuthenticatedClientAsync("admin@labtracker.local");

        var response = await admin.PostAsJsonAsync("/api/users/accounts", new CreateAccountRequest
        {
            Email = "nolab@uni.ac.za", Password = "Temporary123!", Role = Role.Researcher, FullName = "No Lab", StudentNumber = "X1",
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        (await db.Users.AnyAsync(u => u.Email == "nolab@uni.ac.za")).Should().BeFalse();
    }
}
