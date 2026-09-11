using LabTracker.Domain.Modules.Organization;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class DepartmentConfiguration : IEntityTypeConfiguration<Department>
{
    public void Configure(EntityTypeBuilder<Department> builder)
    {
        builder.Property(d => d.Name).HasMaxLength(200).IsRequired();

        builder.Property(d => d.Code).HasMaxLength(20).IsRequired();
        builder.HasIndex(d => d.Code).IsUnique();
    }
}
