using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.Application.Modules.Equipment;

public enum ImportRowOutcome
{
    Add,
    Skip,
    Error,
}

public class ImportRowResult
{
    // As numbered in a spreadsheet: the header is row 1.
    public int Row { get; set; }
    public string Name { get; set; } = string.Empty;
    public ImportRowOutcome Outcome { get; set; }
    public string? Message { get; set; }
}

public class EquipmentImportResult
{
    public bool Committed { get; set; }
    public int Added { get; set; }
    public int Skipped { get; set; }
    public int Errors { get; set; }
    // A problem with the file as a whole (unreadable, missing columns, too big).
    public string? FileError { get; set; }
    public List<ImportRowResult> Rows { get; set; } = [];
}

// Equipment as a spreadsheet: export, a template, and import with a dry run.
// Rooms, types, departments and labs are matched by name (ignoring case), so
// they have to exist first; the preview says which rows can't be matched.
// Nothing is written unless every row is fine, in a single SaveChanges.
public class EquipmentTransferService(IApplicationDbContext db)
{
    public const long MaxFileBytes = 2 * 1024 * 1024;
    public const int MaxRows = 2000;

    public static readonly string[] Headers =
        ["Name", "Type", "Building", "Floor", "Room", "Owning department", "Lab", "Serial number", "Status", "Shared", "Description"];

    private static readonly string[] RequiredHeaders = ["Name", "Type", "Room"];

    public async Task<byte[]> ExportAsync(TableFormat format, CancellationToken cancellationToken = default)
    {
        var rows = await db.Equipment
            .OrderBy(e => e.Name).ThenBy(e => e.Id)
            .Select(e => new[]
            {
                e.Name,
                e.EquipmentType.Name,
                e.Room.Building,
                e.Room.Floor,
                e.Room.RoomNumber,
                e.OwningDepartment.Name,
                e.ResearchGroup != null ? e.ResearchGroup.Name : "",
                e.SerialNumber ?? "",
                e.Status.ToString(),
                e.IsShared ? "Yes" : "No",
                e.Description ?? "",
            })
            .ToListAsync(cancellationToken);

        return EquipmentTable.Write(format, Headers, rows);
    }

    public static byte[] Template(TableFormat format) => EquipmentTable.Write(format, Headers,
    [
        ["Centrifuge X200", "Centrifuge", "Molecular Biology", "2nd floor", "2.14", "Molecular and Cell Biology", "", "SN-0001", "Available", "No", "Bench model, max 15,000 rpm"],
    ]);

    public async Task<EquipmentImportResult> ImportAsync(Stream file, TableFormat format, bool dryRun, CancellationToken cancellationToken = default)
    {
        List<string[]> table;
        try
        {
            table = EquipmentTable.Read(format, file);
        }
        catch (FormatException ex)
        {
            return new EquipmentImportResult { FileError = ex.Message };
        }

        // Spreadsheets often carry trailing blank rows.
        var rows = table.Skip(1).Select((cells, i) => (Number: i + 2, Cells: cells))
            .Where(r => r.Cells.Any(c => !string.IsNullOrWhiteSpace(c)))
            .ToList();

        if (table.Count == 0) return new EquipmentImportResult { FileError = "The file is empty." };
        if (rows.Count > MaxRows) return new EquipmentImportResult { FileError = $"The file has {rows.Count} rows; the limit is {MaxRows}. Split it into smaller files." };

        var columns = table[0].Select((h, i) => (Header: h.Trim(), Index: i))
            .Where(h => h.Header.Length > 0)
            .GroupBy(h => h.Header, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First().Index, StringComparer.OrdinalIgnoreCase);
        var missing = RequiredHeaders.Where(h => !columns.ContainsKey(h)).ToList();
        if (missing.Count > 0)
        {
            return new EquipmentImportResult
            {
                FileError = $"The first row must be the column names. Missing: {string.Join(", ", missing)}. Download the template to see the layout.",
            };
        }

        var lookups = await Lookups.LoadAsync(db, cancellationToken);
        var result = new EquipmentImportResult();
        var toAdd = new List<EquipmentEntity>();
        var now = DateTime.UtcNow;

        foreach (var (number, cells) in rows)
        {
            string Cell(string header) => columns.TryGetValue(header, out var i) && i < cells.Length ? Clean(cells[i]) : "";

            var row = new ImportRowResult { Row = number, Name = Cell("Name") };
            var errors = new List<string>();
            var equipment = Build(row.Name, Cell, lookups, errors, now);

            if (errors.Count > 0)
            {
                row.Outcome = ImportRowOutcome.Error;
                row.Message = string.Join(" ", errors);
                result.Errors++;
            }
            else if (!lookups.ExistingNames.Add((equipment!.RoomId, equipment.Name.ToLowerInvariant())))
            {
                row.Outcome = ImportRowOutcome.Skip;
                row.Message = "Already exists in this room (or appears earlier in the file).";
                result.Skipped++;
            }
            else
            {
                row.Outcome = ImportRowOutcome.Add;
                toAdd.Add(equipment);
                result.Added++;
            }
            result.Rows.Add(row);
        }

        if (!dryRun && result.Errors == 0 && toAdd.Count > 0)
        {
            db.Equipment.AddRange(toAdd);
            await db.SaveChangesAsync(cancellationToken);
            result.Committed = true;
        }
        return result;
    }

