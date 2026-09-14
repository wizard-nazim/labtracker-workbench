using LabTracker.Domain.Modules.External;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Shared.Enums;

namespace LabTracker.Domain.Modules.Booking;

// The one place internal-vs-external usage duality lives: Bookings and UsageRecords
// reference only UsageActor, never Researcher/ExternalContact directly.
public class UsageActor
{
    public int Id { get; set; }
    public ActorType ActorType { get; set; }
    public string DisplayNameSnapshot { get; set; } = string.Empty;

    public int? ResearcherId { get; set; }
    public Researcher? Researcher { get; set; }

    public int? ExternalContactId { get; set; }
    public ExternalContact? ExternalContact { get; set; }
}
