namespace LabTracker.Domain.Modules.Organization;

public class ResearchGroup
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public int PrincipalInvestigatorId { get; set; }
    public PrincipalInvestigator PrincipalInvestigator { get; set; } = null!;

    public ICollection<Researcher> Researchers { get; set; } = new List<Researcher>();
}
