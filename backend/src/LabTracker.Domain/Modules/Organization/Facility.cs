using LabTracker.Domain.Modules.Equipment;
using LabTracker.Domain.Modules.Identity;

namespace LabTracker.Domain.Modules.Organization;

public class Facility
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;

    public ICollection<User> Overseers { get; set; } = [];

    // Which rooms this facility occupies — assigned from the Room side (each
    // Room picks at most one Facility), this is just the read-only inverse view.
    public ICollection<Room> Rooms { get; set; } = [];
}
