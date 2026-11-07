using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using FluentAssertions;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.IntegrationTests.EquipmentAdmin;

public class EquipmentTransferEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    private static MultipartFormDataContent Upload(string fileName, string content)
    {
        var file = new ByteArrayContent(Encoding.UTF8.GetBytes(content));
        file.Headers.ContentType = new MediaTypeHeaderValue("text/csv");
        return new MultipartFormDataContent { { file, "file", fileName } };
    }

    [Fact]
    public async Task Import_ThenExport_AsSuperAdmin()
    {
        using (var scope = Factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
            var department = await db.AddDepartmentAsync();
            await db.AddRoomAsync(department);
            await db.AddEquipmentTypeAsync();
        }
        await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var admin = await CreateAuthenticatedClientAsync("admin@labtracker.local");
        var room = await GetRoomNumberAsync();
        var type = await GetTypeNameAsync();
        var csv = $"Name,Type,Room\r\nImported Centrifuge,{type},{room}\r\n";

        var preview = await (await admin.PostAsync("/api/equipment/import?dryRun=true", Upload("equipment.csv", csv)))
            .Content.ReadFromJsonAsync<EquipmentImportResult>(TestJson.Options);
        preview!.Added.Should().Be(1);
        preview.Committed.Should().BeFalse();

        var import = await (await admin.PostAsync("/api/equipment/import?dryRun=false", Upload("equipment.csv", csv)))
            .Content.ReadFromJsonAsync<EquipmentImportResult>(TestJson.Options);
        import!.Committed.Should().BeTrue();

        var export = await admin.GetAsync("/api/equipment/export?format=csv");
        export.Content.Headers.ContentType!.MediaType.Should().Be("text/csv");
        (await export.Content.ReadAsStringAsync()).Should().Contain("Imported Centrifuge");
    }

    [Fact]
    public async Task Import_RejectsOtherFileTypes()
    {
        await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        var admin = await CreateAuthenticatedClientAsync("admin@labtracker.local");

        var result = await (await admin.PostAsync("/api/equipment/import?dryRun=true", Upload("equipment.txt", "Name")))
            .Content.ReadFromJsonAsync<EquipmentImportResult>(TestJson.Options);

        result!.FileError.Should().Contain(".csv");
    }

    [Theory]
    [InlineData(Role.ScienceOfficer)]
    [InlineData(Role.Researcher)]
    public async Task ImportAndExport_AreForSuperAdminsOnly(Role role)
    {
        await SeedUserAsync("someone@labtracker.local", role);
        var client = await CreateAuthenticatedClientAsync("someone@labtracker.local");

        (await client.GetAsync("/api/equipment/export?format=csv")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await client.PostAsync("/api/equipment/import?dryRun=true", Upload("equipment.csv", "Name,Type,Room")))
            .StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<string> GetRoomNumberAsync()
    {
        using var scope = Factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>().Rooms.Select(r => r.RoomNumber).SingleAsync();
    }

    private async Task<string> GetTypeNameAsync()
    {
        using var scope = Factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>().EquipmentTypes.Select(t => t.Name).SingleAsync();
    }
}
