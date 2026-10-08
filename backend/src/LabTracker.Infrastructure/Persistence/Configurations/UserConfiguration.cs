using LabTracker.Domain.Modules.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Property(u => u.Email).HasMaxLength(256).IsRequired();
        builder.HasIndex(u => u.Email).IsUnique();

        // Emails are normalised on write (EmailAddress.Normalize); this keeps any
        // path that forgets from reintroducing case-variant duplicates.
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_User_EmailLowercase",
            "\"Email\" = lower(btrim(\"Email\"))"));

        builder.Property(u => u.PasswordHash).IsRequired();

        builder.Property(u => u.Phone).HasMaxLength(30);
        builder.Property(u => u.NotifyOnEquipmentChanges).HasDefaultValue(true);
    }
}
