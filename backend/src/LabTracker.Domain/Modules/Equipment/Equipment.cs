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

    public ICollection<EquipmentScienceOfficer> ScienceOfficers { get; set; } = new List<EquipmentScienceOfficer>();
}
