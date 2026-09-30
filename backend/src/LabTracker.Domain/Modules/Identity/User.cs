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
}
