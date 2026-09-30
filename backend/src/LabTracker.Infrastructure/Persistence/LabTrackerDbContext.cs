using LabTracker.Application.Common.Interfaces;
using LabTracker.Domain.Modules.Booking;
using LabTracker.Domain.Modules.External;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;
using EquipmentModule = LabTracker.Domain.Modules.Equipment;

namespace LabTracker.Infrastructure.Persistence;

public class LabTrackerDbContext(DbContextOptions<LabTrackerDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    public DbSet<User> Users => Set<User>();

    public DbSet<Department> Departments => Set<Department>();
    public DbSet<PrincipalInvestigator> PrincipalInvestigators => Set<PrincipalInvestigator>();
    public DbSet<ResearchGroup> ResearchGroups => Set<ResearchGroup>();
    public DbSet<Researcher> Researchers => Set<Researcher>();
    public DbSet<Facility> Facilities => Set<Facility>();

    public DbSet<ExternalOrganization> ExternalOrganizations => Set<ExternalOrganization>();
    public DbSet<ExternalContact> ExternalContacts => Set<ExternalContact>();

    public DbSet<EquipmentModule.Room> Rooms => Set<EquipmentModule.Room>();
    public DbSet<EquipmentModule.EquipmentType> EquipmentTypes => Set<EquipmentModule.EquipmentType>();
    public DbSet<EquipmentEntity> Equipment => Set<EquipmentEntity>();
    public DbSet<EquipmentModule.EquipmentScienceOfficer> EquipmentScienceOfficers => Set<EquipmentModule.EquipmentScienceOfficer>();
    public DbSet<EquipmentModule.EquipmentImage> EquipmentImages => Set<EquipmentModule.EquipmentImage>();

    public DbSet<UsageActor> UsageActors => Set<UsageActor>();
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<UsageRecord> UsageRecords => Set<UsageRecord>();

    public DbSet<Domain.Modules.Notifications.Notification> Notifications => Set<Domain.Modules.Notifications.Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LabTrackerDbContext).Assembly);

        // Conservative default: never let deleting a parent silently cascade-delete
        // booking/usage/audit history. Cascades can be opted into per-relationship
        // in that entity's configuration if a real case for one ever comes up.
        foreach (var foreignKey in modelBuilder.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()))
        {
            foreignKey.DeleteBehavior = DeleteBehavior.Restrict;
        }
    }
}
