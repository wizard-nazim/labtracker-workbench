namespace LabTracker.Domain.Modules.External;

public class CompanyContact
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;

    public int CompanyId { get; set; }
    public Company Company { get; set; } = null!;
}
