namespace LabTracker.Domain.Modules.Organization;

public class PrincipalInvestigator
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
}
