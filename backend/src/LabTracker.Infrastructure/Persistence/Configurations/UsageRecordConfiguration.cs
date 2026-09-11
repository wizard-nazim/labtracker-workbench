using LabTracker.Domain.Modules.Booking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class UsageRecordConfiguration : IEntityTypeConfiguration<UsageRecord>
{
    public void Configure(EntityTypeBuilder<UsageRecord> builder)
    {
        builder.HasOne(u => u.Equipment)
            .WithMany()
            .HasForeignKey(u => u.EquipmentId);

        builder.HasOne(u => u.Actor)
            .WithMany()
            .HasForeignKey(u => u.ActorId);

        builder.HasOne(u => u.Booking)
            .WithMany()
            .HasForeignKey(u => u.BookingId);

        builder.HasOne(u => u.RecordedByUser)
            .WithMany()
            .HasForeignKey(u => u.RecordedByUserId);

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_UsageRecord_ValidTimeRange",
            "\"ActualEnd\" > \"ActualStart\""));
    }
}
