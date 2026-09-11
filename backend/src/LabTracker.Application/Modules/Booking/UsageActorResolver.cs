using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using Microsoft.EntityFrameworkCore;
using UsageActorEntity = LabTracker.Domain.Modules.Booking.UsageActor;

namespace LabTracker.Application.Modules.Booking;

// Shared by Bookings and Usage Records: both need to attribute an internal
// actor to a researcher, reusing the same UsageActor row across all of a
// researcher's activity rather than creating a new one each time.
public class UsageActorResolver(IApplicationDbContext db)
{
    public async Task<int> GetOrCreateInternalActorAsync(int researcherId, CancellationToken cancellationToken)
    {
        var existingActorId = await db.UsageActors
            .Where(a => a.ActorType == ActorType.Internal && a.ResearcherId == researcherId)
            .Select(a => a.Id)
            .SingleOrDefaultAsync(cancellationToken);
        if (existingActorId != 0)
        {
            return existingActorId;
        }

        var researcherName = await db.Researchers.Where(r => r.Id == researcherId).Select(r => r.FullName).SingleAsync(cancellationToken);
        var actor = new UsageActorEntity
        {
            ActorType = ActorType.Internal,
            ResearcherId = researcherId,
            DisplayNameSnapshot = researcherName,
        };
        db.UsageActors.Add(actor);
        await db.SaveChangesAsync(cancellationToken);

        return actor.Id;
    }
}
