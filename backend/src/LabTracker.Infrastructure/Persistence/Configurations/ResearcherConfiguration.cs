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

        builder.HasOne(r => r.ResearchGroup)
            .WithMany()
            .HasForeignKey(r => r.ResearchGroupId);
    }
}
