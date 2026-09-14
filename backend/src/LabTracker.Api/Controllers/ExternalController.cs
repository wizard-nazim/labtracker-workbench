using LabTracker.Application.Modules.External;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/external")]
[Authorize]
public class ExternalController(ExternalOrganizationService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ExternalOrganizationDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ExternalOrganizationDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ExternalOrganizationDto>> Create(UpsertExternalOrganizationRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ExternalOrganizationDto>> Update(int id, UpsertExternalOrganizationRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, cancellationToken));

    [HttpPost("{id:int}/contacts")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ExternalOrganizationDto>> AddContact(int id, UpsertExternalContactRequest request, CancellationToken cancellationToken)
        => Ok(await service.AddContactAsync(id, request, cancellationToken));

    [HttpPut("{id:int}/contacts/{contactId:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ExternalOrganizationDto>> UpdateContact(int id, int contactId, UpsertExternalContactRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateContactAsync(id, contactId, request, cancellationToken));

    [HttpDelete("{id:int}/contacts/{contactId:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> RemoveContact(int id, int contactId, CancellationToken cancellationToken)
    {
        await service.RemoveContactAsync(id, contactId, cancellationToken);
        return NoContent();
    }
}
