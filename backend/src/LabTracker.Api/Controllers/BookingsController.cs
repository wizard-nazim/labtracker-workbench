using LabTracker.Api.Extensions;
using LabTracker.Application.Modules.Booking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/bookings")]
[Authorize]
public class BookingsController(BookingService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<BookingDto>>> GetAll([FromQuery] BookingFilter filter, CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(filter, User.GetUserId(), User.GetRole(), cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BookingDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    public async Task<ActionResult<BookingDto>> Create(CreateBookingRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, User.GetUserId(), User.GetRole(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "SuperAdmin,ScienceOfficer")]
    public async Task<ActionResult<BookingDto>> Approve(int id, CancellationToken cancellationToken)
        => Ok(await service.ApproveAsync(id, User.GetUserId(), cancellationToken));

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "SuperAdmin,ScienceOfficer")]
    public async Task<ActionResult<BookingDto>> Reject(int id, CancellationToken cancellationToken)
        => Ok(await service.RejectAsync(id, User.GetUserId(), cancellationToken));

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<BookingDto>> Cancel(int id, CancellationToken cancellationToken)
        => Ok(await service.CancelAsync(id, User.GetUserId(), User.GetRole(), cancellationToken));
}
