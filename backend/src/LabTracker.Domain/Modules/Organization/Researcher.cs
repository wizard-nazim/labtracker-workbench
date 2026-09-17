using LabTracker.Domain.Modules.Identity;
using LabTracker.Shared.Enums;

namespace LabTracker.Domain.Modules.Organization;

public class Researcher
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string StudentNumber { get; set; } = string.Empty;

    public FieldOfStudy? FieldOfStudy { get; set; }

    public int? UserId { get; set; }
    public User? User { get; set; }

    // Many-to-many: a student can belong to more than one lab (e.g. "Plant Stress" and "Speedy").
    public ICollection<ResearchGroup> ResearchGroups { get; set; } = new List<ResearchGroup>();
}
