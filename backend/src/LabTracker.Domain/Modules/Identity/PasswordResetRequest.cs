using LabTracker.Shared.Enums;

namespace LabTracker.Domain.Modules.Identity;

// "Forgot password" from the sign-in page. There's no email service, so a
// Super Admin resolves it by assigning a temporary password in Admin › Requests.
public class PasswordResetRequest
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime CreatedAt { get; set; }
    public PasswordResetStatus Status { get; set; }

    public int? ResolvedByUserId { get; set; }
    public User? ResolvedByUser { get; set; }
    public DateTime? ResolvedAt { get; set; }
}
