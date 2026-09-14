using LabTracker.Shared.Enums;

namespace LabTracker.Application.Modules.Booking;

public class BookingDto
{
    public int Id { get; set; }
    public DateTime ScheduledStart { get; set; }
    public DateTime ScheduledEnd { get; set; }
    public BookingStatus Status { get; set; }

    public int EquipmentId { get; set; }
    public string EquipmentName { get; set; } = string.Empty;
    public string RoomLabel { get; set; } = string.Empty;

    public int? ResearcherId { get; set; }
    public string ActorDisplayName { get; set; } = string.Empty;

    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public int? ApprovedByUserId { get; set; }
    public DateTime? ModifiedAt { get; set; }
}

public class CreateBookingRequest
{
    public int EquipmentId { get; set; }
    public DateTime ScheduledStart { get; set; }
    public DateTime ScheduledEnd { get; set; }

    // Required when a Super Admin or Science Officer books on someone else's
    // behalf; ignored for a Researcher, who can only ever book for themselves.
    public int? ResearcherId { get; set; }
}

public class BookingFilter
{
    public int? EquipmentId { get; set; }
    public BookingStatus? Status { get; set; }
}
