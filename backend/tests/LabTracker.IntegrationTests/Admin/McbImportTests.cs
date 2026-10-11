using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Application.Modules.Admin;
using LabTracker.Application.Modules.Identity;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.IntegrationTests.Admin;

public class McbImportTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    // Calls the service directly: the test host runs as "Testing", where the
    // Features:McbImport flag (and so the endpoint) is off.
    private async Task<McbImportResult> ImportAsync()
    {
        using var scope = Factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<McbImportService>().ImportAsync();
    }

    [Fact]
    public async Task Import_CreatesTheSpreadsheetData_AndASecondRunCreatesNothing()
    {
        var first = await ImportAsync();
        var second = await ImportAsync();

        first.Should().Be(new McbImportResult(67, 0, 21, 18, 3, 6));
        second.Should().Be(new McbImportResult(0, 67, 0, 0, 0, 0));

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        (await db.Equipment.CountAsync()).Should().Be(67);
        (await db.Equipment.CountAsync(e => e.Status == EquipmentStatus.Faulty)).Should().Be(3);
        (await db.EquipmentScienceOfficers.CountAsync(s => s.IsPrimary)).Should().Be(67);
        (await db.Rooms.CountAsync(r => r.FacilityId != null)).Should().Be(4);
    }

    [Fact]
    public async Task Import_ReusesAnExistingRoomRegardlessOfCase()
    {
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
            db.Rooms.Add(new Domain.Modules.Equipment.Room { Building = "mcb building", Floor = "4th floor", RoomNumber = "416" });
            await db.SaveChangesAsync();
        }

        var result = await ImportAsync();

        result.RoomsCreated.Should().Be(17);
    }

    [Fact]
    public async Task ImportedScienceOfficers_AreInactive_AndCannotLogIn()
    {
        await ImportAsync();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var officers = await db.Users.Where(u => u.Email.EndsWith("@mcb.placeholder.invalid")).ToListAsync();
        officers.Should().HaveCount(6).And.OnlyContain(u => !u.IsActive && u.Role == Role.ScienceOfficer);

        var response = await Factory.CreateClient().PostAsJsonAsync(
            "/api/auth/login", new LoginRequest { Email = officers[0].Email, Password = "ChangeMe123!" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ImportEndpoint_WhenFeatureIsOff_Returns404_AndImportsNothing()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var client = await CreateAuthenticatedClientAsync(admin.Email);

        var status = await client.GetFromJsonAsync<Api.Controllers.McbImportStatus>("/api/admin/mcb-import");
        var response = await client.PostAsync("/api/admin/import-mcb-equipment", null);

        status!.Enabled.Should().BeFalse();
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var scope = Factory.Services.CreateScope();
        (await scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>().Equipment.CountAsync()).Should().Be(0);
    }

    [Theory]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.Researcher)]
    public async Task ImportEndpoint_RejectsNonAdmins(Role role)
    {
        var user = await SeedUserAsync($"{role.ToString().ToLowerInvariant()}@labtracker.local", role);
        var client = await CreateAuthenticatedClientAsync(user.Email);

        var response = await client.PostAsync("/api/admin/import-mcb-equipment", null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }
}
