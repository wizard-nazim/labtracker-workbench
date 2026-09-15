using System.Net.Http.Headers;
using System.Net.Http.Json;
using LabTracker.Application.Modules.Identity;
using LabTracker.Domain.Modules.Identity;
using LabTracker.Infrastructure.Persistence;
using LabTracker.Shared.Enums;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.IntegrationTests.TestSupport;

[Collection(PostgresCollection.Name)]
public abstract class IntegrationTestBase(PostgresApiFactory factory) : IAsyncLifetime
{
    protected const string DefaultPassword = "IntegrationTest123!";

    protected PostgresApiFactory Factory { get; } = factory;

    public Task InitializeAsync() => Factory.ResetDatabaseAsync();

    public Task DisposeAsync() => Task.CompletedTask;

    protected async Task<User> SeedUserAsync(string email, Role role, bool isActive = true, string password = DefaultPassword)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>();

        var user = new User { Email = email, Role = role, IsActive = isActive, CreatedAt = DateTime.UtcNow };
        user.PasswordHash = hasher.HashPassword(user, password);
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }

    protected async Task<HttpClient> CreateAuthenticatedClientAsync(string email, string password = DefaultPassword)
    {
        var client = Factory.CreateClient();
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest { Email = email, Password = password });
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<LoginResult>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result!.Token);
        return client;
    }
}