    private static EquipmentEntity? Build(string name, Func<string, string> cell, Lookups lookups, List<string> errors, DateTime now)
    {
        if (name.Length == 0) errors.Add("Name is empty.");
        else if (name.Length > 200) errors.Add("Name is longer than 200 characters.");

        var serial = cell("Serial number");
        if (serial.Length > 100) errors.Add("Serial number is longer than 100 characters.");

        var typeName = cell("Type");
        int? typeId = null;
        if (typeName.Length == 0) errors.Add("Type is empty.");
        else if (lookups.Types.TryGetValue(typeName, out var t)) typeId = t;
        else errors.Add($"No equipment type called \"{typeName}\". Add it under Admin › Equipment › Types first.");

        var room = FindRoom(cell("Building"), cell("Floor"), cell("Room"), lookups, errors);

        int? departmentId = null;
        var departmentName = cell("Owning department");
        if (departmentName.Length > 0)
        {
            if (lookups.Departments.TryGetValue(departmentName, out var d)) departmentId = d;
            else errors.Add($"No department called \"{departmentName}\".");
        }
        else if (room?.DepartmentId is { } roomDepartment) departmentId = roomDepartment;
        else if (lookups.Departments.Count == 1) departmentId = lookups.Departments.Values.Single();
        else if (room is not null) errors.Add("Owning department is empty and the room doesn't belong to one.");

        int? labId = null;
        var labName = cell("Lab");
        if (labName.Length > 0)
        {
            if (lookups.Labs.TryGetValue(labName, out var l)) labId = l;
            else errors.Add($"No lab called \"{labName}\".");
        }

        var status = EquipmentStatus.Available;
        var statusText = cell("Status").Replace(" ", "");
        if (statusText.Length > 0 && (!Enum.TryParse(statusText, ignoreCase: true, out status) || !Enum.IsDefined(status)))
        {
            errors.Add($"Status \"{cell("Status")}\" isn't one of Available, Faulty, Under maintenance or Retired.");
        }

        bool? shared = cell("Shared").ToLowerInvariant() switch
        {
            "" or "no" or "n" or "false" or "0" => false,
            "yes" or "y" or "true" or "1" => true,
            _ => null,
        };
        if (shared is null) errors.Add($"Shared \"{cell("Shared")}\" should be Yes or No.");

        if (errors.Count > 0) return null;

        var description = cell("Description");
        return new EquipmentEntity
        {
            Name = name,
            SerialNumber = serial.Length > 0 ? serial : null,
            Description = description.Length > 0 ? description : null,
            IsShared = shared!.Value,
            Status = status,
            EquipmentTypeId = typeId!.Value,
            RoomId = room!.Id,
            OwningDepartmentId = departmentId!.Value,
            OwnershipType = OwnershipType.Department,
            ResearchGroupId = labId,
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    // The room number alone is enough when it's unique; building and floor
    // narrow it down when it isn't.
    private static RoomRef? FindRoom(string building, string floor, string number, Lookups lookups, List<string> errors)
    {
        if (number.Length == 0)
        {
            errors.Add("Room is empty.");
            return null;
        }

        var matches = lookups.Rooms
            .Where(r => Same(r.RoomNumber, number)
                && (building.Length == 0 || Same(r.Building, building))
                && (floor.Length == 0 || Same(r.Floor, floor)))
            .ToList();

        var where = string.Join(", ", new[] { building, floor, number }.Where(s => s.Length > 0));
        if (matches.Count == 1) return matches[0];
        errors.Add(matches.Count == 0
            ? $"No room {where}. Add it under Admin › Rooms first."
            : $"More than one room matches {where}. Fill in Building and Floor.");
        return null;
    }

    private static bool Same(string a, string b) => string.Equals(a.Trim(), b, StringComparison.OrdinalIgnoreCase);

    // Undoes the export's guard against spreadsheet formulas ('=…) and trims.
    private static string Clean(string value)
    {
        value = value.Trim();
        return value.Length > 1 && value[0] == '\'' && "=+-@".Contains(value[1]) ? value[1..] : value;
    }

    private sealed record RoomRef(int Id, string Building, string Floor, string RoomNumber, int? DepartmentId);

    private sealed class Lookups
    {
        public required Dictionary<string, int> Types { get; init; }
        public required Dictionary<string, int> Departments { get; init; }
        public required Dictionary<string, int> Labs { get; init; }
        public required List<RoomRef> Rooms { get; init; }
        // (RoomId, lower-case name) of equipment that exists or is being added.
        public required HashSet<(int, string)> ExistingNames { get; init; }

        public static async Task<Lookups> LoadAsync(IApplicationDbContext db, CancellationToken ct)
        {
            static Dictionary<string, int> ByName(IEnumerable<(string Name, int Id)> items) => items
                .GroupBy(i => i.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().Id, StringComparer.OrdinalIgnoreCase);

            var types = await db.EquipmentTypes.Select(t => new { t.Name, t.Id }).ToListAsync(ct);
            var departments = await db.Departments.Select(d => new { d.Name, d.Id }).ToListAsync(ct);
            var labs = await db.ResearchGroups.Select(g => new { g.Name, g.Id }).ToListAsync(ct);
            var rooms = await db.Rooms
                .Select(r => new RoomRef(r.Id, r.Building, r.Floor, r.RoomNumber, r.DepartmentId))
                .ToListAsync(ct);
            var existing = await db.Equipment.Select(e => new { e.RoomId, e.Name }).ToListAsync(ct);

            return new Lookups
            {
                Types = ByName(types.Select(t => (t.Name, t.Id))),
                Departments = ByName(departments.Select(d => (d.Name, d.Id))),
                Labs = ByName(labs.Select(l => (l.Name, l.Id))),
                Rooms = rooms,
                ExistingNames = existing.Select(e => (e.RoomId, e.Name.Trim().ToLowerInvariant())).ToHashSet(),
            };
        }
    }
}
