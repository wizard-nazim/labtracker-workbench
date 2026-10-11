using LabTracker.Domain.Modules.Equipment;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;

namespace LabTracker.IntegrationTests.TestSupport;

public static class SeedHelpers
{
    public static async Task<Department> AddDepartmentAsync(this LabTrackerDbContext db, string name = "Chemistry", string code = "CHEM")
    {
        var department = new Department { Name = name, Code = code };
        db.Departments.Add(department);
        await db.SaveChangesAsync();
        return department;
    }

    public static async Task<PrincipalInvestigator> AddPrincipalInvestigatorAsync(this LabTrackerDbContext db, Department department, string fullName = "Dr. Amara Okafor", int? userId = null)
    {
        var pi = new PrincipalInvestigator
        {
            FullName = fullName,
            Email = $"{fullName.Replace(" ", ".").ToLowerInvariant()}@labtracker.local",
            DepartmentId = department.Id,
            UserId = userId,
        };
        db.PrincipalInvestigators.Add(pi);
        await db.SaveChangesAsync();
        return pi;
    }

    public static async Task<ResearchGroup> AddResearchGroupAsync(this LabTrackerDbContext db, Department department, PrincipalInvestigator pi, string name = "Okafor Lab")
    {
        var group = new ResearchGroup { Name = name, DepartmentId = department.Id, PrincipalInvestigatorId = pi.Id };
        db.ResearchGroups.Add(group);
        await db.SaveChangesAsync();
        return group;
    }

    public static async Task<Researcher> AddResearcherAsync(this LabTrackerDbContext db, ResearchGroup group, string fullName = "Nadia Petrov", string studentNumber = "STU1001", int? userId = null)
    {
        var researcher = new Researcher { FullName = fullName, StudentNumber = studentNumber, UserId = userId, ResearchGroups = [group] };
        db.Researchers.Add(researcher);
        await db.SaveChangesAsync();
        return researcher;
    }

    public static async Task<Room> AddRoomAsync(this LabTrackerDbContext db, Department? department = null, string building = "Science Building", string floor = "1", string roomNumber = "101")
    {
        var room = new Room { Building = building, Floor = floor, RoomNumber = roomNumber, DepartmentId = department?.Id };
        db.Rooms.Add(room);
        await db.SaveChangesAsync();
        return room;
    }

    public static async Task<EquipmentType> AddEquipmentTypeAsync(this LabTrackerDbContext db, string name = "Centrifuge")
    {
        var type = new EquipmentType { Name = name };
        db.EquipmentTypes.Add(type);
        await db.SaveChangesAsync();
        return type;
    }

    public static async Task<Equipment> AddEquipmentAsync(
        this LabTrackerDbContext db,
        Room room,
        EquipmentType type,
        Department owningDepartment,
        string name = "Centrifuge X200",
        EquipmentStatus status = EquipmentStatus.Available)
    {
        var equipment = new Equipment
        {
            Name = name,
            IsShared = true,
            Status = status,
            EquipmentTypeId = type.Id,
            RoomId = room.Id,
            OwningDepartmentId = owningDepartment.Id,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
        db.Equipment.Add(equipment);
        await db.SaveChangesAsync();
        return equipment;
    }
}
