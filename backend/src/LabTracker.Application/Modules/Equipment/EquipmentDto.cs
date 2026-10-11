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

    // Derived through the room (see Room.FacilityId) — null when the room isn't
    // part of a named facility.
    public string? FacilityName { get; set; }

    public int OwningDepartmentId { get; set; }
    public string OwningDepartmentName { get; set; } = string.Empty;

    public OwnershipType OwnershipType { get; set; }

    // Set only when OwnershipType is Individual. Name is the person's PI or
    // researcher profile name when they have one, otherwise their login email.
    public EntityReferenceDto? Owner { get; set; }

    // The equipment's own lab (not the room's) — null when not tied to one.
    public EntityReferenceDto? ResearchGroup { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public List<ScienceOfficerAssignmentDto> ScienceOfficers { get; set; } = [];
}

public class EntityReferenceDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class ScienceOfficerAssignmentDto
{
    public int UserId { get; set; }
    public string Email { get; set; } = string.Empty;
    // From the linked PI or researcher profile; null when there isn't one.
    public string? Name { get; set; }
    public bool IsPrimary { get; set; }
}

public class UpsertEquipmentRequest
{
    public string Name { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string? Description { get; set; }
    public bool IsShared { get; set; }
    public string? ImageUrl { get; set; }
    public string? IconKey { get; set; }
    public int EquipmentTypeId { get; set; }
    public int RoomId { get; set; }
    public int OwningDepartmentId { get; set; }

    // Omitted by older clients. On create that means Department-owned with no
    // lab; on update it leaves ownership, owner and lab exactly as they are, so
    // a client that doesn't know these fields can't wipe them.
    public OwnershipType? OwnershipType { get; set; }
    public int? OwnerUserId { get; set; }
    public int? ResearchGroupId { get; set; }
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
