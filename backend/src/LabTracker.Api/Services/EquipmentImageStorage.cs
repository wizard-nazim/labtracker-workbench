using FluentValidation;
using FluentValidation.Results;

namespace LabTracker.Api.Services;

public interface IEquipmentImageStorage
{
    Task<string> SaveAsync(int equipmentId, IFormFile file, CancellationToken cancellationToken = default);
}

// Local-disk storage under wwwroot/uploads, served back via UseStaticFiles
// (Program.cs). No cloud/blob storage is configured for this app yet — swap
// this implementation out if that changes later.
public class EquipmentImageStorage(IWebHostEnvironment environment) : IEquipmentImageStorage
{
    private static readonly Dictionary<string, string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        ["image/jpeg"] = ".jpg",
        ["image/png"] = ".png",
        ["image/webp"] = ".webp",
    };

    private const long MaxSizeBytes = 5 * 1024 * 1024;

    public async Task<string> SaveAsync(int equipmentId, IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            throw new ValidationException([new ValidationFailure("File", "An image file is required.")]);
        }

        if (file.Length > MaxSizeBytes)
        {
            throw new ValidationException([new ValidationFailure("File", "Image must be 5MB or smaller.")]);
        }

        if (!AllowedContentTypes.TryGetValue(file.ContentType, out var extension))
        {
            throw new ValidationException([new ValidationFailure("File", "Image must be a JPEG, PNG, or WEBP file.")]);
        }

        var webRoot = string.IsNullOrEmpty(environment.WebRootPath)
            ? Path.Combine(environment.ContentRootPath, "wwwroot")
            : environment.WebRootPath;

        var equipmentDirectory = Path.Combine(webRoot, "uploads", "equipment", equipmentId.ToString());
        Directory.CreateDirectory(equipmentDirectory);

        var fileName = $"{Guid.NewGuid()}{extension}";
        var fullPath = Path.Combine(equipmentDirectory, fileName);

        await using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return $"/uploads/equipment/{equipmentId}/{fileName}";
    }
}
