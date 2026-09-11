namespace LabTracker.Application.Modules.Equipment;

public class RoomDto
{
    public int Id { get; set; }
    public string Building { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
}

public class UpsertRoomRequest
{
    public string Building { get; set; } = string.Empty;
    public string Floor { get; set; } = string.Empty;
    public string RoomNumber { get; set; } = string.Empty;
    public int? DepartmentId { get; set; }
}
