using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Admin;
using LabTracker.Application.Modules.Booking;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Domain.Modules.Booking;
using LabTracker.Domain.Modules.Equipment;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;

namespace LabTracker.IntegrationTests.EquipmentAdmin;

public class EquipmentAdminEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    private sealed record Graph(Department Department, Room Room, EquipmentType Type, LabTracker.Domain.Modules.Equipment.Equipment Equipment);

    private async Task<Graph> SeedGraphAsync(EquipmentStatus status = EquipmentStatus.Available)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department, status: status);
        return new Graph(department, room, type, equipment);
    }

    private async Task<HttpClient> AdminClientAsync()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        return await CreateAuthenticatedClientAsync(admin.Email);
    }

    private async Task AddBookingAsync(int equipmentId, DateTime start, DateTime end, BookingStatus status)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var createdBy = await db.Users.FirstAsync();
        var actor = new UsageActor { ActorType = ActorType.Internal, DisplayNameSnapshot = "Someone" };
        var department = await db.Departments.FirstAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department, $"Dr. Pi {Guid.NewGuid():N}");
        var group = await db.AddResearchGroupAsync(department, pi, $"Lab {Guid.NewGuid():N}");
        var researcher = await db.AddResearcherAsync(group, "Someone", $"STU-{Guid.NewGuid():N}"[..12]);
        actor.ResearcherId = researcher.Id;
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync();

        db.Bookings.Add(new BookingEntity
        {
            EquipmentId = equipmentId,
            ActorId = actor.Id,
            ScheduledStart = start,
            ScheduledEnd = end,
            Status = status,
            CreatedByUserId = createdBy.Id,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    private static async Task<string> DetailAsync(HttpResponseMessage response)
    {
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("detail").GetString()!;
    }

    // ---- equipment types ----

    [Fact]
    public async Task DeleteEquipmentType_InUse_Returns409()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();

        var response = await client.DeleteAsync($"/api/equipment-types/{graph.Type.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await DetailAsync(response)).Should().Be("In use by 1 equipment.");
    }

    [Fact]
    public async Task DeleteEquipmentType_Unused_Returns204()
    {
        var client = await AdminClientAsync();
        int typeId;
        using (var scope = Factory.Services.CreateScope())
        {
            typeId = (await scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>().AddEquipmentTypeAsync("Spare")).Id;
        }

        var response = await client.DeleteAsync($"/api/equipment-types/{typeId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.GetAsync($"/api/equipment-types/{typeId}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- rooms ----

    [Fact]
    public async Task DeleteRoom_InUse_Returns409()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();

        var response = await client.DeleteAsync($"/api/rooms/{graph.Room.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await DetailAsync(response)).Should().Be("In use by 1 equipment.");
    }

    [Fact]
    public async Task DeleteRoom_Unused_Returns204()
    {
        var client = await AdminClientAsync();
        int roomId;
        using (var scope = Factory.Services.CreateScope())
        {
            roomId = (await scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>().AddRoomAsync(roomNumber: "999")).Id;
        }

        var response = await client.DeleteAsync($"/api/rooms/{roomId}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task CreateRoom_CaseVariantOfExisting_Returns409()
    {
        var client = await AdminClientAsync();
        await client.PostAsJsonAsync("/api/rooms", new UpsertRoomRequest { Building = "MCB Building", Floor = "4th Floor", RoomNumber = "305.A" });

        var response = await client.PostAsJsonAsync("/api/rooms", new UpsertRoomRequest { Building = "mcb building ", Floor = "4TH FLOOR", RoomNumber = "305.a" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UniqueIndex_RejectsACaseVariantRoom_EvenBypassingTheService()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        await db.AddRoomAsync(building: "MCB Building", floor: "4th Floor", roomNumber: "216A");

        db.Rooms.Add(new Room { Building = "MCB BUILDING", Floor = "4th floor", RoomNumber = "216a" });
        var act = () => db.SaveChangesAsync();

        (await act.Should().ThrowAsync<DbUpdateException>())
            .Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.SqlState.Should().Be(PostgresErrorCodes.UniqueViolation);
    }

    // ---- facilities ----

    [Fact]
    public async Task DeleteFacility_UnlinksItsRoomsAndOverseers_AndKeepsTheRooms()
    {
        var client = await AdminClientAsync();
        var overseer = await SeedUserAsync("so@labtracker.local", Role.ScienceOfficer);
        var graph = await SeedGraphAsync();
        var created = await (await client.PostAsJsonAsync("/api/facilities", new LabTracker.Application.Modules.Organization.UpsertFacilityRequest
        {
            Name = "BSL2 - Mammalian",
            DepartmentId = graph.Department.Id,
            OverseerUserIds = [overseer.Id],
        })).Content.ReadFromJsonAsync<LabTracker.Application.Modules.Organization.FacilityDto>();
        (await client.PutAsJsonAsync($"/api/rooms/{graph.Room.Id}", new UpsertRoomRequest
        {
            Building = graph.Room.Building,
            Floor = graph.Room.Floor,
            RoomNumber = graph.Room.RoomNumber,
            DepartmentId = graph.Department.Id,
            FacilityId = created!.Id,
        })).EnsureSuccessStatusCode();

        var response = await client.DeleteAsync($"/api/facilities/{created.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var room = await client.GetFromJsonAsync<RoomDto>($"/api/rooms/{graph.Room.Id}");
        room!.FacilityId.Should().BeNull();
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        (await db.Facilities.CountAsync()).Should().Be(0);
        (await db.Users.AnyAsync(u => u.Id == overseer.Id)).Should().BeTrue();
    }

    // ---- equipment ----

    [Fact]
    public async Task DeleteEquipment_WithBookings_Returns409()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();
        await AddBookingAsync(graph.Equipment.Id, DateTime.UtcNow.AddDays(-2), DateTime.UtcNow.AddDays(-2).AddHours(1), BookingStatus.Completed);

        var response = await client.DeleteAsync($"/api/equipment/{graph.Equipment.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await DetailAsync(response)).Should().Contain("archive instead");
    }

    [Fact]
    public async Task DeleteEquipment_WithoutHistory_RemovesItAndItsScienceOfficers()
    {
        var client = await AdminClientAsync();
        var so = await SeedUserAsync("so@labtracker.local", Role.ScienceOfficer);
        var graph = await SeedGraphAsync();
        (await client.PostAsJsonAsync($"/api/equipment/{graph.Equipment.Id}/science-officers", new AssignScienceOfficerRequest { UserId = so.Id, IsPrimary = true }))
            .EnsureSuccessStatusCode();

        var response = await client.DeleteAsync($"/api/equipment/{graph.Equipment.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        (await db.Equipment.CountAsync()).Should().Be(0);
        (await db.EquipmentScienceOfficers.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task Archive_WithLiveBooking_Returns409()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();
        await AddBookingAsync(graph.Equipment.Id, DateTime.UtcNow.AddHours(1), DateTime.UtcNow.AddHours(2), BookingStatus.Approved);

        var response = await client.PostAsync($"/api/equipment/{graph.Equipment.Id}/archive", null);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await DetailAsync(response)).Should().StartWith("Has 1 upcoming or in-progress booking");
    }

    [Fact]
    public async Task Archive_HidesFromList_BlocksBookings_AndUnarchiveRestores()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();
        var researcherUser = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
            var pi = await db.AddPrincipalInvestigatorAsync(await db.Departments.FirstAsync());
            var group = await db.AddResearchGroupAsync(await db.Departments.FirstAsync(), pi);
            await db.AddResearcherAsync(group, "Nadia Petrov", "STU1001", researcherUser.Id);
        }

        var archive = await client.PostAsync($"/api/equipment/{graph.Equipment.Id}/archive", null);
        archive.StatusCode.Should().Be(HttpStatusCode.OK);
        (await archive.Content.ReadFromJsonAsync<EquipmentDto>(TestJson.Options))!.Status.Should().Be(EquipmentStatus.Retired);

        (await client.GetFromJsonAsync<List<EquipmentDto>>("/api/equipment", TestJson.Options)).Should().BeEmpty();
        (await client.GetFromJsonAsync<List<EquipmentDto>>("/api/equipment?includeArchived=true", TestJson.Options)).Should().ContainSingle();

        var researcherClient = await CreateAuthenticatedClientAsync(researcherUser.Email);
        var booking = await researcherClient.PostAsJsonAsync("/api/bookings", new CreateBookingRequest
        {
            EquipmentId = graph.Equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(2),
            ScheduledEnd = DateTime.UtcNow.AddHours(3),
        });
        booking.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var unarchive = await client.PostAsync($"/api/equipment/{graph.Equipment.Id}/unarchive", null);
        unarchive.StatusCode.Should().Be(HttpStatusCode.OK);
        (await unarchive.Content.ReadFromJsonAsync<EquipmentDto>(TestJson.Options))!.Status.Should().Be(EquipmentStatus.Available);
    }

    [Fact]
    public async Task GetAll_SortsByCreatedAtDescending()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
            var newer = await db.AddEquipmentAsync(graph.Room, graph.Type, graph.Department, "Aardvark Newer");
            newer.CreatedAt = DateTime.UtcNow.AddMinutes(5);
            await db.SaveChangesAsync();
        }

        var list = await client.GetFromJsonAsync<List<EquipmentDto>>("/api/equipment?sort=createdAt&dir=desc", TestJson.Options);

        list!.Select(e => e.Name).Should().Equal("Aardvark Newer", "Centrifuge X200");
    }

    [Fact]
    public async Task CreateAndRead_RoundTripsOwnershipLabAndTimestamps()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();
        var owner = await SeedUserAsync("so@labtracker.local", Role.ScienceOfficer);
        int labId;
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
            var pi = await db.AddPrincipalInvestigatorAsync(graph.Department);
            labId = (await db.AddResearchGroupAsync(graph.Department, pi, "Plant Stress")).Id;
        }

        var response = await client.PostAsJsonAsync("/api/equipment", new
        {
            name = "Growth Chamber",
            equipmentTypeId = graph.Type.Id,
            roomId = graph.Room.Id,
            owningDepartmentId = graph.Department.Id,
            ownershipType = "Individual",
            ownerUserId = owner.Id,
            researchGroupId = labId,
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = doc.RootElement;
        root.GetProperty("ownershipType").GetString().Should().Be("Individual");
        root.GetProperty("owner").GetProperty("id").GetInt32().Should().Be(owner.Id);
        root.GetProperty("owner").GetProperty("name").GetString().Should().Be("so@labtracker.local");
        root.GetProperty("researchGroup").GetProperty("name").GetString().Should().Be("Plant Stress");
        root.GetProperty("createdAt").GetDateTime().Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(1));
        root.GetProperty("updatedAt").GetString().Should().EndWith("Z");
    }

    [Fact]
    public async Task Create_WithoutOwnershipFields_DefaultsToDepartment()
    {
        var client = await AdminClientAsync();
        var graph = await SeedGraphAsync();

        var response = await client.PostAsJsonAsync("/api/equipment", new
        {
            name = "Old Client Payload",
            equipmentTypeId = graph.Type.Id,
            roomId = graph.Room.Id,
            owningDepartmentId = graph.Department.Id,
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var dto = await response.Content.ReadFromJsonAsync<EquipmentDto>(TestJson.Options);
        dto!.OwnershipType.Should().Be(OwnershipType.Department);
        dto.Owner.Should().BeNull();
        dto.ResearchGroup.Should().BeNull();
    }

    // ---- role access ----

    public static TheoryData<Role, string, string> NonAdminEndpoints()
    {
        var data = new TheoryData<Role, string, string>();
        foreach (var role in new[] { Role.ScienceOfficer, Role.Researcher, Role.PrincipalInvestigator })
        {
            data.Add(role, "DELETE", "/api/equipment-types/{type}");
            data.Add(role, "DELETE", "/api/rooms/{room}");
            data.Add(role, "DELETE", "/api/facilities/1");
            data.Add(role, "DELETE", "/api/equipment/{equipment}");
            data.Add(role, "POST", "/api/equipment/{equipment}/archive");
            data.Add(role, "POST", "/api/equipment/{equipment}/unarchive");
        }
        return data;
    }

    [Theory]
    [MemberData(nameof(NonAdminEndpoints))]
    public async Task AdminOnlyEndpoints_AreForbiddenForOtherRoles(Role role, string method, string urlTemplate)
    {
        var graph = await SeedGraphAsync();
        var user = await SeedUserAsync($"{role}@labtracker.local".ToLowerInvariant(), role);
        var client = await CreateAuthenticatedClientAsync(user.Email);
        var url = urlTemplate
            .Replace("{type}", graph.Type.Id.ToString())
            .Replace("{room}", graph.Room.Id.ToString())
            .Replace("{equipment}", graph.Equipment.Id.ToString());

        var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), url));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    // ---- regression: demo reset still clears equipment with owners/labs ----

    [Fact]
    public async Task ResetDemoData_StillSucceeds_WithOwnedLabEquipment()
    {
        var owner = await SeedUserAsync("so@labtracker.local", Role.ScienceOfficer);
        var graph = await SeedGraphAsync();
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
            var pi = await db.AddPrincipalInvestigatorAsync(graph.Department);
            var lab = await db.AddResearchGroupAsync(graph.Department, pi);
            var equipment = await db.Equipment.SingleAsync();
            equipment.OwnershipType = OwnershipType.Individual;
            equipment.OwnerUserId = owner.Id;
            equipment.ResearchGroupId = lab.Id;
            await db.SaveChangesAsync();
        }

        using (var scope = Factory.Services.CreateScope())
        {
            await scope.ServiceProvider.GetRequiredService<AdminService>().ResetDemoDataAsync();
        }

        using var verify = Factory.Services.CreateScope();
        var verifyDb = verify.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        (await verifyDb.Equipment.CountAsync()).Should().Be(0);
        (await verifyDb.Users.Select(u => u.Email).ToListAsync()).Should().BeEquivalentTo(
            "admin@labtracker.local", "so@labtracker.local", "researcher@labtracker.local");
    }
}
