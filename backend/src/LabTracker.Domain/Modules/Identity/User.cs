using LabTracker.Shared.Enums;

namespace LabTracker.Domain.Modules.Identity;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public Role Role { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public bool HasCompletedOnboarding { get; set; }
    public bool HasCompletedAdminTour { get; set; }

    // Contact number staff can use to reach this person (optional).
    public string? Phone { get; set; }

    // Opt-out for broadcast "equipment changed" notifications (a note edit or
    // an out-of-service status). Notifications about the user's own bookings
    // are always sent.
    public bool NotifyOnEquipmentChanges { get; set; } = true;

    // Set whenever an admin chooses the password (new account or reset), so
    // the person picks their own at next sign-in and the admin never knows
    // the one that stays in use.
    public bool MustChangePassword { get; set; }

    public DateTime? PasswordChangedAt { get; set; }

    // Bumped when the password changes or the account is deactivated; tokens
    // carry it so older ones can be rejected.
    public int SecurityVersion { get; set; }
}
