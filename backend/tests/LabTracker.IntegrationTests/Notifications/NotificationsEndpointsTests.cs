using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using LabTracker.Domain.Modules.Notifications;
using LabTracker.Infrastructure.Persistence;
using LabTracker.IntegrationTests.TestSupport;
using LabTracker.Shared.Enums;
using Microsoft.Extensions.DependencyInjection;

namespace LabTracker.IntegrationTests.Notifications;

public class NotificationsEndpointsTests(PostgresApiFactory factory) : IntegrationTestBase(factory)
{
    private async Task<int> SeedNotificationAsync(int userId, string title)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LabTrackerDbContext>();
        var notification = new Notification { UserId = userId, Type = NotificationType.EquipmentUpdated, Title = title, Body = "b", CreatedAt = DateTime.UtcNow };
        db.Notifications.Add(notification);
        await db.SaveChangesAsync();
        return notification.Id;
    }

    private static async Task<List<string>> TitlesAsync(HttpClient client, bool unreadOnly = false)
    {
        var json = await client.GetFromJsonAsync<JsonElement>($"/api/notifications?unreadOnly={unreadOnly}");
        return json.EnumerateArray().Select(n => n.GetProperty("title").GetString()!).ToList();
    }

    [Fact]
    public async Task GetMine_ReturnsOnlyTheCallersNotifications_AndMarkReadClearsUnread()
    {
        var me = await SeedUserAsync("me@labtracker.local", Role.Researcher);
        var other = await SeedUserAsync("other@labtracker.local", Role.Researcher);
        var mine = await SeedNotificationAsync(me.Id, "mine");
        var theirs = await SeedNotificationAsync(other.Id, "theirs");
        var client = await CreateAuthenticatedClientAsync(me.Email);

        (await TitlesAsync(client)).Should().Equal("mine");

        (await client.PostAsync($"/api/notifications/{theirs}/read", null)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.PostAsync($"/api/notifications/{mine}/read", null)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await TitlesAsync(client, unreadOnly: true)).Should().BeEmpty();
    }

    [Fact]
    public async Task UpdateMe_SavesPhoneAndPreference_AndRejectsInvalidPhone()
    {
        var me = await SeedUserAsync("me@labtracker.local", Role.ScienceOfficer);
        var client = await CreateAuthenticatedClientAsync(me.Email);

        var ok = await client.PutAsJsonAsync("/api/auth/me", new { phone = "+27 21 650 1234", notifyOnEquipmentChanges = false });
        ok.StatusCode.Should().Be(HttpStatusCode.OK);

        var meJson = await client.GetFromJsonAsync<JsonElement>("/api/auth/me");
        meJson.GetProperty("phone").GetString().Should().Be("+27 21 650 1234");
        meJson.GetProperty("notifyOnEquipmentChanges").GetBoolean().Should().BeFalse();

        var bad = await client.PutAsJsonAsync("/api/auth/me", new { phone = "not a number", notifyOnEquipmentChanges = true });
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
