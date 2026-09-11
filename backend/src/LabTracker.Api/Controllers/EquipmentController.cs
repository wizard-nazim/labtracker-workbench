using LabTracker.Api.Extensions;
using LabTracker.Application.Modules.Equipment;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/equipment")]
[Authorize]
public class EquipmentController(EquipmentService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<EquipmentDto>>> GetAll([FromQuery] EquipmentFilter filter, CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(filter, cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EquipmentDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<EquipmentDto>> Create(UpsertEquipmentRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<EquipmentDto>> Update(int id, UpsertEquipmentRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, cancellationToken));

    [HttpPatch("{id:int}/status")]
    public async Task<ActionResult<EquipmentDto>> UpdateStatus(int id, UpdateEquipmentStatusRequest request, CancellationToken cancellationToken)
    {
        var updated = await service.UpdateStatusAsync(id, request.Status, User.GetUserId(), User.GetRole(), cancellationToken);
        return Ok(updated);
    }

    [HttpPost("{id:int}/science-officers")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<EquipmentDto>> AssignScienceOfficer(int id, AssignScienceOfficerRequest request, CancellationToken cancellationToken)
        => Ok(await service.AssignScienceOfficerAsync(id, request, cancellationToken));

    [HttpDelete("{id:int}/science-officers/{userId:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> RemoveScienceOfficer(int id, int userId, CancellationToken cancellationToken)
    {
        await service.RemoveScienceOfficerAsync(id, userId, cancellationToken);
        return NoContent();
    }
}
