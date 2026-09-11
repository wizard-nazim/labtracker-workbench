using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class ResearchGroupConfiguration : IEntityTypeConfiguration<ResearchGroup>
{
    public void Configure(EntityTypeBuilder<ResearchGroup> builder)
    {
        builder.Property(g => g.Name).HasMaxLength(200).IsRequired();

        builder.HasOne(g => g.Department)
            .WithMany()
            .HasForeignKey(g => g.DepartmentId);

        builder.HasOne(g => g.PrincipalInvestigator)
            .WithMany()
            .HasForeignKey(g => g.PrincipalInvestigatorId);
    }
}
