using LabTracker.Domain.Modules.Identity;

namespace LabTracker.Domain.Modules.Equipment;

// Join entity: which Science Officers are assigned to which equipment.
// Composite key (EquipmentId, UserId) configured in EquipmentScienceOfficerConfiguration.
public class EquipmentScienceOfficer
{
    public int EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public bool IsPrimary { get; set; }
}
