using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class ResearcherConfiguration : IEntityTypeConfiguration<Researcher>
{
    public void Configure(EntityTypeBuilder<Researcher> builder)
    {
        builder.Property(r => r.FullName).HasMaxLength(200).IsRequired();
        builder.Property(r => r.StudentNumber).HasMaxLength(50).IsRequired();

        builder.HasOne(r => r.User)
            .WithMany()
            .HasForeignKey(r => r.UserId);

        // A student can belong to more than one lab (e.g. "Plant Stress" and "Speedy").
        builder.HasMany(r => r.ResearchGroups)
            .WithMany(g => g.Researchers)
            .UsingEntity(j => j.ToTable("ResearcherResearchGroups"));

        // A login account maps to at most one researcher profile.
        builder.HasIndex(r => r.UserId)
            .IsUnique()
            .HasFilter("\"UserId\" IS NOT NULL");
    }
}
