using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;

namespace LabTracker.Domain.Modules.Notifications;

// In-app only (no email service yet). One row per recipient, so read state is
// per user; EquipmentId/BookingId let the frontend link to what changed.
public class Notification
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;

    public int? EquipmentId { get; set; }
    public int? BookingId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}
