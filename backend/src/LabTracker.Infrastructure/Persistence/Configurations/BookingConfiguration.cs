using LabTracker.Domain.Modules.Booking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class BookingConfiguration : IEntityTypeConfiguration<Booking>
{
    public void Configure(EntityTypeBuilder<Booking> builder)
    {
        builder.HasOne(b => b.Equipment)
            .WithMany()
            .HasForeignKey(b => b.EquipmentId);

        builder.HasOne(b => b.Actor)
            .WithMany()
            .HasForeignKey(b => b.ActorId);

        builder.HasOne(b => b.ApprovedByUser)
            .WithMany()
            .HasForeignKey(b => b.ApprovedByUserId);

        builder.HasOne(b => b.CreatedByUser)
            .WithMany()
            .HasForeignKey(b => b.CreatedByUserId);

        builder.HasOne(b => b.ModifiedByUser)
            .WithMany()
            .HasForeignKey(b => b.ModifiedByUserId);

        builder.Property(b => b.Notes).HasMaxLength(500);

        // Optimistic concurrency on Postgres's xmin system column, so two people
        // approving/rejecting the same booking at once can't both win
        // (BookingService.TransitionAsync turns the loser into a 409).
        builder.Property<uint>("xmin")
            .HasColumnType("xid")
            .ValueGeneratedOnAddOrUpdate()
            .IsConcurrencyToken();

        builder.ToTable(t => t.HasCheckConstraint(
            "CK_Booking_ValidTimeRange",
            "\"ScheduledEnd\" > \"ScheduledStart\""));
    }
}
