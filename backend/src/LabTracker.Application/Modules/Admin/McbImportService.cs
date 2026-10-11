using System.Security.Cryptography;
using System.Text.Json;
using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Equipment;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Shared.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.Application.Modules.Admin;

public record McbImportResult(
    int EquipmentCreated,
    int EquipmentSkipped,
    int TypesCreated,
    int RoomsCreated,
    int FacilitiesCreated,
    int ScienceOfficersCreated);

// One-off import of the MCB department's equipment list (SeedData/mcb-equipment.json,
// generated from the client's spreadsheet). Get-or-create throughout, so running it
// again only fills in what is missing. Imported science officers have no real email
// in the source, so they get a placeholder address, IsActive = false and a random
// password nobody knows — an admin fixes the email and activates them in Users.
public class McbImportService(IApplicationDbContext db, IPasswordHasher<User> passwordHasher)
{
    private const string ResourceName = "LabTracker.Application.Modules.Admin.SeedData.mcb-equipment.json";
    private const string PlaceholderEmailDomain = "mcb.placeholder.invalid";

    public async Task<McbImportResult> ImportAsync(CancellationToken cancellationToken = default)
    {
        var data = LoadData();
        var now = DateTime.UtcNow;

        var department = await db.Departments.FirstOrDefaultAsync(d => d.Code == data.Department.Code, cancellationToken);
        if (department is null)
        {
            department = new Department { Code = data.Department.Code, Name = data.Department.Name };
            db.Departments.Add(department);
            await db.SaveChangesAsync(cancellationToken);
        }

        var (officers, officersCreated) = await ImportScienceOfficersAsync(data.ScienceOfficers, now, cancellationToken);
        var (types, typesCreated) = await ImportTypesAsync(data.Equipment, cancellationToken);
        var (rooms, roomsCreated) = await ImportRoomsAsync(data, department.Id, cancellationToken);
        var facilitiesCreated = await ImportFacilitiesAsync(data, department.Id, officers, rooms, cancellationToken);

        var created = 0;
        var skipped = 0;
        foreach (var item in data.Equipment)
        {
            var room = rooms[RoomKey(item.Floor, item.Room)];
            var exists = await db.Equipment.AnyAsync(
                e => e.Name == item.Name && e.RoomId == room.Id && e.SerialNumber == item.SerialNumber,
                cancellationToken);
            if (exists)
            {
                skipped++;
                continue;
            }

            var equipment = new EquipmentEntity
            {
                Name = item.Name,
                SerialNumber = item.SerialNumber,
                Status = Enum.Parse<EquipmentStatus>(item.Status),
                EquipmentTypeId = types[item.Type.ToLowerInvariant()].Id,
                RoomId = room.Id,
                OwningDepartmentId = department.Id,
                CreatedAt = now,
                UpdatedAt = now,
            };
            if (item.ScienceOfficerKey is not null && officers.TryGetValue(item.ScienceOfficerKey, out var officer))
                equipment.ScienceOfficers.Add(new EquipmentScienceOfficer { UserId = officer.Id, IsPrimary = true });

            db.Equipment.Add(equipment);
            created++;
        }
        await db.SaveChangesAsync(cancellationToken);

        return new McbImportResult(created, skipped, typesCreated, roomsCreated, facilitiesCreated, officersCreated);
    }

