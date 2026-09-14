namespace LabTracker.Domain.Modules.External;

public class ExternalContact
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    public int ExternalOrganizationId { get; set; }
    public ExternalOrganization ExternalOrganization { get; set; } = null!;
}
