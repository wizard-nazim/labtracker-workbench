namespace LabTracker.Application.Modules.Organization;

public class FacilityDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public List<int> OverseerUserIds { get; set; } = [];
    public List<string> OverseerEmails { get; set; } = [];
}

public class UpsertFacilityRequest
{
    public string Name { get; set; } = string.Empty;
    public int DepartmentId { get; set; }
    public List<int> OverseerUserIds { get; set; } = [];
}
