namespace LabTracker.IntegrationTests.TestSupport;

// One Postgres container for the whole test run instead of one per test class -
// starting a container is the expensive part, not the schema inside it.
[CollectionDefinition(Name)]
public class PostgresCollection : ICollectionFixture<PostgresApiFactory>
{
    public const string Name = "Postgres collection";
}
