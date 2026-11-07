using LabTracker.Domain.Modules.Booking;
using LabTracker.Domain.Modules.External;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;

namespace LabTracker.Application.Common.Interfaces;

// Lets Application-layer services be unit-tested against an in-memory/fake
// implementation without a real Postgres, without a repository-per-aggregate.
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<PasswordResetRequest> PasswordResetRequests { get; }

    DbSet<Department> Departments { get; }
    DbSet<PrincipalInvestigator> PrincipalInvestigators { get; }
    DbSet<ResearchGroup> ResearchGroups { get; }
    DbSet<Researcher> Researchers { get; }
    DbSet<Facility> Facilities { get; }

    DbSet<ExternalOrganization> ExternalOrganizations { get; }
    DbSet<ExternalContact> ExternalContacts { get; }

    DbSet<Domain.Modules.Equipment.Room> Rooms { get; }
    DbSet<Domain.Modules.Equipment.EquipmentType> EquipmentTypes { get; }
    DbSet<EquipmentEntity> Equipment { get; }
    DbSet<Domain.Modules.Equipment.EquipmentScienceOfficer> EquipmentScienceOfficers { get; }
    DbSet<Domain.Modules.Equipment.EquipmentImage> EquipmentImages { get; }

    DbSet<UsageActor> UsageActors { get; }
    DbSet<Booking> Bookings { get; }
    DbSet<UsageRecord> UsageRecords { get; }

    DbSet<Domain.Modules.Notifications.Notification> Notifications { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
