namespace LabTracker.Application.Modules.Reports;

public class UsageStatsFilter
{
    public int? EquipmentId { get; set; }
    public int? EquipmentTypeId { get; set; }
    public DateTime From { get; set; }
    public DateTime To { get; set; }
}

public class UsageStatsRow
{
    // Null for the "External" bucket (external-contact usage) or the
    // "Unassigned" bucket (internal usage against equipment whose room isn't
    // tied to any lab) — see ResearchGroupName to tell them apart.
    public int? ResearchGroupId { get; set; }
    public string ResearchGroupName { get; set; } = string.Empty;
    public string? PrincipalInvestigatorName { get; set; }

    public int SessionCount { get; set; }
    public double TotalHours { get; set; }
}
