using FluentAssertions;
using LabTracker.Application.Modules.Identity;
using LabTracker.Domain.Modules.Booking;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using Npgsql;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;

namespace LabTracker.IntegrationTests.Persistence;

// The EnforceUniqueActorsAndLowercaseEmails migration: one UsageActor per
// researcher/contact, and login emails stored lower-cased so the unique index on
// Users.Email is effectively case-insensitive. Both are Postgres-side guarantees.
public class UniqueActorsAndLowercaseEmailsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    private const string PreviousMigration = "20261008074833_AddBookingConcurrencyToken";

    [Fact]
    public async Task SecondActorRow_ForTheSameResearcher_ViolatesTheUniqueIndex()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var researcher = await SeedResearcherAsync(db);

        db.UsageActors.Add(NewActor(researcher.Id));
        await db.SaveChangesAsync();
        db.UsageActors.Add(NewActor(researcher.Id));

        var act = () => db.SaveChangesAsync();

        (await act.Should().ThrowAsync<DbUpdateException>())
            .Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.SqlState.Should().Be(PostgresErrorCodes.UniqueViolation);
    }

    [Fact]
    public async Task MixedCaseEmail_WrittenDirectly_ViolatesTheLowercaseCheck()
    {
        var act = () => SeedUserAsync("Mixed@LabTracker.local", Role.Researcher);

        (await act.Should().ThrowAsync<DbUpdateException>())
            .Which.InnerException.Should().BeOfType<PostgresException>()
            .Which.SqlState.Should().Be(PostgresErrorCodes.CheckViolation);
    }

    [Fact]
    public async Task Login_WithDifferentlyCasedEmail_Succeeds()
    {
        await SeedUserAsync("nadia@labtracker.local", Role.Researcher);

        using var scope = Factory.Services.CreateScope();
        var result = await scope.ServiceProvider.GetRequiredService<AuthService>()
            .LoginAsync(new LoginRequest { Email = "Nadia@LabTracker.local", Password = DefaultPassword });

        result.Should().NotBeNull();
    }

    // Data written before the migration (duplicate actors from the old race,
    // mixed-case emails) must be cleaned up by it rather than make it fail.
    [Fact]
    public async Task Migration_MergesDuplicateActors_AndLowercasesExistingEmails()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var migrator = db.GetService<IMigrator>();

        await migrator.MigrateAsync(PreviousMigration);
        try
        {
            // Raw SQL for the same reason as Equipment below: Users has since gained columns.
            var creatorId = (await db.Database.SqlQueryRaw<int>(
                """
                INSERT INTO "Users" ("Email", "PasswordHash", "Role", "IsActive", "CreatedAt")
                VALUES ('Admin@LabTracker.local', 'unused', {0}, true, now())
                RETURNING "Id" AS "Value"
                """,
                (int)Role.SuperAdmin).ToListAsync()).Single();

            var researcher = await SeedResearcherAsync(db, schemaIsOlderThanTheModel: true);
            var keep = NewActor(researcher.Id);
            var duplicate = NewActor(researcher.Id);
            db.UsageActors.AddRange(keep, duplicate);
            await db.SaveChangesAsync();

            var equipmentId = await db.Database.SqlQueryRaw<int>("""SELECT "Id" AS "Value" FROM "Equipment" """).SingleAsync();
            db.Bookings.Add(new BookingEntity
            {
                EquipmentId = equipmentId,
                ActorId = duplicate.Id,
                ScheduledStart = DateTime.UtcNow.AddHours(2),
                ScheduledEnd = DateTime.UtcNow.AddHours(3),
                Status = BookingStatus.Approved,
                CreatedByUserId = creatorId,
                CreatedAt = DateTime.UtcNow,
            });
            await db.SaveChangesAsync();

            await migrator.MigrateAsync();

            db.ChangeTracker.Clear();
            (await db.UsageActors.Select(a => a.Id).ToListAsync()).Should().Equal(keep.Id);
            (await db.Bookings.Select(b => b.ActorId).SingleAsync()).Should().Be(keep.Id);
            (await db.Users.Select(u => u.Email).SingleAsync()).Should().Be("admin@labtracker.local");
        }
        finally
        {
            // Leave the shared database fully migrated for the other tests.
            await migrator.MigrateAsync();
        }
    }

    private static UsageActor NewActor(int researcherId) => new()
    {
        ActorType = ActorType.Internal,
        ResearcherId = researcherId,
        DisplayNameSnapshot = "Nadia Petrov",
    };

    // schemaIsOlderThanTheModel: the database has been migrated back to an
    // earlier migration, so Equipment is inserted with raw SQL using only the
    // columns that existed then (the EF model has since gained more).
    private static async Task<LabTracker.Domain.Modules.Organization.Researcher> SeedResearcherAsync(LabTrackerDbContext db, bool schemaIsOlderThanTheModel = false)
    {
        var department = await db.AddDepartmentAsync();
        var pi = await db.AddPrincipalInvestigatorAsync(department);
        var group = await db.AddResearchGroupAsync(department, pi);
        var room = await db.AddRoomAsync(department);
        var type = await db.AddEquipmentTypeAsync();
        if (schemaIsOlderThanTheModel)
        {
            await db.Database.ExecuteSqlRawAsync(
                """
                INSERT INTO "Equipment" ("Name", "IsShared", "Status", "EquipmentTypeId", "RoomId", "OwningDepartmentId")
                VALUES ('Centrifuge X200', true, 0, {0}, {1}, {2})
                """,
                type.Id, room.Id, department.Id);
        }
        else
        {
            await db.AddEquipmentAsync(room, type, department);
        }

        return await db.AddResearcherAsync(group);
    }
}
