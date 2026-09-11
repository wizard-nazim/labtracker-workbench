namespace LabTracker.Application.Modules.Organization;

public class ResearchGroupDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    public int PrincipalInvestigatorId { get; set; }
    public string PrincipalInvestigatorName { get; set; } = string.Empty;
}

public class UpsertResearchGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public int PrincipalInvestigatorId { get; set; }
}
