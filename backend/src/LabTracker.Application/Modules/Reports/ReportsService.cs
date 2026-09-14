using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Reports;

public class ReportsService(IApplicationDbContext db)
{
    private const string ExternalBucketName = "External";

    // Attributes each usage session to the research group(s) of the researcher who
    // used the equipment, grouped over the requested period. A researcher who
    // belongs to more than one lab has their session counted toward *all* of
    // them (an explicit assumption, pending confirmation of how multi-group
    // attribution should work — see the Phase 1 plan). External (company
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
            .Include(u => u.Actor).ThenInclude(a => a!.Researcher).ThenInclude(r => r!.ResearchGroups).ThenInclude(g => g.PrincipalInvestigator)
            .Where(u => u.ActualStart >= from && u.ActualStart < to)
            .AsQueryable();

        if (filter.EquipmentId is { } equipmentId) query = query.Where(u => u.EquipmentId == equipmentId);
        if (filter.EquipmentTypeId is { } equipmentTypeId) query = query.Where(u => u.Equipment.EquipmentTypeId == equipmentTypeId);

        var records = await query.ToListAsync(cancellationToken);

        var attributions = records.SelectMany(record =>
        {
            var groups = record.Actor.Researcher?.ResearchGroups;
            return groups is { Count: > 0 }
                ? groups.Select(group => (Record: record, Group: (ResearchGroup?)group))
                : [(Record: record, Group: (ResearchGroup?)null)];
        });

        return attributions
            .GroupBy(a => a.Group?.Id)
            .Select(group =>
            {
                var researchGroup = group.First().Group;
                return new UsageStatsRow
                {
                    ResearchGroupId = group.Key,
                    ResearchGroupName = researchGroup?.Name ?? ExternalBucketName,
                    PrincipalInvestigatorName = researchGroup?.PrincipalInvestigator.FullName,
                    SessionCount = group.Count(),
                    TotalHours = Math.Round(group.Sum(a => (a.Record.ActualEnd - a.Record.ActualStart).TotalHours), 1),
                };
            })
            .OrderByDescending(row => row.TotalHours)
            .ToList();
    }
}
