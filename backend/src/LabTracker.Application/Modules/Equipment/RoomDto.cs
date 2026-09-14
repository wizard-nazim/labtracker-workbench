namespace LabTracker.Application.Modules.Equipment;

public class RoomDto
{
    public int Id { get; set; }
    public string Building { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }

    // Null when not attributed to a specific lab — a lab's rooms can span
    // multiple floors/buildings, so this is independent of Building/Floor.
    public int? ResearchGroupId { get; set; }
    public string? ResearchGroupName { get; set; }
}

public class UpsertRoomRequest
{
    public string Building { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
    public int? ResearchGroupId { get; set; }
}
