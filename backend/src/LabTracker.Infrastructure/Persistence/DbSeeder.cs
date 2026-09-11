using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

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
}
