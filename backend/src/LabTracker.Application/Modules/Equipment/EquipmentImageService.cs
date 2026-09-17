using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using LabTracker.Application.Common.Interfaces;
using EquipmentImageEntity = LabTracker.Domain.Modules.Equipment.EquipmentImage;

namespace LabTracker.Application.Modules.Equipment;

// The gallery's DB-side bookkeeping — actual blob upload/delete is
// orchestrated by the controller via IBlobStorage (an Api-layer concern,
// since it deals with IFormFile), the same split the old per-equipment image
// upload used.
public class EquipmentImageService(IApplicationDbContext db)
{
    public async Task<List<EquipmentImageDto>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await db.EquipmentImages
            .OrderByDescending(i => i.UploadedAt)
            .Select(ProjectToDto)
            .ToListAsync(cancellationToken);
    }

    public async Task<EquipmentImageDto> CreateAsync(
        string blobKey, string url, string contentType, long sizeBytes, int uploadedByUserId, CancellationToken cancellationToken = default)
    {
        var image = new EquipmentImageEntity
        {
            BlobKey = blobKey,
            Url = url,
            ContentType = contentType,
            SizeBytes = sizeBytes,
            UploadedByUserId = uploadedByUserId,
            UploadedAt = DateTime.UtcNow,
        };
        db.EquipmentImages.Add(image);
        await db.SaveChangesAsync(cancellationToken);

        return new EquipmentImageDto
        {
            Id = image.Id,
            Url = image.Url,
            ContentType = image.ContentType,
            SizeBytes = image.SizeBytes,
            UploadedAt = image.UploadedAt,
        };
    }

    // Validates the image can be deleted (not currently used by any equipment)
    // and returns its blob key — the caller deletes the blob first, then calls
    // DeleteAsync to remove the row, so a failed blob delete never leaves a
    // dangling DB row pointing at nothing.
    public async Task<string> GetDeletableBlobKeyAsync(int id, CancellationToken cancellationToken = default)
    {
        var image = await db.EquipmentImages.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentImageEntity), id);

        var usageCount = await db.Equipment.CountAsync(e => e.ImageUrl == image.Url, cancellationToken);
        if (usageCount > 0)
        {
            throw new ConflictException(
                $"Still used by {usageCount} piece{(usageCount == 1 ? "" : "s")} of equipment — remove it from them first.");
        }

        return image.BlobKey;
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var image = await db.EquipmentImages.FindAsync([id], cancellationToken)
            ?? throw new NotFoundException(nameof(EquipmentImageEntity), id);

        db.EquipmentImages.Remove(image);
        await db.SaveChangesAsync(cancellationToken);
    }

    private static readonly System.Linq.Expressions.Expression<Func<EquipmentImageEntity, EquipmentImageDto>> ProjectToDto = i => new EquipmentImageDto
    {
        Id = i.Id,
        Url = i.Url,
        ContentType = i.ContentType,
        SizeBytes = i.SizeBytes,
        UploadedAt = i.UploadedAt,
    };
}
