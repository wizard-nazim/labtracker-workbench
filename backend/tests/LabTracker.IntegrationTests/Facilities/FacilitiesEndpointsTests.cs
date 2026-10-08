using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Equipment;
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
        var user = await SeedUserAsync($"{role}@labtracker.local".ToLowerInvariant(), role);
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

    [Fact]
    public async Task AssigningARoomToAFacility_ShowsUpInTheFacilitysRoomList()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var department = await CreateDepartmentAsync();
        var client = await CreateAuthenticatedClientAsync(admin.Email);

        var facilityResponse = await client.PostAsJsonAsync("/api/facilities", new UpsertFacilityRequest { Name = "BSL2 - Mammalian", DepartmentId = department.Id });
        var facility = await facilityResponse.Content.ReadFromJsonAsync<FacilityDto>();

        var roomResponse = await client.PostAsJsonAsync("/api/rooms", new UpsertRoomRequest
        {
            Building = "Science Building",
            Floor = "4",
            RoomNumber = "432.2",
            FacilityId = facility!.Id,
        });
        roomResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var room = await roomResponse.Content.ReadFromJsonAsync<RoomDto>();
        room!.FacilityId.Should().Be(facility.Id);
        room.FacilityName.Should().Be("BSL2 - Mammalian");

        var getFacilityResponse = await client.GetAsync($"/api/facilities/{facility.Id}");
        var updatedFacility = await getFacilityResponse.Content.ReadFromJsonAsync<FacilityDto>();
        updatedFacility!.RoomLabels.Should().ContainSingle(label => label.Contains("432.2"));
    }

    private async Task<LabTracker.Domain.Modules.Organization.Department> CreateDepartmentAsync()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        return await db.AddDepartmentAsync();
    }
}
