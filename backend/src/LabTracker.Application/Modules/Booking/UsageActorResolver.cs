using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using UsageActorEntity = LabTracker.Domain.Modules.Booking.UsageActor;

namespace LabTracker.Application.Modules.Booking;

// Shared by Bookings and Usage Records: both need to attribute an actor
// (internal researcher or external contact), reusing the same UsageActor row
// across all of that actor's activity rather than creating a new one each time.
// At most one row per researcher/contact is enforced by unique indexes (see
// UsageActorConfiguration); a concurrent first booking that loses the insert
// race picks up the winner's row instead of failing.
public class UsageActorResolver(IApplicationDbContext db)
{
    public async Task<int> GetOrCreateInternalActorAsync(int researcherId, CancellationToken cancellationToken)
    {
        var existing = db.UsageActors.Where(a => a.ActorType == ActorType.Internal && a.ResearcherId == researcherId);
        return await FindAsync(existing, cancellationToken) ?? await CreateAsync(existing, async () => new UsageActorEntity
        {
            ActorType = ActorType.Internal,
            ResearcherId = researcherId,
            DisplayNameSnapshot = await db.Researchers.Where(r => r.Id == researcherId).Select(r => r.FullName).SingleAsync(cancellationToken),
        }, cancellationToken);
    }

    public async Task<int> GetOrCreateExternalActorAsync(int externalContactId, CancellationToken cancellationToken)
    {
        var existing = db.UsageActors.Where(a => a.ActorType == ActorType.External && a.ExternalContactId == externalContactId);
        return await FindAsync(existing, cancellationToken) ?? await CreateAsync(existing, async () => new UsageActorEntity
        {
            ActorType = ActorType.External,
            ExternalContactId = externalContactId,
            DisplayNameSnapshot = await db.ExternalContacts.Where(c => c.Id == externalContactId).Select(c => c.FullName).SingleAsync(cancellationToken),
        }, cancellationToken);
    }

    private static async Task<int?> FindAsync(IQueryable<UsageActorEntity> existing, CancellationToken cancellationToken)
        => await existing.Select(a => (int?)a.Id).SingleOrDefaultAsync(cancellationToken);

    private async Task<int> CreateAsync(IQueryable<UsageActorEntity> existing, Func<Task<UsageActorEntity>> build, CancellationToken cancellationToken)
    {
        var actor = await build();
        db.UsageActors.Add(actor);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
            return actor.Id;
        }
        catch (DbUpdateException)
        {
            // Lost the race to a concurrent insert for the same party: drop our
            // row and use theirs. Anything else (no winner found) is a real error.
            db.UsageActors.Entry(actor).State = EntityState.Detached;
            var winnerId = await FindAsync(existing, cancellationToken);
            if (winnerId is null) throw;
            return winnerId.Value;
        }
    }
}
