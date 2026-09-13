namespace LabTracker.Application.Modules.Equipment;

// Fixed fallback-icon set offered when an admin doesn't upload an equipment
// image. Keys are curated lucide-react icon names (kebab-case) and MUST stay in
// sync with frontend/src/features/equipment/equipment-icons.ts.
public static class EquipmentIconCatalog
{
    public static readonly IReadOnlySet<string> AllowedKeys = new HashSet<string>(StringComparer.Ordinal)
    {
        "flask-conical",
        "microscope",
        "test-tube",
        "beaker",
        "thermometer",
        "syringe",
        "pipette",
        "scale",
        "atom",
        "dna",
        "activity",
        "biohazard",
        "radiation",
        "droplet",
        "droplets",
        "wind",
        "snowflake",
        "flame",
        "zap",
        "battery",
        "gauge",
        "cpu",
        "server",
        "monitor",
        "camera",
        "scan",
        "refrigerator",
        "fan",
        "wrench",
        "settings",
        "package",
        "box",
        "shield",
        "clock",
        "waves",
    };
}
