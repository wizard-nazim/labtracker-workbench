namespace LabTracker.Application.Modules.Equipment;

public class EquipmentImageDto
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public DateTime UploadedAt { get; set; }
}
