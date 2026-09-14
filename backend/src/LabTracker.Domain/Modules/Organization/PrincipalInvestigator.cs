using LabTracker.Domain.Modules.Identity;

namespace LabTracker.Domain.Modules.Organization;

public class PrincipalInvestigator
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    // A login account for this PI (Role.PrincipalInvestigator), same optional-link
    // pattern as Researcher.UserId. Set when the admin provisions a password for them.
    public int? UserId { get; set; }
    public User? User { get; set; }

    // Grants this PI elevated rights scoped to their own lab: managing equipment
    // and posting maintenance/availability notices. Plain researchers never get this.
    public bool HasEquipmentPermissions { get; set; }
}
