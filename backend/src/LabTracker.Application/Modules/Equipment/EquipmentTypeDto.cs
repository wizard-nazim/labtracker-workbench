namespace LabTracker.Application.Modules.Equipment;

public class EquipmentTypeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class UpsertEquipmentTypeRequest
{
    public string Name { get; set; } = string.Empty;
}