    private async Task<(Dictionary<string, User>, int)> ImportScienceOfficersAsync(
        IReadOnlyList<McbScienceOfficer> source, DateTime now, CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, User>();
        var created = 0;
        foreach (var so in source)
        {
            var email = $"{so.Key}@{PlaceholderEmailDomain}";
            var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
            if (user is null)
            {
                user = new User { Email = email, Role = Role.ScienceOfficer, IsActive = false, CreatedAt = now };
                user.PasswordHash = passwordHasher.HashPassword(user, Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)));
                db.Users.Add(user);
                await db.SaveChangesAsync(cancellationToken);

                // The name lives on a linked Researcher profile — User has no name field
                // (same approach as the default SO login in AdminService).
                db.Researchers.Add(new Researcher { FullName = so.FullName, StudentNumber = $"MCB-SO-{so.Key}", UserId = user.Id });
                created++;
            }
            result[so.Key] = user;
        }
        await db.SaveChangesAsync(cancellationToken);
        return (result, created);
    }

    private async Task<(Dictionary<string, EquipmentType>, int)> ImportTypesAsync(
        IReadOnlyList<McbEquipmentItem> items, CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, EquipmentType>();
        var created = 0;
        foreach (var name in items.Select(i => i.Type).Distinct(StringComparer.OrdinalIgnoreCase))
        {
            var lower = name.ToLowerInvariant();
            var type = await db.EquipmentTypes.FirstOrDefaultAsync(t => t.Name.ToLower() == lower, cancellationToken);
            if (type is null)
            {
                type = new EquipmentType { Name = name };
                db.EquipmentTypes.Add(type);
                created++;
            }
            result[lower] = type;
        }
        await db.SaveChangesAsync(cancellationToken);
        return (result, created);
    }

    private async Task<(Dictionary<string, Room>, int)> ImportRoomsAsync(
        McbData data, int departmentId, CancellationToken cancellationToken)
    {
        var result = new Dictionary<string, Room>();
        var created = 0;
        var building = data.Building.ToLowerInvariant();
        foreach (var item in data.Equipment.DistinctBy(i => RoomKey(i.Floor, i.Room)))
        {
            var floor = item.Floor.ToLowerInvariant();
            var number = item.Room.ToLowerInvariant();
            var room = await db.Rooms.FirstOrDefaultAsync(
                r => r.Building.ToLower() == building && r.Floor.ToLower() == floor && r.RoomNumber.ToLower() == number,
                cancellationToken);
            if (room is null)
            {
                room = new Room { Building = data.Building, Floor = item.Floor, RoomNumber = item.Room, DepartmentId = departmentId };
                db.Rooms.Add(room);
                created++;
            }
            result[RoomKey(item.Floor, item.Room)] = room;
        }
        await db.SaveChangesAsync(cancellationToken);
        return (result, created);
    }

    private async Task<int> ImportFacilitiesAsync(
        McbData data, int departmentId, Dictionary<string, User> officers,
        Dictionary<string, Room> rooms, CancellationToken cancellationToken)
    {
        var created = 0;
        foreach (var source in data.Facilities)
        {
            var facility = await db.Facilities
                .Include(f => f.Overseers)
                .FirstOrDefaultAsync(f => f.Name == source.Name && f.DepartmentId == departmentId, cancellationToken);
            if (facility is null)
            {
                facility = new Facility { Name = source.Name, DepartmentId = departmentId };
                if (source.OverseerKey is not null && officers.TryGetValue(source.OverseerKey, out var overseer))
                    facility.Overseers.Add(overseer);
                db.Facilities.Add(facility);
                created++;
            }

            // Only link rooms that aren't already in another facility — an admin's
            // later reassignment wins over the import.
            foreach (var roomNumber in source.Rooms)
            {
                var room = rooms.Values.FirstOrDefault(r => r.RoomNumber.Equals(roomNumber, StringComparison.OrdinalIgnoreCase));
                if (room is not null && room.FacilityId is null) room.Facility = facility;
            }
        }
        await db.SaveChangesAsync(cancellationToken);
        return created;
    }

    private static string RoomKey(string floor, string room) => $"{floor.ToLowerInvariant()}|{room.ToLowerInvariant()}";

    private static McbData LoadData()
    {
        using var stream = typeof(McbImportService).Assembly.GetManifestResourceStream(ResourceName)
            ?? throw new InvalidOperationException($"Embedded resource {ResourceName} not found.");
        return JsonSerializer.Deserialize<McbData>(stream, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("MCB import data is empty.");
    }

    private record McbData(
        McbDepartment Department,
        string Building,
        IReadOnlyList<McbScienceOfficer> ScienceOfficers,
        IReadOnlyList<McbFacility> Facilities,
        IReadOnlyList<McbEquipmentItem> Equipment);

    private record McbDepartment(string Code, string Name);

    private record McbScienceOfficer(string Key, string FullName);

    private record McbFacility(string Name, string? OverseerKey, IReadOnlyList<string> Rooms);

    private record McbEquipmentItem(
        string Name,
        string? SerialNumber,
        string Type,
        string Floor,
        string Room,
        string Status,
        string? ScienceOfficerKey,
        string? Facility);
}
