using LabTracker.Domain.Modules.Identity;

namespace LabTracker.Domain.Modules.Equipment;

// A shared gallery of previously-uploaded equipment photos, stored in blob
// storage — an Equipment references one by copying its Url into
// Equipment.ImageUrl, so the same photo can be reused across multiple pieces
// of equipment without re-uploading.
public class EquipmentImage
{
    public int Id { get; set; }
    public string BlobKey { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }

    public int UploadedByUserId { get; set; }
    public User UploadedByUser { get; set; } = null!;
    public DateTime UploadedAt { get; set; }
}
