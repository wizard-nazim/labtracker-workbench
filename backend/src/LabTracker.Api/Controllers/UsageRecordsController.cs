using LabTracker.Api.Extensions;
using LabTracker.Application.Modules.Booking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/usage-records")]
[Authorize]
public class UsageRecordsController(UsageRecordService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<UsageRecordDto>>> GetAll([FromQuery] UsageRecordFilter filter, CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(filter, User.GetUserId(), User.GetRole(), cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<UsageRecordDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin,ScienceOfficer")]
    public async Task<ActionResult<UsageRecordDto>> Create(CreateUsageRecordRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, User.GetUserId(), cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }
}
