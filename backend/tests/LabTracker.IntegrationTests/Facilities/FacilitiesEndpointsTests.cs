using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Organization;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.IntegrationTests.Facilities;

public class FacilitiesEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task Create_AsSuperAdmin_Succeeds()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var overseer = await SeedUserAsync("so@labtracker.local", Role.ScienceOfficer);
        var department = await CreateDepartmentAsync();
        var client = await CreateAuthenticatedClientAsync(admin.Email);

        var response = await client.PostAsJsonAsync("/api/facilities", new UpsertFacilityRequest
        {
            Name = "Imaging Core",
            DepartmentId = department.Id,
            OverseerUserIds = [overseer.Id],
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<FacilityDto>();
        created!.Name.Should().Be("Imaging Core");
    }

    [Theory]
    [InlineData(Role.Researcher)]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.PrincipalInvestigator)]
    public async Task Create_AsNonSuperAdmin_ReturnsForbidden(Role role)
    {
        var user = await SeedUserAsync($"{role}@labtracker.local", role);
        var department = await CreateDepartmentAsync();
        var client = await CreateAuthenticatedClientAsync(user.Email);

        var response = await client.PostAsJsonAsync("/api/facilities", new UpsertFacilityRequest { Name = "Imaging Core", DepartmentId = department.Id });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Create_WithNonScienceOfficerOverseer_ReturnsBadRequest()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var researcher = await SeedUserAsync("researcher@labtracker.local", Role.Researcher);
        var department = await CreateDepartmentAsync();
        var client = await CreateAuthenticatedClientAsync(admin.Email);

        var response = await client.PostAsJsonAsync("/api/facilities", new UpsertFacilityRequest
        {
            Name = "Imaging Core",
            DepartmentId = department.Id,
            OverseerUserIds = [researcher.Id],
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAll_IsAvailableToAnyAuthenticatedRole()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var department = await CreateDepartmentAsync();
        var adminClient = await CreateAuthenticatedClientAsync(admin.Email);
        await adminClient.PostAsJsonAsync("/api/facilities", new UpsertFacilityRequest { Name = "Imaging Core", DepartmentId = department.Id });

        var researcher = await SeedUserAsync("researcher@labtracker.local", Role.Researcher);
        var researcherClient = await CreateAuthenticatedClientAsync(researcher.Email);

        var response = await researcherClient.GetAsync("/api/facilities");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var facilities = await response.Content.ReadFromJsonAsync<List<FacilityDto>>();
        facilities.Should().ContainSingle(f => f.Name == "Imaging Core");
    }

    [Fact]
    public async Task GetAll_WithoutAuthentication_ReturnsUnauthorized()
    {
        var client = Factory.CreateClient();

        var response = await client.GetAsync("/api/facilities");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<LabTracker.Domain.Modules.Organization.Department> CreateDepartmentAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        return await db.AddDepartmentAsync();
    }
}
