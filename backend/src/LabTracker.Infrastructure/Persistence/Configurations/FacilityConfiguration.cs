using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class FacilityConfiguration : IEntityTypeConfiguration<Facility>
{
    public void Configure(EntityTypeBuilder<Facility> builder)
    {
        builder.Property(f => f.Name).HasMaxLength(200).IsRequired();

        builder.HasOne(f => f.Department)
            .WithMany()
            .HasForeignKey(f => f.DepartmentId);

        // Science Officers assigned to manage a facility, on top of their
        // existing department-wide visibility.
        builder.HasMany(f => f.Overseers)
            .WithMany()
            .UsingEntity(j => j.ToTable("FacilityOverseers"));
    }
}
