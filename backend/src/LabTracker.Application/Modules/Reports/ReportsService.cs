using LabTracker.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Reports;

public class ReportsService(IApplicationDbContext db)
{
    private const string ExternalBucketName = "External";

    // Attributes each usage session to the research group of the researcher who
    // used the equipment, grouped over the requested period. External (company
    // contact) usage has no research group, so it's bucketed separately rather
    // than silently dropped from the totals.
    public async Task<List<UsageStatsRow>> GetEquipmentUsageStatsAsync(UsageStatsFilter filter, CancellationToken cancellationToken = default)
    {
        // Query-string model binding produces DateTime.Kind=Unspecified, which
        // Npgsql refuses to write to a timestamptz column/parameter — the app
        // treats all DateTimes as UTC everywhere else (see UtcDateTimeConverter),
        // so make that explicit here too.
        var from = DateTime.SpecifyKind(filter.From, DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(filter.To, DateTimeKind.Utc);

        var query = db.UsageRecords
            .Include(u => u.Actor).ThenInclude(a => a!.Researcher).ThenInclude(r => r!.ResearchGroup).ThenInclude(g => g!.PrincipalInvestigator)
            .Where(u => u.ActualStart >= from && u.ActualStart < to)
            .AsQueryable();

        if (filter.EquipmentId is { } equipmentId) query = query.Where(u => u.EquipmentId == equipmentId);
        if (filter.EquipmentTypeId is { } equipmentTypeId) query = query.Where(u => u.Equipment.EquipmentTypeId == equipmentTypeId);

        var records = await query.ToListAsync(cancellationToken);

        return records
            .GroupBy(u => u.Actor.Researcher?.ResearchGroupId)
            .Select(group =>
            {
                var first = group.First();
                var researchGroup = first.Actor.Researcher?.ResearchGroup;
                return new UsageStatsRow
                {
                    ResearchGroupId = group.Key,
                    ResearchGroupName = researchGroup?.Name ?? ExternalBucketName,
                    PrincipalInvestigatorName = researchGroup?.PrincipalInvestigator.FullName,
                    SessionCount = group.Count(),
                    TotalHours = Math.Round(group.Sum(u => (u.ActualEnd - u.ActualStart).TotalHours), 1),
                };
            })
            .OrderByDescending(row => row.TotalHours)
            .ToList();
    }
}
