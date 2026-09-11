using LabTracker.Application.Modules.Organization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/principal-investigators")]
[Authorize]
public class PrincipalInvestigatorsController(PrincipalInvestigatorService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<PrincipalInvestigatorDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PrincipalInvestigatorDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<PrincipalInvestigatorDto>> Create(UpsertPrincipalInvestigatorRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<PrincipalInvestigatorDto>> Update(int id, UpsertPrincipalInvestigatorRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, cancellationToken));
}
