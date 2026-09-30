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

    public ActorType ActorType { get; set; }
    public int? ResearcherId { get; set; }
    public int? ExternalContactId { get; set; }
    public string ActorDisplayName { get; set; } = string.Empty;

    // Null for external actors, and for an internal Researcher with no linked
    // login — the frontend falls back to a generic avatar in both cases.
    public Role? ActorRole { get; set; }

    public string? Notes { get; set; }

    public int CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }

    public int? ApprovedByUserId { get; set; }
    public DateTime? ModifiedAt { get; set; }

    // Computed per acting user: true when they may approve/reject this booking
    // right now (it's Requested and they're a Super Admin, or a Science Officer
    // for its equipment/facility).
    public bool CanApprove { get; set; }
}

public class CreateBookingRequest
{
    public int EquipmentId { get; set; }
    public DateTime ScheduledStart { get; set; }
    public DateTime ScheduledEnd { get; set; }

    // At most one of these may be set. Neither set -> book for self (requires
    // the acting user to have their own Researcher profile). ResearcherId set ->
    // book on behalf of an internal person without a login (Super Admin/Science
    // Officer only, in practice). ExternalContactId set -> book on behalf of a
    // visiting/external person (Super Admin, Science Officer, or Principal
    // Investigator only) — always lands as Requested, pending approval, unlike
    // every internal path above which is auto-approved.
    public int? ResearcherId { get; set; }
    public int? ExternalContactId { get; set; }

    // Free text, e.g. an undergrad's course name when a Science Officer books
    // equipment on their behalf for a practical/project.
    public string? Notes { get; set; }
}

public class BookingFilter
{
    public int? EquipmentId { get; set; }
    public BookingStatus? Status { get; set; }
}
