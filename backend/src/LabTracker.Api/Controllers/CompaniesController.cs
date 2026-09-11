using LabTracker.Application.Modules.External;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LabTracker.Api.Controllers;

[ApiController]
[Route("api/companies")]
[Authorize]
public class CompaniesController(CompanyService service) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<CompanyDto>>> GetAll(CancellationToken cancellationToken)
        => Ok(await service.GetAllAsync(cancellationToken));

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CompanyDto>> GetById(int id, CancellationToken cancellationToken)
        => Ok(await service.GetByIdAsync(id, cancellationToken));

    [HttpPost]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<CompanyDto>> Create(UpsertCompanyRequest request, CancellationToken cancellationToken)
    {
        var created = await service.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<CompanyDto>> Update(int id, UpsertCompanyRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateAsync(id, request, cancellationToken));

    [HttpPost("{id:int}/contacts")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<CompanyDto>> AddContact(int id, UpsertCompanyContactRequest request, CancellationToken cancellationToken)
        => Ok(await service.AddContactAsync(id, request, cancellationToken));

    [HttpPut("{id:int}/contacts/{contactId:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<ActionResult<CompanyDto>> UpdateContact(int id, int contactId, UpsertCompanyContactRequest request, CancellationToken cancellationToken)
        => Ok(await service.UpdateContactAsync(id, contactId, request, cancellationToken));

    [HttpDelete("{id:int}/contacts/{contactId:int}")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> RemoveContact(int id, int contactId, CancellationToken cancellationToken)
    {
        await service.RemoveContactAsync(id, contactId, cancellationToken);
        return NoContent();
    }
}
