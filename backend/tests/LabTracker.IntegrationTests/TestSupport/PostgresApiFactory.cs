using LabTracker.Application.Modules.Identity;
using LabTracker.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Testcontainers.PostgreSql;

namespace LabTracker.IntegrationTests.TestSupport;

// One real Postgres container (via Testcontainers) backing the whole API, built the
// same way the app builds it in production — migrations included, so this also
// exercises Postgres-only behavior plain unit tests can't (the booking overlap
// exclusion constraint, unique/foreign-key violations, etc.). Shared across a test
// collection; ResetDatabaseAsync gives each test a clean slate without paying to spin
// up a fresh container per test.
public class PostgresApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder("postgres:16-alpine")
        .WithDatabase("labtracker_test")
        .WithUsername("labtracker_test")
        .WithPassword("labtracker_test")
        .Build();

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        // Program.cs reads builder.Configuration synchronously as its own top-level
        // statements execute (e.g. AddInfrastructure(builder.Configuration) at the
        // very top), before WebApplicationFactory.ConfigureWebHost's
        // ConfigureAppConfiguration callback gets a chance to layer overrides in for
        // a minimal-hosting Program. Environment variables are read by the default
        // configuration providers as soon as WebApplication.CreateBuilder(args) runs
        // that first read, and since the app under test executes in-process (that's
        // the whole point of WebApplicationFactory's TestServer), setting them here
        // — before the host is built by the first Services access below — reaches
        // Program.cs in time regardless of that ordering.
        Environment.SetEnvironmentVariable("ConnectionStrings__DefaultConnection", _container.GetConnectionString());
        Environment.SetEnvironmentVariable("Jwt__Issuer", "LabTracker.Tests");
        Environment.SetEnvironmentVariable("Jwt__Audience", "LabTracker.Tests.Clients");
        Environment.SetEnvironmentVariable("Jwt__SigningKey", "integration-tests-signing-key-32-characters-minimum");
        Environment.SetEnvironmentVariable("Cors__AllowedOrigins__0", "http://localhost");

        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        await db.Database.MigrateAsync();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        // Every test signs in from the same address; keep the login limiter out
        // of the way except in the tests that lower it on purpose.
        builder.UseSetting("RateLimiting:Login:PermitLimit", "100000");
        // Revocation checks read the database every time, so tests see changes at once.
        builder.UseSetting("Auth:AccountStateCacheSeconds", "0");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<IGoogleTokenValidator>();
            services.AddSingleton<IGoogleTokenValidator>(new StubGoogleTokenValidator());
        });
    }

    public async Task ResetDatabaseAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        await db.Database.ExecuteSqlRawAsync(
            """
            TRUNCATE TABLE
                "Notifications", "PasswordResetRequests", "UsageRecords", "Bookings", "UsageActors",
                "EquipmentScienceOfficers", "Equipment", "EquipmentTypes", "Rooms",
                "ExternalContacts", "ExternalOrganizations",
                "Researchers", "ResearchGroups", "PrincipalInvestigators",
                "FacilityOverseers", "Facilities", "Departments",
                "Users"
            RESTART IDENTITY CASCADE;
            """);
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await _container.DisposeAsync();
        await base.DisposeAsync();
    }
}
