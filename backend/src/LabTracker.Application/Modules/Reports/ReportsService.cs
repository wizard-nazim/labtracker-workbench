using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Organization;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.Application.Modules.Reports;

public class ReportsService(IApplicationDbContext db)
{
    private const string ExternalBucketName = "External";
    private const string UnassignedBucketName = "Unassigned";

    // Attributes each usage session to the research group that owns the room the
    // booked equipment lives in — i.e. by what was actually booked, not by every
    // lab the researcher happens to belong to. A researcher in two labs no longer
    // has a single session double-counted toward both (that used to fan out over
    // Researcher.ResearchGroups; each session now lands in exactly one bucket).
    // External (company contact) usage keeps its own separate bucket regardless
    // of room. Internal usage against equipment whose room isn't tied to any lab
    // (shared equipment) lands in "Unassigned" rather than being conflated with
    // "External".
    public async Task<List<UsageStatsRow>> GetEquipmentUsageStatsAsync(UsageStatsFilter filter, CancellationToken cancellationToken = default)
    {
        // Query-string model binding produces DateTime.Kind=Unspecified, which
        // Npgsql refuses to write to a timestamptz column/parameter — the app
        // treats all DateTimes as UTC everywhere else (see UtcDateTimeConverter),
        // so make that explicit here too.
        var from = DateTime.SpecifyKind(filter.From, DateTimeKind.Utc);
        var to = DateTime.SpecifyKind(filter.To, DateTimeKind.Utc);

        var query = db.UsageRecords
            .Include(u => u.Actor)
            .Include(u => u.Equipment).ThenInclude(e => e.Room).ThenInclude(r => r.ResearchGroup).ThenInclude(g => g!.PrincipalInvestigator)
            .Where(u => u.ActualStart >= from && u.ActualStart < to)
            .AsQueryable();

        if (filter.EquipmentId is { } equipmentId) query = query.Where(u => u.EquipmentId == equipmentId);
        if (filter.EquipmentTypeId is { } equipmentTypeId) query = query.Where(u => u.Equipment.EquipmentTypeId == equipmentTypeId);

        var records = await query.ToListAsync(cancellationToken);

        var attributions = records.Select(record =>
        {
            var isExternal = record.Actor.ActorType == ActorType.External;
            var group = isExternal ? null : record.Equipment.Room.ResearchGroup;
            return (Record: record, Group: group, IsExternal: isExternal);
        });

        return attributions
            .GroupBy(a => a.Group?.Id ?? (a.IsExternal ? ExternalBucketKey : UnassignedBucketKey))
            .Select(group =>
            {
                var researchGroup = group.First().Group;
                var bucketName = researchGroup?.Name ?? (group.Key == ExternalBucketKey ? ExternalBucketName : UnassignedBucketName);
                return new UsageStatsRow
                {
                    ResearchGroupId = researchGroup?.Id,
                    ResearchGroupName = bucketName,
                    PrincipalInvestigatorName = researchGroup?.PrincipalInvestigator.FullName,
                    SessionCount = group.Count(),
                    TotalHours = Math.Round(group.Sum(a => (a.Record.ActualEnd - a.Record.ActualStart).TotalHours), 1),
                };
            })
            .OrderByDescending(row => row.TotalHours)
            .ToList();
    }

    // Sentinel keys for the GroupBy above — real ResearchGroup ids are always
    // positive (identity columns), so these never collide with one.
    private const int ExternalBucketKey = -1;
    private const int UnassignedBucketKey = -2;
}
