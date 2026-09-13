using LabTracker.Shared.Enums;

namespace LabTracker.Application.Modules.Equipment;

public class EquipmentDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? Description { get; set; }
    public bool IsShared { get; set; }
    public EquipmentStatus Status { get; set; }

    public string? ImageUrl { get; set; }
    public string? IconKey { get; set; }

    public int EquipmentTypeId { get; set; }
    public string EquipmentTypeName { get; set; } = string.Empty;

    public int RoomId { get; set; }
    public string RoomLabel { get; set; } = string.Empty;

    public int OwningDepartmentId { get; set; }
    public string OwningDepartmentName { get; set; } = string.Empty;

    public List<ScienceOfficerAssignmentDto> ScienceOfficers { get; set; } = [];
}

public class ScienceOfficerAssignmentDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
}

public class UpsertEquipmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? Description { get; set; }
    public bool IsShared { get; set; }
    public string? IconKey { get; set; }
    public int EquipmentTypeId { get; set; }
    public int RoomId { get; set; }
    public int OwningDepartmentId { get; set; }
}

public class UpdateEquipmentStatusRequest
{
    public EquipmentStatus Status { get; set; }
}

public class AssignScienceOfficerRequest
{
    public int UserId { get; set; }
    public bool IsPrimary { get; set; }
}
