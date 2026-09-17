using Amazon.S3;
using Amazon.S3.Model;
using FluentValidation;
using FluentValidation.Results;
using SkiaSharp;

namespace LabTracker.Api.Services;

public class S3BlobStorageOptions
{
    public string ServiceUrl { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string Bucket { get; set; } = string.Empty;

    // The URL browsers use to fetch an object — usually the same as ServiceUrl,
    // but kept separate in case the storage sits behind a different public
    // hostname/proxy than the one the API talks to internally.
    public string PublicBaseUrl { get; set; } = string.Empty;
}

// S3-compatible blob storage — talks to a self-hosted MinIO instance today
// (see docker-compose.yml), but since it's the plain AWS S3 SDK pointed at a
// custom ServiceURL, moving to real AWS S3 later is a config change only.
public class S3BlobStorage : IBlobStorage
{
    // Every accepted upload is re-encoded to JPEG (see UploadAsync), so this
    // only gates which source formats we'll decode — not the stored format.
    private static readonly HashSet<string> AllowedContentTypes =
        new(StringComparer.OrdinalIgnoreCase) { "image/jpeg", "image/png", "image/webp" };

    private const long MaxSizeBytes = 5 * 1024 * 1024;

    // Nothing in the app ever displays an equipment photo larger than a few
    // hundred pixels (avatars, gallery thumbnails, the detail page header) —
    // re-encoding every upload down to this ceiling keeps blob storage and
    // page-load size small regardless of how large the original photo was.
    private const int MaxDimension = 640;
    private const int JpegQuality = 82;

    private readonly IAmazonS3 client;
    private readonly S3BlobStorageOptions options;
    private bool bucketEnsured;

    public S3BlobStorage(S3BlobStorageOptions options)
    {
        this.options = options;
        client = new AmazonS3Client(
            options.AccessKey,
            options.SecretKey,
            new AmazonS3Config
            {
                ServiceURL = options.ServiceUrl,
                ForcePathStyle = true,
            });
    }

    public async Task<(string BlobKey, string Url, string ContentType, long SizeBytes)> UploadAsync(
        IFormFile file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            throw new ValidationException([new ValidationFailure("File", "An image file is required.")]);
        }

        if (file.Length > MaxSizeBytes)
        {
            throw new ValidationException([new ValidationFailure("File", "Image must be 5MB or smaller.")]);
        }

        if (!AllowedContentTypes.Contains(file.ContentType))
        {
            throw new ValidationException([new ValidationFailure("File", "Image must be a JPEG, PNG, or WEBP file.")]);
        }

        await EnsureBucketExistsAsync(cancellationToken);

        // Every upload is re-encoded to a capped, compressed JPEG regardless of
        // the source format — this is what actually keeps storage/egress small
        // (a raw phone photo can be 10-20x this size), not just a display-time
        // thumbnail. Correcting for EXIF orientation avoids sideways/upside-down
        // phone photos, and re-encoding without copying metadata drops the
        // source EXIF (including any embedded GPS location) as a side effect.
        using var sourceData = await ReadAllAsSKDataAsync(file, cancellationToken);
        using var codec = SKCodec.Create(sourceData) ?? throw new ValidationException(
            [new ValidationFailure("File", "Couldn't read this image — it may be corrupt or an unsupported format.")]);
        using var decoded = SKBitmap.Decode(codec);
        using var oriented = ApplyExifOrientation(decoded, codec.EncodedOrigin);
        using var resized = ResizeToFit(oriented, MaxDimension);

        using var jpegData = resized.Encode(SKEncodedImageFormat.Jpeg, JpegQuality);
        var sizeBytes = jpegData.Size;

        var blobKey = $"equipment/{Guid.NewGuid()}.jpg";
        using var outputStream = jpegData.AsStream();

        await client.PutObjectAsync(new PutObjectRequest
        {
            BucketName = options.Bucket,
            Key = blobKey,
            InputStream = outputStream,
            ContentType = "image/jpeg",
        }, cancellationToken);

