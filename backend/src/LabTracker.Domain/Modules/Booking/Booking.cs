using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.Domain.Modules.Booking;

public class Booking
{
    public int Id { get; set; }
    public DateTime ScheduledStart { get; set; }
    public DateTime ScheduledEnd { get; set; }
    public BookingStatus Status { get; set; } = BookingStatus.Requested;

    public int EquipmentId { get; set; }
    public EquipmentEntity Equipment { get; set; } = null!;

    public int ActorId { get; set; }
    public UsageActor Actor { get; set; } = null!;

    public int? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }

    public int CreatedByUserId { get; set; }
    public User CreatedByUser { get; set; } = null!;
    public DateTime CreatedAt { get; set; }

    public int? ModifiedByUserId { get; set; }
    public User? ModifiedByUser { get; set; }
    public DateTime? ModifiedAt { get; set; }
}
