using Microsoft.EntityFrameworkCore;

namespace LabTracker.Infrastructure.Persistence;

public class LabTrackerDbContext(DbContextOptions<LabTrackerDbContext> options) : DbContext(options)
{
}
