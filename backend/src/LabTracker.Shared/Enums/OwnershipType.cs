namespace LabTracker.Shared.Enums;

// Who is responsible for a piece of equipment: the owning department as a
// whole, or one named person (a Science Officer, Researcher or PI) within it.
// The department is always set either way (see Equipment.OwningDepartmentId).
public enum OwnershipType
{
    Department,
    Individual,
}
