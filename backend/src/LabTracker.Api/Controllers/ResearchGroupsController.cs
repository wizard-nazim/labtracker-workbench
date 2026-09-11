using LabTracker.Application.Modules.Organization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/research-groups")]
[Authorize]
public class ResearchGroupsController(ResearchGroupService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ResearchGroupDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ResearchGroupDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ResearchGroupDto>> Create(UpsertResearchGroupRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ResearchGroupDto>> Update(int id, UpsertResearchGroupRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, cancellationToken));
}
