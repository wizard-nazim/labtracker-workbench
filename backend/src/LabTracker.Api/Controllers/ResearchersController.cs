using LabTracker.Application.Modules.Organization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/researchers")]
[Authorize]
public class ResearchersController(ResearcherService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ResearcherDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ResearcherDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ResearcherDto>> Create(UpsertResearcherRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<ResearcherDto>> Update(int id, UpsertResearcherRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, cancellationToken));
}
