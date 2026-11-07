using LabTracker.Domain.Modules.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class PasswordResetRequestConfiguration : IEntityTypeConfiguration<PasswordResetRequest>
{
    public void Configure(EntityTypeBuilder<PasswordResetRequest> builder)
    {
        builder.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(r => r.ResolvedByUser).WithMany().HasForeignKey(r => r.ResolvedByUserId).OnDelete(DeleteBehavior.Restrict);

        // The Requests list and the "already pending?" check.
        builder.HasIndex(r => new { r.Status, r.UserId });
    }
}