        return (blobKey, $"{options.PublicBaseUrl.TrimEnd('/')}/{options.Bucket}/{blobKey}", "image/jpeg", sizeBytes);
    }

    public async Task DeleteAsync(string blobKey, CancellationToken cancellationToken = default)
    {
        await client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = options.Bucket,
            Key = blobKey,
        }, cancellationToken);
    }

    private async Task EnsureBucketExistsAsync(CancellationToken cancellationToken)
    {
        if (bucketEnsured) return;

        var buckets = await client.ListBucketsAsync(cancellationToken);
        // MinIO omits the <Buckets> element entirely (deserializing to null,
        // not an empty list) when the account has zero buckets so far.
        var bucketExists = buckets.Buckets?.Any(b => b.BucketName == options.Bucket) ?? false;
        if (!bucketExists)
        {
            await client.PutBucketAsync(options.Bucket, cancellationToken);
            await client.PutBucketPolicyAsync(options.Bucket, $$"""
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": { "AWS": ["*"] },
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::{{options.Bucket}}/*"]
                    }
                  ]
                }
                """, cancellationToken);
        }

        bucketEnsured = true;
    }

    private static async Task<SKData> ReadAllAsSKDataAsync(IFormFile file, CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);
        return SKData.CreateCopy(buffer.GetBuffer().AsSpan(0, (int)buffer.Length));
    }

    // Phone cameras save landscape sensor data plus an EXIF rotation flag
    // rather than physically rotating pixels — without correcting for it,
    // plenty of uploads would come out sideways or upside-down. This covers
    // the four rotation-only origins that account for virtually every real
    // phone photo; the rarer mirrored origins (scanners, not cameras) are
    // left as-is rather than adding flip handling nothing will ever exercise.
    private static SKBitmap ApplyExifOrientation(SKBitmap bitmap, SKEncodedOrigin origin)
    {
        switch (origin)
        {
            case SKEncodedOrigin.BottomRight:
            {
                var result = new SKBitmap(bitmap.Width, bitmap.Height);
                using var canvas = new SKCanvas(result);
                canvas.RotateDegrees(180, bitmap.Width / 2f, bitmap.Height / 2f);
                canvas.DrawBitmap(bitmap, 0, 0, SKSamplingOptions.Default);
                return result;
            }
            case SKEncodedOrigin.RightTop:
            {
                var result = new SKBitmap(bitmap.Height, bitmap.Width);
                using var canvas = new SKCanvas(result);
                canvas.Translate(result.Width, 0);
                canvas.RotateDegrees(90);
                canvas.DrawBitmap(bitmap, 0, 0, SKSamplingOptions.Default);
                return result;
            }
            case SKEncodedOrigin.LeftBottom:
            {
                var result = new SKBitmap(bitmap.Height, bitmap.Width);
                using var canvas = new SKCanvas(result);
                canvas.Translate(0, result.Height);
                canvas.RotateDegrees(-90);
                canvas.DrawBitmap(bitmap, 0, 0, SKSamplingOptions.Default);
                return result;
            }
            default:
                return bitmap.Copy();
        }
    }

    // Downscales to fit within maxDimension on the longer edge, preserving
    // aspect ratio — never upscales a source that's already smaller.
    private static SKBitmap ResizeToFit(SKBitmap source, int maxDimension)
    {
        if (source.Width <= maxDimension && source.Height <= maxDimension)
        {
            return source.Copy();
        }

        var scale = Math.Min((double)maxDimension / source.Width, (double)maxDimension / source.Height);
        var width = Math.Max(1, (int)Math.Round(source.Width * scale));
        var height = Math.Max(1, (int)Math.Round(source.Height * scale));

        var info = new SKImageInfo(width, height, source.ColorType, source.AlphaType);
        return source.Resize(info, SKSamplingOptions.Default)
            ?? throw new InvalidOperationException("Failed to resize the uploaded image.");
    }
}
