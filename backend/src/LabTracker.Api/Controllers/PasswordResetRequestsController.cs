using LabTracker.Api.Extensions;
using LabTracker.Application.Modules.Identity;
using LabTracker.Shared.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

// Admin › Requests: "forgot password" requests waiting for a Super Admin.
[ApiController]
[Route("api/password-reset-requests")]
[Authorize(Roles = "SuperAdmin")]
public class PasswordResetRequestsController(PasswordService service) : ControllerBase
{
    // No status: everything already dealt with (the history).
    [HttpGet]
    public async Task<ActionResult<List<PasswordResetRequestDto>>> GetAll([FromQuery] PasswordResetStatus? status, CancellationToken cancellationToken)
        => Ok(await service.GetRequestsAsync(status, cancellationToken));

    [HttpGet("pending-count")]
    public async Task<ActionResult<int>> PendingCount(CancellationToken cancellationToken)
        => Ok(await service.CountPendingAsync(cancellationToken));

    [HttpPost("{id:int}/resolve")]
    public async Task<IActionResult> Resolve(int id, AssignPasswordRequest request, CancellationToken cancellationToken)
    {
        await service.ResolveAsync(id, request, User.GetUserId(), cancellationToken);
        return NoContent();
    }

    [HttpPost("{id:int}/dismiss")]
    public async Task<IActionResult> Dismiss(int id, CancellationToken cancellationToken)
    {
        await service.DismissAsync(id, User.GetUserId(), cancellationToken);
        return NoContent();
    }
}
