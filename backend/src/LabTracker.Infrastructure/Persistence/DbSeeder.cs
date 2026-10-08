using LabTracker.Domain.Modules.Booking;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;
using EquipmentTypeEntity = LabTracker.Domain.Modules.Equipment.EquipmentType;
using RoomEntity = LabTracker.Domain.Modules.Equipment.Room;

namespace LabTracker.Infrastructure.Persistence;

// Dev-only bootstrap: creates one user per role so there's a way to log in and
// exercise role-based permissions before real user management (Phase 4) exists.
// Not a substitute for it.
public static class DbSeeder
{
    private const string DefaultPassword = "ChangeMe123!";

    private static readonly (string Email, Role Role)[] DevelopmentUsers =
    [
        ("admin@labtracker.local", Role.SuperAdmin),
        ("so@labtracker.local", Role.ScienceOfficer),
        ("researcher@labtracker.local", Role.Researcher),
    ];

    public static async Task SeedDevelopmentUsersAsync(LabTrackerDbContext db, IPasswordHasher<User> passwordHasher)
    {
        if (await db.Users.AnyAsync())
        {
            return;
        }

        foreach (var (email, role) in DevelopmentUsers)
        {
            var user = new User
            {
                Email = email,
                Role = role,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            user.PasswordHash = passwordHasher.HashPassword(user, DefaultPassword);
            db.Users.Add(user);
        }

        await db.SaveChangesAsync();
    }

    // Production bootstrap: the one way to get the first login on an empty
    // database (dev seeding and demo reset are both off outside Development).
    // Does nothing once any user exists, so the credentials can be removed from
    // config after first start — and should be, then the password changed.
    public static async Task<bool> SeedInitialAdminAsync(LabTrackerDbContext db, IPasswordHasher<User> passwordHasher, string email, string password)
    {
        if (await db.Users.AnyAsync())
        {
            return false;
        }

        var admin = new User
        {
            Email = EmailAddress.Normalize(email),
            Role = Role.SuperAdmin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, password);
        db.Users.Add(admin);
        await db.SaveChangesAsync();
        return true;
    }

    private const string SampleResearchGroupMarker = "Okafor Lab";

    // Dev-only sample data so the Reports page (and other list views) aren't
    // empty on a fresh DB. Guarded on this seed's own marker row rather than
    // "any row in these tables", since a dev DB may already have real
    // equipment/research-group data unrelated to this sample set — checking
    // for the marker keeps this idempotent without colliding with that.
    public static async Task SeedDevelopmentSampleDataAsync(LabTrackerDbContext db)
    {
        if (await db.ResearchGroups.AnyAsync(g => g.Name == SampleResearchGroupMarker))
        {
            return;
        }

        var superAdminId = await db.Users
            .Where(u => u.Role == Role.SuperAdmin)
            .Select(u => u.Id)
            .FirstOrDefaultAsync();
        if (superAdminId == 0)
        {
            return;
        }

        // Department.Code and EquipmentType.Name are both uniquely indexed, and a
        // dev DB may already have real rows with these exact values (e.g. an
        // existing "Centrifuge" type) — get-or-create instead of blindly
        // inserting so this seed can't collide with pre-existing data.
        async Task<Department> GetOrCreateDepartmentAsync(string name, string code)
        {
            var existing = await db.Departments.SingleOrDefaultAsync(d => d.Code == code);
            if (existing is not null) return existing;

            var department = new Department { Name = name, Code = code };
            db.Departments.Add(department);
            await db.SaveChangesAsync();
            return department;
        }

        async Task<EquipmentTypeEntity> GetOrCreateEquipmentTypeAsync(string name)
        {
            var existing = await db.EquipmentTypes.SingleOrDefaultAsync(t => t.Name == name);
            if (existing is not null) return existing;

            var type = new EquipmentTypeEntity { Name = name };
            db.EquipmentTypes.Add(type);
            await db.SaveChangesAsync();
            return type;
        }

        var chemistry = await GetOrCreateDepartmentAsync("Chemistry", "CHEM");
        var biology = await GetOrCreateDepartmentAsync("Biology", "BIO");

        var centrifugeType = await GetOrCreateEquipmentTypeAsync("Centrifuge");
        var microscopeType = await GetOrCreateEquipmentTypeAsync("Microscope");

        var chemLabRoom = new RoomEntity { Building = "Science Building", Floor = "1", RoomNumber = "101", DepartmentId = chemistry.Id };
        var bioLabRoom = new RoomEntity { Building = "Science Building", Floor = "2", RoomNumber = "205", DepartmentId = biology.Id };
        db.Rooms.AddRange(chemLabRoom, bioLabRoom);
        await db.SaveChangesAsync();

        var centrifuge = new EquipmentEntity
        {
            Name = "Centrifuge X200",
            IsShared = true,
            Status = EquipmentStatus.Available,
            IconKey = "flask-conical",
            EquipmentTypeId = centrifugeType.Id,
            RoomId = chemLabRoom.Id,
            OwningDepartmentId = chemistry.Id,
        };
        var microscope = new EquipmentEntity
        {
            Name = "Microscope M50",
            IsShared = true,
            Status = EquipmentStatus.Available,
            IconKey = "microscope",
            EquipmentTypeId = microscopeType.Id,
            RoomId = bioLabRoom.Id,
            OwningDepartmentId = biology.Id,
        };
        db.Equipment.AddRange(centrifuge, microscope);
        await db.SaveChangesAsync();

        var okaforPi = new PrincipalInvestigator { FullName = "Dr. Amara Okafor", Email = "a.okafor@labtracker.local", DepartmentId = chemistry.Id };
        var chenPi = new PrincipalInvestigator { FullName = "Dr. Liang Chen", Email = "l.chen@labtracker.local", DepartmentId = biology.Id };
        db.PrincipalInvestigators.AddRange(okaforPi, chenPi);
        await db.SaveChangesAsync();

        var okaforLab = new ResearchGroup { Name = "Okafor Lab", DepartmentId = chemistry.Id, PrincipalInvestigatorId = okaforPi.Id };
        var chenLab = new ResearchGroup { Name = "Chen Lab", DepartmentId = biology.Id, PrincipalInvestigatorId = chenPi.Id };
        db.ResearchGroups.AddRange(okaforLab, chenLab);
        await db.SaveChangesAsync();

        // Ties each seeded room to the lab that uses it, so usage reports (which
        // attribute by the booked equipment's room, not the researcher's own lab
        // memberships) show per-lab totals instead of everything landing in
        // "Unassigned".
        chemLabRoom.ResearchGroupId = okaforLab.Id;
        bioLabRoom.ResearchGroupId = chenLab.Id;
        await db.SaveChangesAsync();

        var nadia = new Researcher { FullName = "Nadia Petrov", StudentNumber = "STU1001", ResearchGroups = [okaforLab] };
        var sam = new Researcher { FullName = "Sam Reyes", StudentNumber = "STU1002", ResearchGroups = [okaforLab] };
        var priya = new Researcher { FullName = "Priya Nair", StudentNumber = "STU1003", ResearchGroups = [chenLab] };
        var tom = new Researcher { FullName = "Tom Becker", StudentNumber = "STU1004", ResearchGroups = [chenLab] };
        db.Researchers.AddRange(nadia, sam, priya, tom);
        await db.SaveChangesAsync();

        // Link the non-admin dev logins to their own Researcher profile so they
        // can book equipment for themselves out of the box, instead of hitting
        // "ResearcherId is required when booking on behalf of someone else."
        var researcherUserId = await db.Users.Where(u => u.Email == "researcher@labtracker.local").Select(u => u.Id).SingleOrDefaultAsync();
        var scienceOfficerUserId = await db.Users.Where(u => u.Email == "so@labtracker.local").Select(u => u.Id).SingleOrDefaultAsync();
        if (researcherUserId != 0)
        {
            db.Researchers.Add(new Researcher { FullName = "Demo Researcher", StudentNumber = "STU1000", UserId = researcherUserId, ResearchGroups = [okaforLab] });
        }
        if (scienceOfficerUserId != 0)
        {
            db.Researchers.Add(new Researcher { FullName = "Demo Science Officer", StudentNumber = "STU1005", UserId = scienceOfficerUserId, ResearchGroups = [okaforLab] });
        }
        await db.SaveChangesAsync();

        var actorsByResearcher = new Dictionary<Researcher, UsageActor>();
        foreach (var researcher in new[] { nadia, sam, priya, tom })
        {
            var actor = new UsageActor { ActorType = ActorType.Internal, ResearcherId = researcher.Id, DisplayNameSnapshot = researcher.FullName };
            db.UsageActors.Add(actor);
            actorsByResearcher[researcher] = actor;
        }
        await db.SaveChangesAsync();

        // Spread across the last ~10 weeks so filtering by different months on the
        // Reports page produces varied, non-flat results — Okafor Lab uses the
        // centrifuge frequently in short sessions, Chen Lab uses the microscope
        // less often but for longer sessions.
        var now = DateTime.UtcNow;
        var usageRecords = new List<UsageRecord>();

        void AddUsage(Researcher researcher, EquipmentEntity equipment, int daysAgo, int startHour, double hours)
        {
            var start = now.Date.AddDays(-daysAgo).AddHours(startHour);
            usageRecords.Add(new UsageRecord
            {
                EquipmentId = equipment.Id,
                ActorId = actorsByResearcher[researcher].Id,
                ActualStart = start,
                ActualEnd = start.AddHours(hours),
                CreatedAt = start,
                RecordedByUserId = superAdminId,
            });
        }

        AddUsage(nadia, centrifuge, 3, 9, 0.5);
        AddUsage(nadia, centrifuge, 10, 14, 1);
        AddUsage(nadia, centrifuge, 17, 9, 0.5);
        AddUsage(sam, centrifuge, 5, 11, 1.5);
        AddUsage(sam, centrifuge, 12, 10, 0.5);
        AddUsage(sam, centrifuge, 24, 13, 1);
        AddUsage(sam, microscope, 31, 9, 2);
        AddUsage(priya, microscope, 8, 9, 3);
        AddUsage(priya, microscope, 28, 13, 4);
        AddUsage(priya, centrifuge, 45, 10, 1);
        AddUsage(tom, microscope, 15, 15, 2.5);
        AddUsage(tom, microscope, 38, 9, 3.5);
        AddUsage(tom, centrifuge, 52, 11, 0.5);

        db.UsageRecords.AddRange(usageRecords);
        await db.SaveChangesAsync();
    }
}
