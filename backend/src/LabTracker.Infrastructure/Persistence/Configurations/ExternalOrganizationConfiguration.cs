using LabTracker.Domain.Modules.External;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class ExternalOrganizationConfiguration : IEntityTypeConfiguration<ExternalOrganization>
{
    public void Configure(EntityTypeBuilder<ExternalOrganization> builder)
    {
        builder.Property(c => c.Name).HasMaxLength(200).IsRequired();
    }
}
