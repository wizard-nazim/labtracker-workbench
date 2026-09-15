using LabTracker.Domain.Modules.Equipment;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.UnitTests.TestSupport;

// Small, shared "arrange" helpers for the org/equipment graph that most
// Application-layer service tests need a piece of.
public static class SeedHelpers
{
    public static Department AddDepartment(this LabTrackerDbContext db, string name = "Chemistry", string code = "CHEM")
    {
        var department = new Department { Name = name, Code = code };
        db.Departments.Add(department);
        db.SaveChanges();
        return department;
    }

    public static User AddUser(this LabTrackerDbContext db, string email, Role role, bool isActive = true)
    {
        var user = new User
        {
            Email = email,
            Role = role,
            IsActive = isActive,
            PasswordHash = "unused-in-these-tests",
            CreatedAt = DateTime.UtcNow,
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    public static PrincipalInvestigator AddPrincipalInvestigator(this LabTrackerDbContext db, Department department, string fullName = "Dr. Amara Okafor", int? userId = null)
    {
        var pi = new PrincipalInvestigator
        {
            FullName = fullName,
            Email = $"{fullName.Replace(" ", ".").ToLowerInvariant()}@labtracker.local",
            DepartmentId = department.Id,
            UserId = userId,
        };
        db.PrincipalInvestigators.Add(pi);
        db.SaveChanges();
        return pi;
    }

    public static ResearchGroup AddResearchGroup(this LabTrackerDbContext db, Department department, PrincipalInvestigator pi, string name = "Okafor Lab")
    {
        var group = new ResearchGroup { Name = name, DepartmentId = department.Id, PrincipalInvestigatorId = pi.Id };
        db.ResearchGroups.Add(group);
        db.SaveChanges();
        return group;
    }

    public static Researcher AddResearcher(this LabTrackerDbContext db, ResearchGroup group, string fullName = "Nadia Petrov", string studentNumber = "STU1001", int? userId = null)
    {
        var researcher = new Researcher
        {
            FullName = fullName,
            StudentNumber = studentNumber,
            UserId = userId,
            ResearchGroups = [group],
        };
        db.Researchers.Add(researcher);
        db.SaveChanges();
        return researcher;
    }

    public static Room AddRoom(this LabTrackerDbContext db, Department? department = null, string building = "Science Building", string floor = "1", string roomNumber = "101")
    {
        var room = new Room { Building = building, Floor = floor, RoomNumber = roomNumber, DepartmentId = department?.Id };
        db.Rooms.Add(room);
        db.SaveChanges();
        return room;
    }

    public static EquipmentType AddEquipmentType(this LabTrackerDbContext db, string name = "Centrifuge")
    {
        var type = new EquipmentType { Name = name };
        db.EquipmentTypes.Add(type);
        db.SaveChanges();
        return type;
    }

    public static EquipmentEntity AddEquipment(
        this LabTrackerDbContext db,
        Room room,
        EquipmentType type,
        Department owningDepartment,
        string name = "Centrifuge X200",
        EquipmentStatus status = EquipmentStatus.Available)
    {
        var equipment = new EquipmentEntity
        {
            Name = name,
            IsShared = true,
            Status = status,
            EquipmentTypeId = type.Id,
            RoomId = room.Id,
            OwningDepartmentId = owningDepartment.Id,
        };
        db.Equipment.Add(equipment);
        db.SaveChanges();
        return equipment;
    }
}
