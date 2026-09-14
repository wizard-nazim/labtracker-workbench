namespace LabTracker.Application.Modules.Organization;

public class ResearcherDto
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;
    public string? FieldOfStudy { get; set; }

    public List<int> ResearchGroupIds { get; set; } = [];
    public List<string> ResearchGroupNames { get; set; } = [];

    public int? UserId { get; set; }
    public string? UserEmail { get; set; }
}

public class UpsertResearcherRequest
{
    public string FullName { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;
    public string? FieldOfStudy { get; set; }
    public List<int> ResearchGroupIds { get; set; } = [];

    // Optional: links this research profile to a login account. A researcher
    // may exist (e.g. imported from a spreadsheet) before they have an account.
    public int? UserId { get; set; }
}
