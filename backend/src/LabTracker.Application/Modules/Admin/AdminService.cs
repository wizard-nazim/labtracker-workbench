using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Admin;

public class AdminService(IApplicationDbContext db, IPasswordHasher<User> passwordHasher)
{
    private const string DefaultPassword = "ChangeMe123!";

    // Mirrors DbSeeder.DevelopmentUsers — duplicated rather than shared, since
    // LabTracker.Application cannot reference LabTracker.Infrastructure (where
    // DbSeeder lives) without inverting the clean-architecture dependency direction.
    private static readonly (string Email, Role Role)[] DefaultUsers =
    [
        ("admin@labtracker.local", Role.SuperAdmin),
        ("so@labtracker.local", Role.ScienceOfficer),
        ("researcher@labtracker.local", Role.Researcher),
    ];

    // Wipes every piece of demo/client data and recreates just the 3 default
    // logins — a clean slate for entering a real client's data through the
    // Admin screens. A single SaveChangesAsync across all the RemoveRange
    // calls lets EF Core's change tracker work out the FK-safe delete order
    // itself, so no manual ordering or raw SQL is needed. The 3 default users
    // are recreated in a *second* SaveChangesAsync — not folded into the same
    // call as the deletes — since EF doesn't model the Email unique
    // constraint and can't be relied on to delete the old "admin@..." row
    // before inserting the new one with the same email in one batch.
    public async Task ResetDemoDataAsync(CancellationToken cancellationToken = default)
    {
        db.UsageRecords.RemoveRange(db.UsageRecords);
        db.Bookings.RemoveRange(db.Bookings);
        db.EquipmentScienceOfficers.RemoveRange(db.EquipmentScienceOfficers);
        db.UsageActors.RemoveRange(db.UsageActors);
        db.Equipment.RemoveRange(db.Equipment);
        db.Rooms.RemoveRange(db.Rooms);
        db.EquipmentTypes.RemoveRange(db.EquipmentTypes);
        db.Researchers.RemoveRange(db.Researchers);
        db.ResearchGroups.RemoveRange(db.ResearchGroups);
        db.PrincipalInvestigators.RemoveRange(db.PrincipalInvestigators);
        db.CompanyContacts.RemoveRange(db.CompanyContacts);
        db.Companies.RemoveRange(db.Companies);
        db.Departments.RemoveRange(db.Departments);
        db.Users.RemoveRange(db.Users);
        await db.SaveChangesAsync(cancellationToken);

        foreach (var (email, role) in DefaultUsers)
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

        await db.SaveChangesAsync(cancellationToken);
    }
}
