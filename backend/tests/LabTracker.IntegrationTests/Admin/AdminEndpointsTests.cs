using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using LabTracker.Api.Controllers;
using LabTracker.Api.Extensions;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;

namespace LabTracker.IntegrationTests.Admin;

public class AdminEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    // Features:DemoDataReset is only on in appsettings.Development.json; the
    // test host runs as "Testing", which stands in for any real deployment.
    [Fact]
    public async Task ResetDemoData_WhenFeatureIsOff_Returns404_AndDeletesNothing()
    {
        var admin = await SeedUserAsync("admin@labtracker.local", Role.SuperAdmin);
        await SeedUserAsync("keep.me@labtracker.local", Role.Researcher);
        var client = await CreateAuthenticatedClientAsync(admin.Email);

        var status = await client.GetFromJsonAsync<DemoDataResetStatus>("/api/admin/demo-data-reset");
        var response = await client.PostAsync("/api/admin/reset-demo-data", null);

        status!.Enabled.Should().BeFalse();
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var scope = Factory.Services.CreateScope();
        scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>().Users.Should().HaveCount(2);
    }

    [Fact]
    public async Task Health_ReportsHealthy_WithoutAuthentication()
    {
        var response = await Factory.CreateClient().GetAsync("/health");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Theory]
    [InlineData("", "ConnectionStrings:DefaultConnection is not set.")]
    [InlineData("Host=db", "Jwt:SigningKey must be at least 32 bytes.")]
    public void StartupConfiguration_RejectsMissingOrWeakSettings(string connectionString, string expected)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = connectionString,
            ["Jwt:SigningKey"] = "too-short",
            ["Jwt:Issuer"] = "LabTracker",
            ["Jwt:Audience"] = "LabTracker.Clients",
        }).Build();

        var act = () => StartupConfiguration.Validate(configuration, NullLogger.Instance);

        act.Should().Throw<InvalidOperationException>().WithMessage($"*{expected}*");
    }

    [Fact]
    public void StartupConfiguration_RejectsBootstrapPairWithShortPassword()
    {
        var act = () => StartupConfiguration.Validate(ValidConfiguration("admin@example.org", "short"), NullLogger.Instance);

        act.Should().Throw<InvalidOperationException>().WithMessage("*Bootstrap:AdminPassword must be at least 12 characters.*");
    }

    // After the first start the password is removed from config; leaving the
    // email behind must not stop the API from starting.
    [Theory]
    [InlineData("admin@example.org", "")]
    [InlineData("", "a-long-enough-password")]
    [InlineData("", "")]
    public void StartupConfiguration_AllowsHalfSetOrEmptyBootstrap(string email, string password)
    {
        var act = () => StartupConfiguration.Validate(ValidConfiguration(email, password), NullLogger.Instance);

        act.Should().NotThrow();
    }

    private static IConfiguration ValidConfiguration(string bootstrapEmail, string bootstrapPassword) =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["ConnectionStrings:DefaultConnection"] = "Host=db",
            ["Jwt:SigningKey"] = new string('k', 32),
            ["Jwt:Issuer"] = "LabTracker",
            ["Jwt:Audience"] = "LabTracker.Clients",
            ["Bootstrap:AdminEmail"] = bootstrapEmail,
            ["Bootstrap:AdminPassword"] = bootstrapPassword,
        }).Build();
}
