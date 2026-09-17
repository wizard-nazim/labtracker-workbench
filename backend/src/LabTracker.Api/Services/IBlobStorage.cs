namespace LabTracker.Api.Services;

public interface IBlobStorage
{
    // ContentType/SizeBytes describe the actual stored object, which for
    // images is a re-encoded, compressed copy — not the original upload.
    Task<(string BlobKey, string Url, string ContentType, long SizeBytes)> UploadAsync(
        IFormFile file, CancellationToken cancellationToken = default);

    Task DeleteAsync(string blobKey, CancellationToken cancellationToken = default);
}
