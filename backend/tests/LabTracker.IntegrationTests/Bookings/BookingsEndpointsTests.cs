using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Booking;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.IntegrationTests.Bookings;

public class BookingsEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    [Fact]
    public async Task Create_ForOwnResearcherProfile_Succeeds()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department);
        var group = await db.AddResearchGroupAsync(department, pi);
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department);

        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        await db.AddResearcherAsync(group, "Nadia Petrov", "STU1001", user.Id);

        var client = await CreateAuthenticatedClientAsync(user.Email);
        var request = new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(2),
            ScheduledEnd = DateTime.UtcNow.AddHours(3),
        };

        var response = await client.PostAsJsonAsync("/api/bookings", request);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await response.Content.ReadFromJsonAsync<BookingDto>(TestJson.Options);
        created!.Status.Should().Be(BookingStatus.Requested);
    }

    [Fact]
    public async Task Create_OverlappingAnExistingBooking_ReturnsConflict()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department);
        var group = await db.AddResearchGroupAsync(department, pi);
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department);

        var user = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        await db.AddResearcherAsync(group, "Nadia Petrov", "STU1001", user.Id);

        var client = await CreateAuthenticatedClientAsync(user.Email);
        var start = DateTime.UtcNow.AddHours(2);
        var end = start.AddHours(1);
        await client.PostAsJsonAsync("/api/bookings", new CreateBookingRequest { EquipmentId = equipment.Id, ScheduledStart = start, ScheduledEnd = end });

        var response = await client.PostAsJsonAsync("/api/bookings", new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = start.AddMinutes(30),
            ScheduledEnd = end.AddMinutes(30),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Create_OnBehalfOfSomeoneElseWithoutResearcherId_ReturnsBadRequest()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department);

        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var client = await CreateAuthenticatedClientAsync(admin.Email);

        var response = await client.PostAsJsonAsync("/api/bookings", new CreateBookingRequest
        {
            EquipmentId = equipment.Id,
            ScheduledStart = DateTime.UtcNow.AddHours(2),
            ScheduledEnd = DateTime.UtcNow.AddHours(3),
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetAll_ForResearcher_OnlyReturnsTheirOwnBookings()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department);
        var group = await db.AddResearchGroupAsync(department, pi);
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department);

        var nadia = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        await db.AddResearcherAsync(group, "Nadia Petrov", "STU1001", nadia.Id);
        var sam = await SeedUserAsync("sam@labtracker.local", Role.Researcher);
        await db.AddResearcherAsync(group, "Sam Reyes", "STU1002", sam.Id);

        var nadiaClient = await CreateAuthenticatedClientAsync(nadia.Email);
        await nadiaClient.PostAsJsonAsync("/api/bookings", new CreateBookingRequest { EquipmentId = equipment.Id, ScheduledStart = DateTime.UtcNow.AddHours(1), ScheduledEnd = DateTime.UtcNow.AddHours(2) });

        var samClient = await CreateAuthenticatedClientAsync(sam.Email);
        await samClient.PostAsJsonAsync("/api/bookings", new CreateBookingRequest { EquipmentId = equipment.Id, ScheduledStart = DateTime.UtcNow.AddHours(3), ScheduledEnd = DateTime.UtcNow.AddHours(4) });

        var response = await nadiaClient.GetAsync("/api/bookings");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var bookings = await response.Content.ReadFromJsonAsync<List<BookingDto>>(TestJson.Options);
        bookings.Should().ContainSingle();
    }

    [Fact]
    public async Task Cancel_ByAnotherResearcher_ReturnsForbidden()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var department = await db.AddDepartmentAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department);
        var group = await db.AddResearchGroupAsync(department, pi);
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        var equipment = await db.AddEquipmentAsync(room, type, department);

        var nadia = await SeedUserAsync("nadia@labtracker.local", Role.Researcher);
        await db.AddResearcherAsync(group, "Nadia Petrov", "STU1001", nadia.Id);
        var sam = await SeedUserAsync("sam@labtracker.local", Role.Researcher);
        await db.AddResearcherAsync(group, "Sam Reyes", "STU1002", sam.Id);

        var nadiaClient = await CreateAuthenticatedClientAsync(nadia.Email);
        var createResponse = await nadiaClient.PostAsJsonAsync("/api/bookings", new CreateBookingRequest { EquipmentId = equipment.Id, ScheduledStart = DateTime.UtcNow.AddHours(1), ScheduledEnd = DateTime.UtcNow.AddHours(2) });
        var created = await createResponse.Content.ReadFromJsonAsync<BookingDto>(TestJson.Options);

        var samClient = await CreateAuthenticatedClientAsync(sam.Email);
        var response = await samClient.PostAsync($"/api/bookings/{created!.Id}/cancel", content: null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
