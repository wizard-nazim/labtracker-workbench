namespace LabTracker.Application.Modules.Organization;

public class PrincipalInvestigatorDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
}

public class UpsertPrincipalInvestigatorRequest
{
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
}
