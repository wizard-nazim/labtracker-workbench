using FluentAssertions;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;

namespace LabTracker.IntegrationTests.Persistence;

// The EquipmentOwnershipLabTimestamps migration against data written before it:
// stray whitespace in room fields is trimmed, existing equipment gets real
// timestamps, and rooms that only differ by case stop the migration loudly.
public class EquipmentOwnershipLabTimestampsMigrationTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    private const string PreviousMigration = "20261008081358_EnforceUniqueActorsAndLowercaseEmails";

    [Fact]
    public async Task Migration_TrimsRooms_AndBackfillsEquipmentTimestamps()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var migrator = db.GetService<IMigrator>();

        await migrator.MigrateAsync(PreviousMigration);
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO "Departments" ("Name", "Code") VALUES ('Molecular and Cell Biology', 'MCB');
                INSERT INTO "EquipmentTypes" ("Name") VALUES ('Centrifuge');
                INSERT INTO "Rooms" ("Building", "Floor", "RoomNumber") VALUES ('  MCB Building ', '4th Floor ', ' 432.2');
                INSERT INTO "Equipment" ("Name", "IsShared", "Status", "EquipmentTypeId", "RoomId", "OwningDepartmentId")
                SELECT 'Centrifuge X200', true, 0, t."Id", r."Id", d."Id" FROM "EquipmentTypes" t, "Rooms" r, "Departments" d;
                """);

            await migrator.MigrateAsync();

            db.ChangeTracker.Clear();
            var room = await db.Rooms.SingleAsync();
            (room.Building, room.Floor, room.RoomNumber).Should().Be(("MCB Building", "4th Floor", "432.2"));
            var equipment = await db.Equipment.SingleAsync();
            equipment.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromMinutes(5));
            equipment.UpdatedAt.Should().Be(equipment.CreatedAt);
        }
        finally
        {
            await migrator.MigrateAsync();
        }
    }

    [Fact]
    public async Task Migration_WithCaseVariantRooms_FailsWithAClearMessage()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var migrator = db.GetService<IMigrator>();

        await migrator.MigrateAsync(PreviousMigration);
        try
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO "Rooms" ("Building", "Floor", "RoomNumber")
                VALUES ('MCB Building', '4th Floor', '305.A'), ('mcb building ', '4th floor', '305.a');
                """);

            var act = () => migrator.MigrateAsync();

            (await act.Should().ThrowAsync<PostgresException>())
                .Which.MessageText.Should().Contain("Rooms differ only by letter case").And.Contain("mcb building / 4th floor / 305.a");
        }
        finally
        {
            // Resolve the clash the way an admin would, then leave the shared
            // database fully migrated for the other tests.
            await db.Database.ExecuteSqlRawAsync("""DELETE FROM "Rooms" WHERE "Building" LIKE 'mcb building%'""");
            await migrator.MigrateAsync();
        }
    }
}
