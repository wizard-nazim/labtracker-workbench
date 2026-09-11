using System.Text.Json;
using System.Text.Json.Serialization;

namespace LabTracker.Api.Serialization;

// System.Text.Json's default DateTime converter parses an offset like "+00:00"
// (as opposed to "Z") into Kind=Local, which Npgsql then rejects for timestamptz
// columns. Every DateTime in this system is UTC by convention — normalize on the
// way in, and always emit "Z" on the way out.
public class UtcDateTimeConverter : JsonConverter<DateTime>
{
    public override DateTime Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        var value = reader.GetDateTime();
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };
    }

    public override void Write(Utf8JsonWriter writer, DateTime value, JsonSerializerOptions options)
        => writer.WriteStringValue(value.ToUniversalTime());
}
