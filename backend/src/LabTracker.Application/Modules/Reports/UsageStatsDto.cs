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
    // Null for the "External" bucket (company-contact usage — no research group).
    public int? ResearchGroupId { get; set; }
    public string ResearchGroupName { get; set; } = string.Empty;
    public string? PrincipalInvestigatorName { get; set; }

    public int SessionCount { get; set; }
    public double TotalHours { get; set; }
}
