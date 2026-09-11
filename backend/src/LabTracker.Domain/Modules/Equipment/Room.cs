using LabTracker.Domain.Modules.Organization;

namespace LabTracker.Domain.Modules.Equipment;

public class Room
{
    public int Id { get; set; }
    public string Building { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;

    // Null for rooms shared across departments rather than owned by one.
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
}
