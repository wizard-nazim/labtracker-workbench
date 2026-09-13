using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class EquipmentConfiguration : IEntityTypeConfiguration<EquipmentEntity>
{
    public void Configure(EntityTypeBuilder<EquipmentEntity> builder)
    {
        builder.Property(e => e.Name).HasMaxLength(200).IsRequired();
        builder.Property(e => e.SerialNumber).HasMaxLength(100);
        builder.Property(e => e.ImageUrl).HasMaxLength(300);
        builder.Property(e => e.IconKey).HasMaxLength(50);

        builder.HasOne(e => e.EquipmentType)
            .WithMany()
            .HasForeignKey(e => e.EquipmentTypeId);

        builder.HasOne(e => e.Room)
            .WithMany()
            .HasForeignKey(e => e.RoomId);

        builder.HasOne(e => e.OwningDepartment)
            .WithMany()
            .HasForeignKey(e => e.OwningDepartmentId);
    }
}
