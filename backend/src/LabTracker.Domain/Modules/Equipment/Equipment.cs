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

    public int EquipmentTypeId { get; set; }
    public EquipmentType EquipmentType { get; set; } = null!;

    public int RoomId { get; set; }
    public Room Room { get; set; } = null!;

    // Null for equipment owned jointly/shared rather than by one department.
    public int? OwningDepartmentId { get; set; }
    public Department? OwningDepartment { get; set; }

    public ICollection<EquipmentScienceOfficer> ScienceOfficers { get; set; } = new List<EquipmentScienceOfficer>();
}
