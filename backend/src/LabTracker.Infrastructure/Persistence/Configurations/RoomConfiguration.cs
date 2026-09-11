using EquipmentModule = LabTracker.Domain.Modules.Equipment;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class RoomConfiguration : IEntityTypeConfiguration<EquipmentModule.Room>
{
    public void Configure(EntityTypeBuilder<EquipmentModule.Room> builder)
    {
        builder.Property(r => r.Building).HasMaxLength(100).IsRequired();
        builder.Property(r => r.Floor).HasMaxLength(50).IsRequired();
        builder.Property(r => r.RoomNumber).HasMaxLength(20).IsRequired();

        builder.HasOne(r => r.Department)
            .WithMany()
            .HasForeignKey(r => r.DepartmentId);
    }
}
