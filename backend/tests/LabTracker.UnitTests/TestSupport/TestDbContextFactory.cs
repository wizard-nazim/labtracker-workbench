using LabTracker.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LabTracker.UnitTests.TestSupport;

// Backs IApplicationDbContext with EF Core's InMemory provider so Application-layer
// services can be exercised without a real Postgres (see the comment on
// IApplicationDbContext). Each call gets its own isolated database.
public static class TestDbContextFactory
{
    public static LabTrackerDbContext Create()
    {
        var options = new DbContextOptionsBuilder<LabTrackerDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new LabTrackerDbContext(options);
    }
}
