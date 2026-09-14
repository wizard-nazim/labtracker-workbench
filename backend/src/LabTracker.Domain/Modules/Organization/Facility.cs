using LabTracker.Domain.Modules.Identity;

namespace LabTracker.Domain.Modules.Organization;

public class Facility
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public ICollection<User> Overseers { get; set; } = [];
}
