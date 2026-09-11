using EquipmentModule = LabTracker.Domain.Modules.Equipment;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class EquipmentScienceOfficerConfiguration : IEntityTypeConfiguration<EquipmentModule.EquipmentScienceOfficer>
{
    public void Configure(EntityTypeBuilder<EquipmentModule.EquipmentScienceOfficer> builder)
    {
        builder.HasKey(x => new { x.EquipmentId, x.UserId });

        builder.HasOne(x => x.Equipment)
            .WithMany(e => e.ScienceOfficers)
            .HasForeignKey(x => x.EquipmentId);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId);

        // At most one primary Science Officer per equipment.
        builder.HasIndex(x => x.EquipmentId)
            .IsUnique()
            .HasFilter("\"IsPrimary\" = true");
    }
}
