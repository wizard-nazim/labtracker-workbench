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
}
