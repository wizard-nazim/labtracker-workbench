using EquipmentModule = LabTracker.Domain.Modules.Equipment;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class EquipmentTypeConfiguration : IEntityTypeConfiguration<EquipmentModule.EquipmentType>
{
    public void Configure(EntityTypeBuilder<EquipmentModule.EquipmentType> builder)
    {
        builder.Property(t => t.Name).HasMaxLength(150).IsRequired();
        builder.HasIndex(t => t.Name).IsUnique();
    }
}
