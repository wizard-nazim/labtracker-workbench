namespace LabTracker.Domain.Modules.External;

// An organization outside the institution (another university, an external
// department) whose people can use shared equipment as walk-in/booking actors.
public class ExternalOrganization
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<ExternalContact> Contacts { get; set; } = new List<ExternalContact>();
}
