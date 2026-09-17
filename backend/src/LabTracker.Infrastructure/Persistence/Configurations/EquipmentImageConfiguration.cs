using EquipmentModule = LabTracker.Domain.Modules.Equipment;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LabTracker.Infrastructure.Persistence.Configurations;

public class EquipmentImageConfiguration : IEntityTypeConfiguration<EquipmentModule.EquipmentImage>
{
    public void Configure(EntityTypeBuilder<EquipmentModule.EquipmentImage> builder)
    {
        builder.Property(x => x.BlobKey).HasMaxLength(300).IsRequired();
        builder.Property(x => x.Url).HasMaxLength(300).IsRequired();
        builder.Property(x => x.ContentType).HasMaxLength(100).IsRequired();

        builder.HasOne(x => x.UploadedByUser)
            .WithMany()
            .HasForeignKey(x => x.UploadedByUserId);
    }
}
