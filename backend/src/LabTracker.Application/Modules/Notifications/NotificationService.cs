using LabTracker.Application.Common.Interfaces;
using LabTracker.Shared.Enums;
using LabTracker.Shared.Exceptions;
using Microsoft.EntityFrameworkCore;
using BookingEntity = LabTracker.Domain.Modules.Booking.Booking;
using EquipmentEntity = LabTracker.Domain.Modules.Equipment.Equipment;
using NotificationEntity = LabTracker.Domain.Modules.Notifications.Notification;

namespace LabTracker.Application.Modules.Notifications;

public class NotificationDto
{
    public int Id { get; set; }
    public NotificationType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public int? EquipmentId { get; set; }
    public int? BookingId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
}

// In-app notifications. The Broadcast/Notify methods only stage rows on the
// shared DbContext — the calling service's SaveChangesAsync persists them in
// the same transaction as the change they describe.
public class NotificationService(IApplicationDbContext db)
{
    private const int MaxListed = 50;

    // Matches the Notifications.Title column (NotificationConfiguration). Titles
    // embed an equipment name that can itself be 200 chars, so clamp rather than
    // let the insert fail and take the equipment change down with it.
    private const int TitleMaxLength = 200;

    public async Task<List<NotificationDto>> GetMineAsync(int userId, bool unreadOnly, CancellationToken cancellationToken = default)
    {
        var query = db.Notifications.Where(n => n.UserId == userId);
        if (unreadOnly) query = query.Where(n => n.ReadAt == null);

        return await query
            .OrderByDescending(n => n.CreatedAt).ThenByDescending(n => n.Id)
            .Take(MaxListed)
            .Select(n => new NotificationDto
            {
                Id = n.Id,
                Type = n.Type,
                Title = n.Title,
                Body = n.Body,
                EquipmentId = n.EquipmentId,
                BookingId = n.BookingId,
                CreatedAt = n.CreatedAt,
                ReadAt = n.ReadAt,
            })
            .ToListAsync(cancellationToken);
    }

    public async Task MarkReadAsync(int id, int userId, CancellationToken cancellationToken = default)
    {
        // Someone else's notification is reported as not found, not forbidden,
        // so ids can't be probed.
        var notification = await db.Notifications.SingleOrDefaultAsync(n => n.Id == id && n.UserId == userId, cancellationToken)
            ?? throw new NotFoundException(nameof(NotificationEntity), id);

        notification.ReadAt ??= DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkAllReadAsync(int userId, CancellationToken cancellationToken = default)
    {
        var unread = await db.Notifications.Where(n => n.UserId == userId && n.ReadAt == null).ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var n in unread) n.ReadAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    // Everyone active who hasn't opted out, except whoever made the change.
    public async Task BroadcastEquipmentChangeAsync(EquipmentEntity equipment, string title, string body, int actingUserId, CancellationToken cancellationToken = default)
    {
        var recipientIds = await db.Users
            .Where(u => u.IsActive && u.NotifyOnEquipmentChanges && u.Id != actingUserId)
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        var now = DateTime.UtcNow;
        db.Notifications.AddRange(recipientIds.Select(userId => new NotificationEntity
        {
            UserId = userId,
            Type = NotificationType.EquipmentUpdated,
            Title = ClampTitle(title),
            Body = body,
            EquipmentId = equipment.Id,
            CreatedAt = now,
        }));
    }

    // Tells whoever created the booking that it was decided. Not subject to the
    // equipment-changes opt-out: it's about their own request.
    public async Task NotifyBookingDecidedAsync(BookingEntity booking, CancellationToken cancellationToken = default)
    {
        var equipmentName = await db.Equipment.Where(e => e.Id == booking.EquipmentId).Select(e => e.Name).SingleAsync(cancellationToken);
        var approved = booking.Status == BookingStatus.Approved;

        db.Notifications.Add(new NotificationEntity
        {
            UserId = booking.CreatedByUserId,
            Type = approved ? NotificationType.BookingApproved : NotificationType.BookingRejected,
            Title = approved ? "Booking approved" : "Booking rejected",
            Body = approved
                ? $"Your booking for {equipmentName} was approved."
                : $"Your booking for {equipmentName} was rejected. Contact the equipment's Science Officer if you need another slot.",
            EquipmentId = booking.EquipmentId,
            BookingId = booking.Id,
            CreatedAt = DateTime.UtcNow,
        });
    }

    private static string ClampTitle(string title) =>
        title.Length <= TitleMaxLength ? title : title[..(TitleMaxLength - 1)] + "…";
}
