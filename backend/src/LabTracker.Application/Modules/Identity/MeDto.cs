using LabTracker.Application.Modules.Organization;

namespace LabTracker.Application.Modules.Identity;

public class MeDto
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool HasCompletedOnboarding { get; set; }
    public bool HasCompletedAdminTour { get; set; }
    public string? Phone { get; set; }
    public bool NotifyOnEquipmentChanges { get; set; }
    public bool MustChangePassword { get; set; }

    public ResearcherDto? ResearcherProfile { get; set; }
    public PrincipalInvestigatorDto? PrincipalInvestigatorProfile { get; set; }
}

public class UpdateMeRequest
{
    public string? Phone { get; set; }
    public bool NotifyOnEquipmentChanges { get; set; } = true;
}
