using LabTracker.Domain.Modules.Booking;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class UsageActorConfiguration : IEntityTypeConfiguration<UsageActor>
{
    public void Configure(EntityTypeBuilder<UsageActor> builder)
    {
        builder.Property(a => a.DisplayNameSnapshot).HasMaxLength(200).IsRequired();

        builder.HasOne(a => a.Researcher)
            .WithMany()
            .HasForeignKey(a => a.ResearcherId);

        builder.HasOne(a => a.ExternalContact)
            .WithMany()
            .HasForeignKey(a => a.ExternalContactId);

        // Exactly one of Researcher/ExternalContact set, matching ActorType.
        builder.ToTable(t => t.HasCheckConstraint(
            "CK_UsageActor_ExactlyOneParty",
            "(\"ResearcherId\" IS NOT NULL AND \"ExternalContactId\" IS NULL) OR " +
            "(\"ResearcherId\" IS NULL AND \"ExternalContactId\" IS NOT NULL)"));
    }
}
