using LabTracker.Api.Extensions;
using LabTracker.Application.Modules.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

// Always the signed-in user's own notifications; there's no admin view.
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(NotificationService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<NotificationDto>>> GetMine([FromQuery] bool unreadOnly, CancellationToken cancellationToken)
        => Ok(await service.GetMineAsync(User.GetUserId(), unreadOnly, cancellationToken));

    [HttpPost("{id:int}/read")]
    public async Task<IActionResult> MarkRead(int id, CancellationToken cancellationToken)
    {
        await service.MarkReadAsync(id, User.GetUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead(CancellationToken cancellationToken)
    {
        await service.MarkAllReadAsync(User.GetUserId(), cancellationToken);
        return NoContent();
    }
}
