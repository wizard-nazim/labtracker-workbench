using LabTracker.Domain.Modules.Identity;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Shared.Enums;

namespace LabTracker.Domain.Modules.Equipment;

public class Equipment
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? Description { get; set; }
    public bool IsShared { get; set; }
    public EquipmentStatus Status { get; set; } = EquipmentStatus.Available;

    // Uploaded photo, set via a dedicated image-upload endpoint (not the plain
    // create/update request). IconKey is a fallback chosen from a fixed curated
    // set (see EquipmentIconCatalog) — used for display only when no image is set.
    public string? ImageUrl { get; set; }
    public string? IconKey { get; set; }

    public int EquipmentTypeId { get; set; }
    public EquipmentType EquipmentType { get; set; } = null!;

    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;

    // Always set, even for shared equipment — ownership (who is administratively
    // responsible / funds it) is separate from IsShared (who else may use it).
    public int OwningDepartmentId { get; set; }
    public Department OwningDepartment { get; set; } = null!;

    // Department-owned by default; Individual names one person in OwnerUserId
    // (only set when OwnershipType is Individual).
    public OwnershipType OwnershipType { get; set; } = OwnershipType.Department;
    public int? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }

    // The lab this equipment belongs to, if any. Prefilled from the room's lab
    // in the UI but stored separately, since equipment can sit in a shared room
    // while belonging to one lab (and usage reports attribute by this first).
    public int? ResearchGroupId { get; set; }
    public ResearchGroup? ResearchGroup { get; set; }

    // UTC, set by EquipmentService (same pattern as Booking.CreatedAt).
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<EquipmentScienceOfficer> ScienceOfficers { get; set; } = new List<EquipmentScienceOfficer>();
}
