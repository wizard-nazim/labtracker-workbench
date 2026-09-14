using LabTracker.Domain.Modules.External;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class ExternalContactConfiguration : IEntityTypeConfiguration<ExternalContact>
{
    public void Configure(EntityTypeBuilder<ExternalContact> builder)
    {
        builder.Property(c => c.FullName).HasMaxLength(200).IsRequired();
        builder.Property(c => c.Email).HasMaxLength(256).IsRequired();
        builder.Property(c => c.Phone).HasMaxLength(30);

        builder.HasOne(c => c.ExternalOrganization)
            .WithMany(c => c.Contacts)
            .HasForeignKey(c => c.ExternalOrganizationId);
    }
}
