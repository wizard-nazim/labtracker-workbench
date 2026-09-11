using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Infrastructure.Persistence;

// Dev-only bootstrap: creates one Super Admin so there's a way to log in before
// real user management (Phase 4) exists. Not a substitute for it.
public static class DbSeeder
{
    private const string DefaultAdminEmail = "admin@labtracker.local";
    private const string DefaultAdminPassword = "ChangeMe123!";

    public static async Task SeedDevelopmentAdminAsync(LabTrackerDbContext db, IPasswordHasher<User> passwordHasher)
    {
        if (await db.Users.AnyAsync())
        {
            return;
        }

        var admin = new User
        {
            Email = DefaultAdminEmail,
            Role = Role.SuperAdmin,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, DefaultAdminPassword);

        db.Users.Add(admin);
        await db.SaveChangesAsync();
    }
}
