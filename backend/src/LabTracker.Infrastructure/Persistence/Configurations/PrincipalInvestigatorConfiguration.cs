using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class PrincipalInvestigatorConfiguration : IEntityTypeConfiguration<PrincipalInvestigator>
{
    public void Configure(EntityTypeBuilder<PrincipalInvestigator> builder)
    {
        builder.Property(p => p.FullName).HasMaxLength(200).IsRequired();
        builder.Property(p => p.Email).HasMaxLength(256).IsRequired();

        builder.HasOne(p => p.Department)
            .WithMany()
            .HasForeignKey(p => p.DepartmentId);

        builder.HasOne(p => p.User)
            .WithMany()
            .HasForeignKey(p => p.UserId);

        // A login account maps to at most one PI profile (mirrors Researcher.UserId).
        builder.HasIndex(p => p.UserId)
            .IsUnique()
            .HasFilter("\"UserId\" IS NOT NULL");
    }
}
