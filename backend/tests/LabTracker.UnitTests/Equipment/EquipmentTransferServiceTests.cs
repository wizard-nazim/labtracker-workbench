using System.Text;
using FluentAssertions;
using LabTracker.Application.Modules.Equipment;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;
using LabTracker.UnitTests.TestSupport;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.UnitTests.Equipment;

public class EquipmentTransferServiceTests
{
    private const string Header = "Name,Type,Building,Floor,Room,Owning department,Lab,Serial number,Status,Shared,Description";

    private static (LabTrackerDbContext Db, EquipmentTransferService Sut) Build()
    {
        var db = TestDbContextFactory.Create();
        var department = db.AddDepartment("Molecular and Cell Biology", "MCB");
        db.AddRoom(department, "Science Building", "1", "101");
        db.AddRoom(department, "Science Building", "2", "201");
        db.AddEquipmentType("Centrifuge");
        db.AddResearchGroup(department, db.AddPrincipalInvestigator(department), "Okafor Lab");
        return (db, new EquipmentTransferService(db));
    }

    private static MemoryStream Csv(params string[] lines) => new(Encoding.UTF8.GetBytes(string.Join("\r\n", lines)));

    [Fact]
    public async Task DryRun_PreviewsRows_AndWritesNothing()
    {
        var (db, sut) = Build();

        var result = await sut.ImportAsync(Csv(Header, "Centrifuge A,centrifuge,,,101,,Okafor Lab,SN-1,,yes,\"Bench model, 15,000 rpm\""), TableFormat.Csv, dryRun: true);

        result.Errors.Should().Be(0);
        result.Added.Should().Be(1);
        result.Committed.Should().BeFalse();
        (await db.Equipment.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task Import_AddsRows_MatchingNamesIgnoringCase()
    {
        var (db, sut) = Build();

        var result = await sut.ImportAsync(
            Csv(Header, "Centrifuge A,CENTRIFUGE,science building,1,101,,okafor lab,SN-1,Under maintenance,yes,\"Bench model, 15,000 rpm\""),
            TableFormat.Csv, dryRun: false);

        result.Committed.Should().BeTrue();
        var equipment = await db.Equipment.Include(e => e.Room).Include(e => e.ResearchGroup).SingleAsync();
        equipment.Room.RoomNumber.Should().Be("101");
        equipment.ResearchGroup!.Name.Should().Be("Okafor Lab");
        equipment.Status.Should().Be(EquipmentStatus.UnderMaintenance);
        equipment.IsShared.Should().BeTrue();
        equipment.Description.Should().Be("Bench model, 15,000 rpm");
        equipment.OwningDepartmentId.Should().Be(equipment.Room.DepartmentId!.Value);
    }

    [Fact]
    public async Task UnknownRoomOrType_IsARowError_AndNothingIsImported()
    {
        var (db, sut) = Build();

        var result = await sut.ImportAsync(
            Csv(Header, "Good one,Centrifuge,,,101,,,,,,", "Bad room,Centrifuge,,,999,,,,,,", "Bad type,Microscope,,,201,,,,,,"),
            TableFormat.Csv, dryRun: false);

        result.Committed.Should().BeFalse();
        result.Errors.Should().Be(2);
        result.Rows.Single(r => r.Row == 3).Message.Should().Contain("No room");
        result.Rows.Single(r => r.Row == 4).Message.Should().Contain("No equipment type");
        (await db.Equipment.AnyAsync()).Should().BeFalse();
    }

    [Fact]
    public async Task Duplicates_InTheDatabaseOrTheFile_AreSkipped()
    {
        var (db, sut) = Build();
        db.AddEquipment(db.Rooms.Single(r => r.RoomNumber == "101"), db.EquipmentTypes.Single(), db.Departments.Single(), "Centrifuge A");

        var result = await sut.ImportAsync(
            Csv(Header, "centrifuge a,Centrifuge,,,101,,,,,,", "Centrifuge B,Centrifuge,,,101,,,,,,", "Centrifuge B,Centrifuge,,,101,,,,,,"),
            TableFormat.Csv, dryRun: false);

        result.Rows.Select(r => r.Outcome).Should().Equal(ImportRowOutcome.Skip, ImportRowOutcome.Add, ImportRowOutcome.Skip);
        (await db.Equipment.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task MissingRequiredColumns_IsAFileError()
    {
        var (_, sut) = Build();

        var result = await sut.ImportAsync(Csv("Name,Serial number", "Centrifuge A,SN-1"), TableFormat.Csv, dryRun: true);

        result.FileError.Should().Contain("Type").And.Contain("Room");
    }

    [Theory]
    [InlineData(TableFormat.Csv)]
    [InlineData(TableFormat.Xlsx)]
    public async Task Export_ThenImport_RoundTripsWithNoChanges(TableFormat format)
    {
        var (db, sut) = Build();
        var room = db.Rooms.Single(r => r.RoomNumber == "201");
        db.AddEquipment(room, db.EquipmentTypes.Single(), db.Departments.Single(), "-80 Freezer, upright");
        db.AddEquipment(room, db.EquipmentTypes.Single(), db.Departments.Single(), "Centrifuge \"Big\"", EquipmentStatus.Faulty);

        var exported = await sut.ExportAsync(format);
        var result = await sut.ImportAsync(new MemoryStream(exported), format, dryRun: true);

        result.FileError.Should().BeNull();
        result.Errors.Should().Be(0);
        result.Rows.Should().HaveCount(2).And.OnlyContain(r => r.Outcome == ImportRowOutcome.Skip);
        result.Rows.Select(r => r.Name).Should().BeEquivalentTo("-80 Freezer, upright", "Centrifuge \"Big\"");
    }

    [Fact]
    public void CsvExport_NeutralisesFormulas()
    {
        var bytes = EquipmentTable.Write(TableFormat.Csv, ["Name"], [["=HYPERLINK(\"x\")"]]);

        Encoding.UTF8.GetString(bytes).Should().Contain("\"'=HYPERLINK(\"\"x\"\")\"");
    }

    [Theory]
    [InlineData(TableFormat.Csv)]
    [InlineData(TableFormat.Xlsx)]
    public async Task Template_ImportsCleanly_OnceItsRoomAndTypeExist(TableFormat format)
    {
        var db = TestDbContextFactory.Create();
        var department = db.AddDepartment("Molecular and Cell Biology", "MCB");
        db.AddRoom(department, "Molecular Biology", "2nd floor", "2.14");
        db.AddEquipmentType("Centrifuge");
        var sut = new EquipmentTransferService(db);

        var result = await sut.ImportAsync(new MemoryStream(EquipmentTransferService.Template(format)), format, dryRun: true);

        result.Errors.Should().Be(0, string.Join("; ", result.Rows.Select(r => r.Message)));
        result.Added.Should().Be(1);
    }
}
