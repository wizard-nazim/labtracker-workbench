namespace LabTracker.Domain.Modules.External;

public class Company
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<CompanyContact> Contacts { get; set; } = new List<CompanyContact>();
}
