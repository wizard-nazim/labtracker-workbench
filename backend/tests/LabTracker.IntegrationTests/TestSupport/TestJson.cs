using System.Text.Json;
using System.Text.Json.Serialization;

namespace LabTracker.IntegrationTests.TestSupport;

// Matches the JsonStringEnumConverter Program.cs registers for the API's own
// responses (enums serialize as strings, e.g. "Requested" not 0) - without this,
// reading enum-bearing DTOs back with the framework's plain defaults fails.
public static class TestJson
{
    public static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };
}
