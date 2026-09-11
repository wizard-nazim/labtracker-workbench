using LabTracker.Domain.Modules.Identity;

namespace LabTracker.Domain.Modules.Organization;

public class Researcher
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;

    public int? UserId { get; set; }
    public User? User { get; set; }

    public int ResearchGroupId { get; set; }
    public ResearchGroup ResearchGroup { get; set; } = null!;
}
