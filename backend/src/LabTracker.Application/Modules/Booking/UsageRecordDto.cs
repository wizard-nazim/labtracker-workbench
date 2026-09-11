namespace LabTracker.Application.Modules.Booking;

public class UsageRecordDto
{
    public int Id { get; set; }
    public DateTime ActualStart { get; set; }
    public DateTime ActualEnd { get; set; }
    public string? Notes { get; set; }

    public int EquipmentId { get; set; }
    public string EquipmentName { get; set; } = string.Empty;

    public int? BookingId { get; set; }

    public int? ResearcherId { get; set; }
    public string ActorDisplayName { get; set; } = string.Empty;

    public int RecordedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateUsageRecordRequest
{
    public int EquipmentId { get; set; }
    public DateTime ActualStart { get; set; }
    public DateTime ActualEnd { get; set; }
    public string? Notes { get; set; }

    // When set, the actor and equipment are taken from the booking (and the
    // booking is marked Completed). When null, this is walk-in usage and
    // ResearcherId must be supplied directly.
    public int? BookingId { get; set; }
    public int? ResearcherId { get; set; }
}

public class UsageRecordFilter
{
    public int? EquipmentId { get; set; }
}
