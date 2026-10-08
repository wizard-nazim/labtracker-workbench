using LabTracker.Domain.Modules.Notifications;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.Property(n => n.Title).HasMaxLength(200).IsRequired();
        builder.Property(n => n.Body).HasMaxLength(1000).IsRequired();

        builder.HasOne(n => n.User).WithMany().HasForeignKey(n => n.UserId);

        // The bell's "my unread" lookup.
        builder.HasIndex(n => new { n.UserId, n.ReadAt });
    }
}
