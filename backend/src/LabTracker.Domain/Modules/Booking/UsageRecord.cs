using LabTracker.Domain.Modules.Identity;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.Domain.Modules.Booking;

public class UsageRecord
{
    public int Id { get; set; }
    public DateTime ActualStart { get; set; }
    public DateTime ActualEnd { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }

    public int EquipmentId { get; set; }
    public EquipmentEntity Equipment { get; set; } = null!;

    public int ActorId { get; set; }
    public UsageActor Actor { get; set; } = null!;

    // Null for walk-in usage recorded without a prior booking.
    public int? BookingId { get; set; }
    public Booking? Booking { get; set; }

    public int RecordedByUserId { get; set; }
    public User RecordedByUser { get; set; } = null!;
}
