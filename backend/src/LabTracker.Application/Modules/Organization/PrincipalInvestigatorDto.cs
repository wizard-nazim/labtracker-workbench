namespace LabTracker.Application.Modules.Organization;

public class PrincipalInvestigatorDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public int? UserId { get; set; }
    public bool HasLogin { get; set; }
    public bool HasEquipmentPermissions { get; set; }
}

public class UpsertPrincipalInvestigatorRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public bool HasEquipmentPermissions { get; set; }

    // Write-only. When set on create, also provisions a login (Role.PrincipalInvestigator)
    // using the Email above. Ignored on update — no way to add/change a password here yet.
    public string? Password { get; set; }
}
